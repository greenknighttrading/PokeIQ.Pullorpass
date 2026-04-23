import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Types
export interface BuyListPick {
  id: string;
  item_id: string | null;
  name: string;
  set_name: string;
  category: 'Sealed' | 'Single' | 'Slab';
  language: string;
  image_url: string | null;
  url_reference: string | null;
  tcg_api_id: string | null;
  rank: number;
  buy_zone_type: 'threshold' | 'range';
  buy_price: number | null;
  buy_low: number | null;
  buy_high: number | null;
  allocation_pct: number;
  confidence: number;
  rationale: string[];
  commentary: string | null;
  entry_style: 'DCA' | 'Pullback' | 'Breakout' | 'Lump Sum';
  active: boolean;
}

export interface PriceSnapshot {
  id: string;
  item_id: string;
  price: number;
  recorded_at: string;
  source: string;
}

export type OpportunityStatus = 'IN_ZONE' | 'NEAR_ZONE' | 'ABOVE_ZONE';

export interface EnrichedPick extends BuyListPick {
  currentPrice: number | null;
  priceHistory: PriceSnapshot[];
  opportunityStatus: OpportunityStatus;
  discountPct: number | null;
}

interface BuyListContextValue {
  picks: EnrichedPick[];
  loading: boolean;
  hasAccess: boolean;
  isAdmin: boolean;
  userEmail: string | null;
  nearZonePct: number;
  checkingAccess: boolean;
  redeemInviteCode: (code: string) => Promise<boolean>;
  refreshPicks: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  // Admin
  addPick: (pick: Omit<BuyListPick, 'id'>) => Promise<void>;
  updatePick: (id: string, updates: Partial<BuyListPick>) => Promise<void>;
  deletePick: (id: string) => Promise<void>;
  addPriceSnapshot: (pickId: string, price: number, source?: string) => Promise<void>;
  updateSettings: (key: string, value: string) => Promise<void>;
  createInviteCode: (code: string, maxUses?: number) => Promise<void>;
  inviteCodes: Array<{ id: string; code: string; is_active: boolean; max_uses: number; use_count: number }>;
  refreshInviteCodes: () => Promise<void>;
  clearAllPicks: () => Promise<void>;
}

const BuyListContext = createContext<BuyListContextValue | null>(null);

export function useBuyList() {
  const ctx = useContext(BuyListContext);
  if (!ctx) throw new Error('useBuyList must be used within BuyListProvider');
  return ctx;
}

function getOpportunityStatus(
  pick: BuyListPick,
  price: number | null,
  nearZonePct: number
): OpportunityStatus {
  if (price === null) return 'ABOVE_ZONE';

  if (pick.buy_zone_type === 'threshold' && pick.buy_price !== null) {
    if (price <= pick.buy_price) return 'IN_ZONE';
    if (price <= pick.buy_price * (1 + nearZonePct / 100)) return 'NEAR_ZONE';
    return 'ABOVE_ZONE';
  }

  if (pick.buy_zone_type === 'range' && pick.buy_low !== null && pick.buy_high !== null) {
    if (price >= pick.buy_low && price <= pick.buy_high) return 'IN_ZONE';
    if (price <= pick.buy_high * (1 + nearZonePct / 100)) return 'NEAR_ZONE';
    return 'ABOVE_ZONE';
  }

  return 'ABOVE_ZONE';
}

function getDiscountPct(pick: BuyListPick, price: number | null): number | null {
  if (price === null) return null;
  const target = pick.buy_zone_type === 'threshold' ? pick.buy_price : pick.buy_high;
  if (!target || target === 0) return null;
  return ((target - price) / target) * 100;
}

export function BuyListProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [picks, setPicks] = useState<EnrichedPick[]>([]);
  const [nearZonePct, setNearZonePct] = useState(10);
  const [inviteCodes, setInviteCodes] = useState<Array<{ id: string; code: string; is_active: boolean; max_uses: number; use_count: number }>>([]);

  // Check auth, access, and admin status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setCheckingAccess(false);
        return;
      }

      const email = session.user.email ?? null;
      setUserEmail(email);

      const { data: settings } = await supabase
        .from('buylist_settings')
        .select('*')
        .eq('key', 'admin_email')
        .single();
      
      if (settings && email && settings.value === email) {
        setIsAdmin(true);
        setHasAccess(true);
      }

      const { data: access } = await supabase
        .from('buylist_access')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (access) setHasAccess(true);

      const { data: nzSetting } = await supabase
        .from('buylist_settings')
        .select('*')
        .eq('key', 'near_zone_pct')
        .single();
      if (nzSetting) setNearZonePct(parseInt(nzSetting.value) || 10);

      setCheckingAccess(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load picks when access granted
  const refreshPicks = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);

    const [{ data: picksData }, { data: pricesData }] = await Promise.all([
      supabase.from('buylist_picks').select('*').eq('active', true).order('rank'),
      supabase.from('buylist_price_snapshots').select('*').order('recorded_at', { ascending: false }),
    ]);

    // Build price map keyed by item_id (legacy) or pick id
    const pMap: Record<string, PriceSnapshot[]> = {};
    for (const ps of (pricesData ?? []) as unknown as PriceSnapshot[]) {
      if (!pMap[ps.item_id]) pMap[ps.item_id] = [];
      pMap[ps.item_id].push(ps);
    }

    const enriched: EnrichedPick[] = ((picksData ?? []) as unknown as BuyListPick[]).map(pick => {
      // Price snapshots are keyed by item_id (which may be the old buylist_items id or the pick id itself)
      const history = pMap[pick.item_id ?? ''] ?? pMap[pick.id] ?? [];
      const currentPrice = history.length > 0 ? Number(history[0].price) : null;
      return {
        ...pick,
        rationale: Array.isArray(pick.rationale) ? pick.rationale : [],
        currentPrice,
        priceHistory: history,
        opportunityStatus: getOpportunityStatus(pick, currentPrice, nearZonePct),
        discountPct: getDiscountPct(pick, currentPrice),
      };
    });

    setPicks(enriched);
    setLoading(false);
  }, [hasAccess, nearZonePct]);

  useEffect(() => {
    if (hasAccess) refreshPicks();
  }, [hasAccess, refreshPicks]);

  const redeemInviteCode = async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('redeem-invite', {
        body: { code },
      });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return false;
      }

      if (data?.error) {
        toast({ title: 'Invalid code', description: data.error, variant: 'destructive' });
        return false;
      }

      setHasAccess(true);
      if (!data?.alreadyHadAccess) {
        toast({ title: 'Access granted!', description: 'Welcome to the BUY List.' });
      }
      return true;
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to redeem invite code.', variant: 'destructive' });
      return false;
    }
  };

  const refreshPrices = async () => {
    toast({ title: 'Refreshing prices...', description: 'This may take a moment.' });
    for (const pick of picks) {
      if (pick.tcg_api_id) {
        try {
          const { data } = await supabase.functions.invoke('justtcg', {
            body: { action: 'getCard', cardId: pick.tcg_api_id },
          });
          const card = data?.data?.[0];
          if (card) {
            const preferredCondition = pick.category === 'Sealed' ? 'Sealed' : 'Near Mint';
            const variant = card.variants?.find((v: { condition: string }) => v.condition === preferredCondition) || card.variants?.[0];
            const snapshotKey = pick.item_id ?? pick.id;

            // Store historical price data from JustTCG if available
            if (variant?.priceHistory && Array.isArray(variant.priceHistory)) {
              const historyRows = variant.priceHistory.map((ph: { p: number; t: number }) => ({
                item_id: snapshotKey,
                price: ph.p,
                recorded_at: new Date(ph.t * 1000).toISOString(),
                source: 'justtcg',
              }));
              // Insert in batches to avoid duplicates — upsert by checking existing
              if (historyRows.length > 0) {
                await supabase.from('buylist_price_snapshots').insert(historyRows);
              }
            }

            // Also store latest price as current snapshot
            if (variant?.price) {
              await supabase.from('buylist_price_snapshots').insert({
                item_id: snapshotKey,
                price: variant.price,
                source: 'justtcg',
              });
            }

            // Update pick image from TCGPlayer if missing
            if (!pick.image_url && card.tcgplayerId) {
              const imageUrl = `https://product-images.tcgplayer.com/fit-in/437x437/${card.tcgplayerId}.jpg`;
              await supabase.from('buylist_picks').update({ image_url: imageUrl }).eq('id', pick.id);
            }
          }
        } catch (e) {
          console.error('Price refresh error for', pick.name, e);
        }
      }
    }
    await refreshPicks();
    toast({ title: 'Prices updated!', description: 'Latest prices and history from JustTCG.' });
  };

  // Admin CRUD
  const addPick = async (pick: Omit<BuyListPick, 'id'>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('buylist_picks').insert(pick as any);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshPicks();
  };

  const updatePick = async (id: string, updates: Partial<BuyListPick>) => {
    const { error } = await supabase.from('buylist_picks').update(updates as Record<string, unknown>).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshPicks();
  };

  const deletePick = async (id: string) => {
    const { error } = await supabase.from('buylist_picks').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshPicks();
  };

  const clearAllPicks = async () => {
    const { error } = await supabase.from('buylist_picks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshPicks();
  };

  const addPriceSnapshot = async (itemId: string, price: number, source = 'manual') => {
    const { error } = await supabase.from('buylist_price_snapshots').insert({ item_id: itemId, price, source });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else await refreshPicks();
  };

  const updateSettings = async (key: string, value: string) => {
    const { error } = await supabase.from('buylist_settings').update({ value }).eq('key', key);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      if (key === 'near_zone_pct') setNearZonePct(parseInt(value) || 10);
      toast({ title: 'Setting updated' });
    }
  };

  const createInviteCode = async (code: string, maxUses = 100) => {
    const { error } = await supabase.from('buylist_invites').insert({ code: code.toUpperCase(), max_uses: maxUses });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Invite created' });
      await refreshInviteCodes();
    }
  };

  const refreshInviteCodes = async () => {
    const { data } = await supabase.from('buylist_invites').select('*').order('created_at', { ascending: false });
    setInviteCodes((data ?? []) as unknown as typeof inviteCodes);
  };

  useEffect(() => {
    if (isAdmin) refreshInviteCodes();
  }, [isAdmin]);

  return (
    <BuyListContext.Provider value={{
      picks, loading, hasAccess, isAdmin, userEmail, nearZonePct, checkingAccess,
      redeemInviteCode, refreshPicks, refreshPrices,
      addPick, updatePick, deletePick, clearAllPicks,
      addPriceSnapshot, updateSettings, createInviteCode,
      inviteCodes, refreshInviteCodes,
    }}>
      {children}
    </BuyListContext.Provider>
  );
}
