import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Session } from '@supabase/supabase-js';

export interface WatchlistItem {
  id: string;
  user_id: string;
  card_id: string;
  name: string;
  set_name: string | null;
  product_type: string;
  tcgplayer_id: string | null;
  rarity: string | null;
  added_at: string;
}

export function useWatchlist() {
  const { toast } = useToast();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionRef.current?.user) { setLoading(false); return; }

    const { data } = await supabase
      .from('buylist_watchlist')
      .select('*')
      .order('added_at', { ascending: false });

    setItems((data ?? []) as unknown as WatchlistItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session;
      if (session?.user) {
        setTimeout(() => refresh(), 0);
      } else {
        setItems([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session;
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const isInWatchlist = useCallback((cardId: string) => {
    return items.some(i => i.card_id === cardId);
  }, [items]);

  const addToWatchlist = useCallback(async (card: {
    card_id: string;
    name: string;
    set_name?: string | null;
    product_type?: string;
    tcgplayer_id?: string | null;
    rarity?: string | null;
  }) => {
    const session = sessionRef.current;
    if (!session?.user) {
      toast({ title: 'Sign in required', description: 'Log in to add items to your watchlist.', variant: 'destructive' });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('buylist_watchlist').insert({
      user_id: session.user.id,
      card_id: card.card_id,
      name: card.name,
      set_name: card.set_name ?? null,
      product_type: card.product_type ?? 'card',
      tcgplayer_id: card.tcgplayer_id ?? null,
      rarity: card.rarity ?? null,
    } as any);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already in watchlist' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }

    toast({ title: '✅ Added to Watchlist', description: card.name });
    await refresh();
  }, [refresh, toast]);

  const removeFromWatchlist = useCallback(async (cardId: string) => {
    const session = sessionRef.current;
    if (!session?.user) return;

    await supabase
      .from('buylist_watchlist')
      .delete()
      .eq('user_id', session.user.id)
      .eq('card_id', cardId);

    toast({ title: 'Removed from Watchlist' });
    await refresh();
  }, [refresh, toast]);

  return { items, loading, isInWatchlist, addToWatchlist, removeFromWatchlist, refresh };
}
