import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowLeft, ImageOff, LogIn, Lock, ChevronLeft, ChevronRight, Wand2, Palette, Layers, Zap, BookOpen, Clock, ArrowRight, Heart as HeartIcon, X as XIcon, Pencil, Check, X as XClose, Mountain, Flame, Star, Crown, Eye, Target, Plus, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Seo } from '@/components/seo/Seo';
import { buildTasteProfile, AttrCount, TasteProfile } from '@/lib/tasteProfile';
import { fetchLikes, LikedCard, ERA_LABELS, PRICE_TIER_LABEL, backfillMissingTypes } from '@/lib/likesService';
import { backfillGuestSwipes } from '@/lib/pullorpassBackfill';
import { recommendForUser, RecommendedCard } from '@/lib/recommendCards';
import { useIsPremium } from '@/hooks/useIsPremium';
import { CarouselRow } from '@/components/CarouselRow';
import { CardDetailModal, CardDetailSeed } from '@/components/cards/CardDetailModal';
import tasteHeroArt from '@/assets/taste-hero-art.jpg';
import investorPortrait from '@/assets/personalities/investor.jpg';
import archivistPortrait from '@/assets/personalities/archivist.jpg';
import dreamerPortrait from '@/assets/personalities/dreamer.jpg';
import flipperPortrait from '@/assets/personalities/flipper.jpg';
import analystPortrait from '@/assets/personalities/analyst.jpg';
import hunterPortrait from '@/assets/personalities/hunter.jpg';
import explorerPortrait from '@/assets/personalities/explorer.jpg';
import curatorPortrait from '@/assets/personalities/curator.jpg';
import monkPortrait from '@/assets/personalities/monk.jpg';
import gamblerPortrait from '@/assets/personalities/gambler.jpg';
import showmanPortrait from '@/assets/personalities/showman.jpg';
import minimalistPortrait from '@/assets/personalities/minimalist.jpg';
import { cn } from '@/lib/utils';
import { PERSONALITY_INFO, PersonalityType } from '@/lib/personalityEngine';
import type { SwipeCard, SwipeRecord } from '@/lib/pullorpass';
import tcgplayerIcon from '@/assets/tcgplayer-icon.png.asset.json';
import { tcgPlayerUrl } from '@/lib/packEV';

// Map of personality type → portrait illustration (matches /personality-types).
const PERSONALITY_PORTRAITS: Record<PersonalityType, string> = {
  Investor: investorPortrait,
  Archivist: archivistPortrait,
  Dreamer: dreamerPortrait,
  Flipper: flipperPortrait,
  Analyst: analystPortrait,
  Hunter: hunterPortrait,
  Explorer: explorerPortrait,
  Curator: curatorPortrait,
  Monk: monkPortrait,
  Gambler: gamblerPortrait,
  Showman: showmanPortrait,
  Minimalist: minimalistPortrait,
};

// Grammar helper — "a" vs "an" based on first letter sound.
const articleFor = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

function possessive(name: string) {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

// Take first N sentences from a paragraph.
const firstSentences = (text: string, n = 2) => {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text;
  return parts.slice(0, n).join(' ').trim();
};

// Build the affiliate-wrapped TCGplayer URL for a card.
function tcgHref(tcgplayerId?: string | null, name?: string | null): string {
  return tcgPlayerUrl(tcgplayerId, name || '');
}

function TcgLinkIcon({ tcgplayerId, name, className }: { tcgplayerId?: string | null; name?: string | null; className?: string }) {
  return (
    <a
      href={tcgHref(tcgplayerId, name)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "absolute bottom-1.5 left-1.5 z-10 flex items-center justify-center hover:scale-105 transition-transform drop-shadow-lg",
        className
      )}
      title="View on TCGplayer"
    >
      <img src={tcgplayerIcon} alt="TCGplayer" className="h-5 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
    </a>
  );
}

type FacetKey = 'all' | 'artist' | 'set' | 'era' | 'type' | 'rarity' | 'priceTier';
const FACETS: { key: FacetKey; label: string; icon: React.ReactNode }[] = [
  { key: 'all',       label: 'All',         icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'artist',    label: 'Artist',      icon: <Palette className="w-3.5 h-3.5" /> },
  { key: 'set',       label: 'Set',         icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'era',       label: 'Era',         icon: <Layers className="w-3.5 h-3.5" /> },
  { key: 'type',      label: 'Type',        icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'rarity',    label: 'Rarity',      icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: 'priceTier', label: 'Value',       icon: <Layers className="w-3.5 h-3.5" /> },
];

type LocalSwipeRecord = Partial<SwipeRecord> & Partial<SwipeCard> & { client_ts?: string };

function localSwipeRecordsForProfile(uid: string): { likes: LikedCard[]; passes: LikedCard[]; total: number } {
  const rawRecords: LocalSwipeRecord[] = [];
  const pushRecord = (r: LocalSwipeRecord) => {
    const card = r?.card ?? r;
    const id = card?.card_id ?? r?.card_id;
    const decision = r?.decision;
    if (!id || (decision !== 'pull' && decision !== 'pass')) return;
    rawRecords.push(r);
  };

  try {
    const raw = localStorage.getItem('pop_resume_v1') || localStorage.getItem('pop_results_v1');
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed?.records)) parsed.records.forEach(pushRecord);
  } catch { /* ignore malformed local swipe state */ }

  if (rawRecords.length === 0) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('pop_today_swiped_')) continue;
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(parsed)) parsed.forEach(pushRecord);
      }
    } catch { /* ignore malformed local swipe history */ }
  }

  const seen = new Set<string>();
  const toLike = (r: LocalSwipeRecord): LikedCard | null => {
    const card = r?.card ?? r;
    const cardId = card?.card_id ?? r?.card_id;
    if (!cardId) return null;
    const decision = r?.decision;
    const key = `${decision}:${cardId}`;
    if (seen.has(key)) return null;
    seen.add(key);
    const tags = Array.isArray(r?.tags) ? r.tags : [];
    return {
      id: `local-${decision}-${cardId}`,
      user_id: uid,
      card_id: cardId,
      card_name: card?.name ?? r?.name ?? '',
      pokemon_name: null,
      artist: null,
      set_name: card?.set_name ?? r?.set_name ?? null,
      set_id: null,
      era: null,
      release_year: null,
      card_type: null,
      pokemon_type: null,
      rarity: card?.rarity ?? r?.rarity ?? null,
      language: null,
      card_number: null,
      variant: null,
      product_category: null,
      price: Number(card?.price ?? r?.price) || null,
      price_tier: null,
      image_url: card?.image_url ?? r?.image_url ?? null,
      source: tags.includes('Loved') ? 'super_like' : decision,
      liked_at: r?.client_ts ?? new Date().toISOString(),
    };
  };

  const mapped = rawRecords.map(toLike).filter(Boolean) as LikedCard[];
  return {
    likes: mapped.filter((r) => r.source !== 'pass'),
    passes: mapped.filter((r) => r.source === 'pass'),
    total: mapped.length,
  };
}

export default function Matches({
  viewedUserId,
  viewedDisplayName,
  isPublicView = false,
  isAdminView = false,
}: {
  viewedUserId?: string;
  viewedDisplayName?: string;
  isPublicView?: boolean;
  isAdminView?: boolean;
} = {}) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikedCard[]>([]);
  const [passes, setPasses] = useState<LikedCard[]>([]);
  const [cardsSwiped, setCardsSwiped] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);
  const [openSeed, setOpenSeed] = useState<CardDetailSeed | null>(null);
  const [viewerIsOwner, setViewerIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      // ── PUBLIC PROFILE VIEW ──
      // When rendering someone's public profile, skip the auth/backfill flow
      // and pull taste data through the public RPCs (gated server-side on
      // user_profiles.public_profile_enabled).
      if ((isPublicView || isAdminView) && viewedUserId) {
        const uid = viewedUserId;
        setUserId(uid);
        try {
          const { data: sess } = await supabase.auth.getSession();
          setViewerIsOwner(sess.session?.user?.id === uid);
        } catch { setViewerIsOwner(false); }

        try {
          const likesRpc = isAdminView ? 'get_admin_likes' : 'get_public_likes';
          const countRpc = isAdminView ? 'get_admin_swipe_count' : 'get_public_swipe_count';
          const passesRpc = isAdminView ? 'get_admin_recent_passes' : 'get_public_recent_passes';
          const { data: likesData } = await supabase.rpc(likesRpc as any, { p_user_id: uid });
          const liked = (likesData ?? []) as LikedCard[];
          setLikes(liked);

          const { data: countData } = await supabase.rpc(countRpc as any, { p_user_id: uid });
          setCardsSwiped(Number(countData) || 0);

          const { data: passRows } = await supabase.rpc(passesRpc as any, { p_user_id: uid });
          const mapped: LikedCard[] = (passRows ?? []).map((r: any) => ({
            id: `pass-${r.card_id}-${r.created_at}`,
            user_id: uid,
            card_id: r.card_id, card_name: r.card_name,
            pokemon_name: null, artist: null,
            set_name: r.card_set ?? null, set_id: null,
            era: null, release_year: null, card_type: null, pokemon_type: null,
            rarity: r.card_rarity ?? null, language: null, card_number: null,
            variant: null, product_category: null,
            price: Number(r.card_price) || null,
            price_tier: null, image_url: r.card_image ?? null,
            source: 'pass', liked_at: r.created_at,
          }));
          setPasses(mapped);

          if (liked.length > 0) {
            try {
              const recs = await recommendForUser(liked, 12);
              setRecommendations(recs);
            } catch (e) { console.warn('recommend failed', e); }
          }
        } catch (e) {
          console.warn('public profile fetch failed', e);
        }
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || session.user.is_anonymous) { setLoading(false); return; }
      const uid = session.user.id;
      setUserId(uid);
      setViewerIsOwner(true);

      // Brand-new users may have swiped before signing up. Migrate those
      // guest swipes into the account so Matches/Smart Profile reflect them.
      try { await backfillGuestSwipes(uid); } catch (e) { console.warn('backfill failed', e); }

      const localProfile = localSwipeRecordsForProfile(uid);
      const mergeLocal = (serverLikes: LikedCard[], serverPasses: LikedCard[] = []) => {
        const likeIds = new Set(localProfile.likes.map((l) => l.card_id));
        const passIds = new Set(localProfile.passes.map((l) => l.card_id));
        return {
          likes: [...localProfile.likes, ...serverLikes.filter((l) => !likeIds.has(l.card_id))],
          passes: [...localProfile.passes, ...serverPasses.filter((l) => !passIds.has(l.card_id))],
        };
      };
      if (localProfile.total > 0) {
        setLikes(localProfile.likes);
        setPasses(localProfile.passes);
        setCardsSwiped(localProfile.total);
        setLoading(false);
      }

      // ── Stale-while-revalidate cache (sessionStorage) ──
      const cacheKey = `matches:v1:${uid}`;
      let cached: {
        likes: LikedCard[];
        passes: LikedCard[];
        recommendations: RecommendedCard[];
        likedCount: number;
        latestLikedAt: string | null;
      } | null = null;
      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw);
      } catch {}
      if (cached) {
        const merged = mergeLocal(cached.likes, cached.passes);
        setLikes(merged.likes);
        setPasses(merged.passes);
        setRecommendations(cached.recommendations);
        setLoading(false);
      }

      const liked = await fetchLikes(uid);
      const mergedInitial = mergeLocal(liked, cached?.passes ?? []);
      const effectiveLikes = mergedInitial.likes;
      const latestLikedAt = effectiveLikes.reduce<string | null>(
        (m, l) => (l.liked_at && (!m || l.liked_at > m) ? l.liked_at : m),
        null,
      );
      const unchanged =
        cached &&
        cached.likedCount === effectiveLikes.length &&
        cached.latestLikedAt === latestLikedAt;

      setLikes(effectiveLikes);
      // Total swipes for this user (likes + passes + supers across all time)
      try {
        const { count } = await supabase
          .from('pullorpass_swipes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid);
        // Fall back to local + DNA totals so guest-era swipes (or any race
        // with the backfill) still show a non-zero count instead of "0".
        let localTotal = 0;
        try {
          const ids = new Set<string>();
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('pop_today_swiped_')) continue;
            const arr = JSON.parse(localStorage.getItem(k) || '[]');
            if (Array.isArray(arr)) arr.forEach((s: any) => s?.card_id && ids.add(s.card_id));
          }
          try {
            const raw = localStorage.getItem('pop_results_v1');
            if (raw) {
              const v = JSON.parse(raw);
              if (Array.isArray(v?.records)) v.records.forEach((r: any) => r?.card?.card_id && ids.add(r.card.card_id));
            }
          } catch {}
          try {
            const raw = localStorage.getItem('pop_resume_v1');
            if (raw) {
              const v = JSON.parse(raw);
              if (Array.isArray(v?.records)) v.records.forEach((r: any) => r?.card?.card_id && ids.add(r.card.card_id));
            }
          } catch {}
          localTotal = ids.size;
        } catch {}
        let dnaTotal = 0;
        try {
          const { data: dna } = await supabase
            .from('pullorpass_dna')
            .select('pull_count, pass_count')
            .eq('user_id', uid)
            .maybeSingle();
          if (dna) dnaTotal = (dna.pull_count ?? 0) + (dna.pass_count ?? 0);
        } catch {}
        setCardsSwiped(Math.max(count ?? 0, localTotal, localProfile.total, dnaTotal));
      } catch (e) { console.warn('count swipes failed', e); }
      // Fetch recent passes from pullorpass_swipes
      let mapped: LikedCard[] = cached?.passes ?? [];
      try {
        const { data: passRows } = await supabase
          .from('pullorpass_swipes')
          .select('card_id, card_name, card_set, card_image, card_price, card_rarity, created_at')
          .eq('user_id', uid)
          .eq('decision', 'pass')
          .order('created_at', { ascending: false })
          .limit(40);
        mapped = (passRows ?? []).map((r: any) => ({
          id: `pass-${r.card_id}-${r.created_at}`,
          user_id: uid,
          card_id: r.card_id,
          card_name: r.card_name,
          pokemon_name: null,
          artist: null,
          set_name: r.card_set ?? null,
          set_id: null,
          era: null,
          release_year: null,
          card_type: null,
          pokemon_type: null,
          rarity: r.card_rarity ?? null,
          language: null,
          card_number: null,
          variant: null,
          product_category: null,
          price: Number(r.card_price) || null,
          price_tier: null,
          image_url: r.card_image ?? null,
          source: 'pass',
          liked_at: r.created_at,
        }));
        const merged = mergeLocal(liked, mapped);
        mapped = merged.passes;
        setLikes(merged.likes);
        setPasses(mapped);
      } catch (e) { console.warn('fetch passes failed', e); }
      let recs: RecommendedCard[] = cached?.recommendations ?? [];
      if (effectiveLikes.length > 0 && !unchanged) {
        try {
          recs = await recommendForUser(effectiveLikes, 12);
          setRecommendations(recs);
        } catch (e) { console.warn('recommend failed', e); }
      }
      setLoading(false);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          likes: effectiveLikes,
          passes: mapped,
          recommendations: recs,
          likedCount: effectiveLikes.length,
          latestLikedAt,
        }));
      } catch {}

      // Background backfill — populate pokemon_type/artist for older likes
      // that were saved before cards_ppt had data. Refreshes the UI when done.
      if (effectiveLikes.length > 0) {
        backfillMissingTypes(uid, effectiveLikes.filter((l) => !l.id.startsWith('local-')), { max: 60 })
          .then(updated => {
            if (updated.length) setLikes(mergeLocal(updated, mapped).likes);
          })
          .catch(e => console.warn('backfillMissingTypes failed', e));
      }
    })();
  }, [isPublicView, viewedUserId]);

  const taste = useMemo(() => buildTasteProfile(likes), [likes]);

  return (
    <>
      <Seo title={isPublicView ? `${viewedDisplayName || 'Collector'}'s Collector DNA | PokeIQ` : 'Your Collector DNA | PokeIQ'} description={isPublicView ? `${viewedDisplayName || 'Collector'}'s public Pokémon collector identity.` : 'Your personal Pokémon collector identity — built from every card you\'ve liked.'} />
      <div className="min-h-screen bg-background flex flex-col gap-0">
        <main className="flex-1 w-full mx-auto px-5 sm:px-8 py-8 sm:py-10" style={{ maxWidth: '1380px' }}>
          {!isPublicView && (
            <Link to="/swipe" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to swiping
            </Link>
          )}

          {loading && <Card className="p-10 text-center text-muted-foreground text-sm">Loading your collection…</Card>}

          {!loading && !userId && (
            <Card className="p-10 text-center space-y-4 border-primary/30 bg-primary/5 max-w-xl mx-auto mt-12">
              <Lock className="w-10 h-10 mx-auto text-primary" />
              <h3 className="text-2xl font-bold text-foreground">Sign up to see your Collector DNA</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your DNA profile is saved to your Collector account. Create one free to start building yours.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> Sign up free
              </Button>
            </Card>
          )}

          {!loading && userId && (
            <div className="space-y-8 sm:space-y-10">
              <TasteHero
                taste={taste}
                cardsSwiped={cardsSwiped}
                isPublicView={isPublicView}
                viewedDisplayName={viewedDisplayName}
              />
              {(likes.length > 0 || passes.length > 0) && (
                <RecentlyLiked likes={likes} passes={passes} onOpen={setOpenSeed} isPublicView={isPublicView} viewedDisplayName={viewedDisplayName} userId={userId} />
              )}
              {userId && <ThisOrThatRankings userId={userId} onOpen={setOpenSeed} />}
              {!isPublicView && <SwipeAgainOrLimit />}
              {!isPublicView && <ThisOrThatCTA />}
              {recommendations.length > 0 && <RecommendedRow items={recommendations} onOpen={setOpenSeed} />}
              <BinderView likes={likes} taste={taste} onOpen={setOpenSeed} userId={userId} isPublicView={isPublicView} viewedDisplayName={viewedDisplayName} />
              <DeepTasteInsights taste={taste} isPublicView={isPublicView} viewedDisplayName={viewedDisplayName} />
              {!isPublicView && <DailyLimitWidget />}
              {isPublicView && !viewerIsOwner && <BuildYourOwnProfileCTA />}
            </div>
          )}
        </main>
        <CardDetailModal open={!!openSeed} seed={openSeed} onClose={() => setOpenSeed(null)} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 1 — DNA Profile Hero
// ─────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  seedling: 'Seedling', sprouting: 'Sprouting', established: 'Established', expert: 'Expert',
};

// ─────────────────────────────────────────────────────────────
// Editable username card — stores in auth user_metadata.display_name
// ─────────────────────────────────────────────────────────────
function UsernameInline() {
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // (UsernameStatic + BuildYourOwnProfileCTA defined at bottom of file)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const display = (user.user_metadata as { display_name?: string } | null)?.display_name
        || (user.email ? user.email.split('@')[0] : '')
        || 'Collector';
      setName(display);
      setDraft(display);
    })();
  }, []);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { toast({ title: 'Username required', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmed } });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    setName(trimmed);
    setEditing(false);
    toast({ title: 'Username updated' });
  };

  const initial = (name || 'C').charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center text-base font-bold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={32}
              placeholder="Choose a username"
              className="h-9 max-w-xs"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(name); } }}
            />
            <Button size="icon" variant="ghost" onClick={save} disabled={saving} className="h-9 w-9">
              <Check className="w-4 h-4 text-success" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setDraft(name); }} className="h-9 w-9">
              <XClose className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-foreground truncate">{name}</span>
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/40 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {email && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Personality test CTA — sits at the bottom of the Smart Profile.
// Collector DNA = WHAT they collect; Personality Test = HOW they collect.
// ─────────────────────────────────────────────────────────────
function PersonalityTestCTA({ personalityType, name }: { personalityType: string | null; name?: string }) {
  if (personalityType) {
    const info = PERSONALITY_INFO[personalityType as PersonalityType];
    const article = articleFor(personalityType);
    const portrait = PERSONALITY_PORTRAITS[personalityType as PersonalityType];
    return (
      <div>
        {/* Personality — left aligned, portrait + content stacked */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/25 via-primary/10 to-card p-5 sm:p-6 md:p-8 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]">
          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6 text-center sm:text-left">
            {portrait ? (
              <div className="relative w-28 h-28 sm:w-auto sm:h-auto sm:self-stretch sm:aspect-square rounded-2xl overflow-hidden bg-card shrink-0 border border-border/60 px-[100px] mx-0 py-[99px]">
                <img
                  src={portrait}
                  alt={`Illustration of ${article} ${personalityType}`}
                  width={512}
                  height={512}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-top px-0 py-0 my-0 rounded-none object-cover"
                />
              </div>
            ) : info ? (
              <div className="w-28 h-28 sm:w-auto sm:h-auto sm:self-stretch sm:aspect-square rounded-2xl bg-card flex items-center justify-center text-5xl shrink-0 border border-border/60">
                <span aria-hidden>{info.emoji}</span>
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-primary font-bold mb-2">
                Collector Personality
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
                {name || 'You'} {name ? 'is' : 'are'} {article}{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary to-primary/60">
                  {personalityType}
                </span>
              </h2>
              {info?.summary && (
                <p className="mt-2 sm:mt-3 text-sm text-foreground/80 leading-relaxed mx-0 my-0 px-0 py-0 sm:text-xl">
                  {info.summary}
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-5 mt-4 sm:mt-5">
                <Button asChild size="lg" className="gap-2 w-full sm:w-auto sm:h-12 sm:px-7 sm:text-base font-semibold">
                  <Link to="/personality-types">
                    Explore your type <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Link>
                </Button>
                <Link
                  to="/test"
                  className="text-sm sm:text-base font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                >
                  Retake the test
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Placeholder shown BEFORE the user has taken the personality test.
  // Mirrors the post-test layout (portrait + content) so the transition feels seamless.
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/25 via-primary/10 to-card p-5 sm:p-6 md:p-8 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]">
        <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-6 text-center sm:text-left">
          <div className="relative w-56 h-56 sm:w-72 sm:h-auto sm:self-stretch sm:aspect-square rounded-2xl overflow-hidden bg-card shrink-0 border border-border/60 my-[5px]">
            <img
              src={explorerPortrait}
              alt="Unknown collector personality"
              width={512}
              height={512}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-top px-0 py-0 my-0 rounded-none grayscale"
            />
            <div className="absolute inset-0 bg-background/55" aria-hidden />
            <div className="absolute inset-0 mx-0 py-0 px-0 flex-row flex items-center justify-center my-0" aria-hidden>
              <HelpCircle className="w-16 h-16 sm:w-20 sm:h-20 text-primary drop-shadow-[0_4px_18px_hsl(var(--primary)/0.7)]" strokeWidth={2.25} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-primary font-bold mb-2">
              Collector Personality
            </p>
            <h2 className="text-left text-3xl sm:text-4xl font-bold tracking-tight leading-[1.05] mb-3">
              Discover your{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary to-primary/60">
                Collector Archetype
              </span>
            </h2>
            <p className="text-left mt-2 sm:mt-3 text-sm sm:text-base text-foreground/80 leading-relaxed">
              Every collector is different. Some chase rarity. Some chase art. Some chase the thrill of the hunt. The choices you make reveal a unique collecting personality that influences how you buy, sell, and build your collection. Take the collector archetype test to understand your strengths and weaknesses, and learn what truly drives your decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-5 mt-4 sm:mt-5">
              <Button asChild size="lg" className="gap-2 w-full sm:w-auto sm:h-12 sm:px-7 sm:text-base font-semibold">
                <Link to="/test">
                  Take the Test <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildIdentitySentence(t: TasteProfile, subject = 'You'): string {
  const isYou = subject === 'You';
  const poss = isYou ? 'Your' : possessive(subject);
  const verb = isYou ? 'gravitate' : 'gravitates';
  if (t.totalLikes === 0) return `${isYou ? 'Start swiping to reveal your' : `${poss} collector identity is waiting. Start swiping to reveal their`} collector identity.`;
  if (t.totalLikes < 8) return `${poss} DNA is forming — keep swiping to sharpen ${isYou ? 'your' : 'their'} collector identity.`;
  const era = t.topEras[0];
  const rarity = t.topRarities[0];
  const artist = t.topArtists[0];
  const tier = t.priceDistribution.find((p) => p.key !== 'unknown');
  const pokemon = t.topPokemon[0];
  const bits: string[] = [];
  if (era && era.pct >= 25) bits.push(`${era.label.split(' (')[0].toLowerCase()} cards`);
  if (rarity && rarity.pct >= 25) bits.push(rarity.label.toLowerCase());
  if (pokemon && pokemon.count >= 3) bits.push(`${pokemon.label}-heavy picks`);
  if (artist && artist.count >= 3) bits.push(`art by ${artist.label}`);
  if (tier && tier.pct >= 30 && tier.key !== 'budget') bits.push(tier.label.toLowerCase());
  if (bits.length === 0) return `${poss} DNA is eclectic — drawn to a wide range of cards and eras.`;
  const head = bits.slice(0, -1).join(', ');
  const tail = bits[bits.length - 1];
  const phrase = bits.length === 1 ? tail : `${head}, and ${tail}`;
  return `${subject} ${verb} toward ${phrase}.`;
}

function buildSignals(t: TasteProfile): { label: string; sub?: string }[] {
  const out: { label: string; sub?: string }[] = [];
  const seen = new Set<string>();
  const push = (label: string, sub?: string) => {
    const k = label.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ label, sub });
  };
  if (t.topEras[0]) push(t.topEras[0].label.split(' (')[0], `${t.topEras[0].pct}% of likes`);
  if (t.topRarities[0]) push(t.topRarities[0].label, `${t.topRarities[0].count} cards`);
  if (t.topPokemon[0] && t.topPokemon[0].count >= 2) push(`${t.topPokemon[0].label}-heavy`, `${t.topPokemon[0].count} cards`);
  if (t.topArtists[0] && t.topArtists[0].count >= 2) push(`Art by ${t.topArtists[0].label}`, `${t.topArtists[0].count} cards`);
  const tier = t.priceDistribution.find((p) => p.key !== 'unknown');
  if (tier && tier.pct >= 20) push(tier.label, `${tier.pct}%`);
  if (t.topPokemonTypes[0] && t.topPokemonTypes[0].pct >= 20) push(`${t.topPokemonTypes[0].label} type`, `${t.topPokemonTypes[0].pct}%`);
  if (t.languageMix.find((l) => l.key === 'Japanese' && l.pct >= 20)) push('Japanese cards');
  return out.slice(0, 5);
}

function TasteHero({
  taste, cardsSwiped, isPublicView = false, viewedDisplayName,
}: {
  taste: TasteProfile;
  cardsSwiped: number;
  isPublicView?: boolean;
  viewedDisplayName?: string;
}) {
  const subject = isPublicView ? (viewedDisplayName || 'Collector') : 'You';
  const sentence = buildIdentitySentence(taste, subject);
  const signals = buildSignals(taste);
  const { totalLikes, stage, nextThreshold, avgPrice } = taste;

  // Personality test result (localStorage). Read once on mount + when storage changes.
  const [personalityType, setPersonalityType] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const { readPersonalityForCurrentUser } = await import('@/lib/personalityStorage');
        const parsed: any = await readPersonalityForCurrentUser();
        if (cancelled) return;
        setPersonalityType(parsed?.type ?? null);
      } catch {
        if (!cancelled) setPersonalityType(null);
      }
    };
    read();
    const onStorage = () => { read(); };
    window.addEventListener('storage', onStorage);
    return () => { cancelled = true; window.removeEventListener('storage', onStorage); };
  }, []);

  const topEra = taste.topEras[0];
  const topType = taste.topPokemonTypes[0];
  const topRarity = taste.topRarities[0];
  const topArtist = taste.topArtists[0];

  const personalityInfo = personalityType ? PERSONALITY_INFO[personalityType as PersonalityType] : null;

  // DNA Match Rate = % of swipes that became likes (collector decisiveness)
  const matchRate = cardsSwiped > 0
    ? Math.round((totalLikes / cardsSwiped) * 100)
    : 0;

  // Split headline so the last word can render in the brand gradient
  const headlineParts = isPublicView
    ? [possessive(viewedDisplayName || 'Collector'), 'Collector', 'DNA']
    : ['Your', 'Collector', 'DNA'];
  const headlineHead = headlineParts.slice(0, -1).join(' ');
  const headlineTail = headlineParts[headlineParts.length - 1];

  // Pills for "What You Gravitate Toward"
  const gravPills: { label: string; icon: React.ReactNode; tint: string }[] = [];
  const tier = taste.priceDistribution.find((p) => p.key !== 'unknown');
  if (tier && (tier.key === 'grail' || tier.key === 'premium')) {
    gravPills.push({ label: tier.key === 'grail' ? 'Grails' : 'Premium', icon: <Crown className="w-3.5 h-3.5 text-amber-400" />, tint: 'border-amber-400/30 bg-amber-400/5' });
  }
  if (topEra) gravPills.push({ label: `${topEra.label.split(' (')[0]} Era`, icon: <Mountain className="w-3.5 h-3.5 text-primary" />, tint: 'border-primary/30 bg-primary/5' });
  if (topType) gravPills.push({ label: `${topType.label} Types`, icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, tint: 'border-orange-400/30 bg-orange-400/5' });
  if (topRarity) gravPills.push({ label: topRarity.label, icon: <Star className="w-3.5 h-3.5 text-purple-400" />, tint: 'border-purple-400/30 bg-purple-400/5' });
  if (gravPills.length === 0 && topArtist) {
    gravPills.push({ label: topArtist.label, icon: <Palette className="w-3.5 h-3.5 text-primary" />, tint: 'border-primary/30 bg-primary/5' });
  }

  return (
    <section className="relative space-y-6">
      {/* One unified hero widget — username, headline, and taste signals
          all sit on top of the background art so more of it shows through. */}
      <div className="relative overflow-hidden border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card rounded-3xl shadow-none">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        </div>

        {/* Art composition: forest base, readability fades, then a masked
            foreground Pikachu pass so the focal point stays above the haze. */}
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={tasteHeroArt}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            loading="lazy"
            className="absolute inset-0 z-0 w-full h-full object-cover"
            style={{
              objectPosition: '5% 88%',
              filter: 'brightness(1.02) contrast(1.05) saturate(1.06)',
            }}
          />
          {/* Left-side readability fade keeps headline crisp */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-card via-card/80 md:via-card/55 to-transparent" />
          {/* Bottom fade so the stat cards sit on a clean surface */}
          <div className="absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-card via-card/85 to-transparent" />
          {/* Subtle warm rim-light around the upper-right clearing for atmosphere */}
          <div className="absolute top-[6%] right-[10%] z-[2] w-[26%] h-[34%] rounded-full bg-warning/10 blur-3xl mix-blend-screen" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 md:p-10 space-y-6 min-h-[360px] md:min-h-[400px] flex flex-col gap-0 px-[32px] py-[10px] mx-0">
          {/* Username sits inside the widget now */}
          <div className="md:max-w-[62%]">
            {isPublicView
              ? <UsernameStatic name={viewedDisplayName || 'Collector'} />
              : <UsernameInline />}
          </div>

          <div className="md:max-w-[62%]">
            {personalityType && (
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="text-amber-400 w-[22px] h-[19px]" />
                <span className="font-bold uppercase tracking-[0.2em] text-amber-400 text-base">
                  {personalityType}
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.05]">
              {headlineHead}{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-primary via-primary to-primary/60">
                {headlineTail}
              </span>
            </h1>
            <p className="mt-5 text-base text-foreground/80 leading-relaxed max-w-xl sm:text-xl font-semibold">
              {personalityInfo?.tagline ? `${personalityInfo.tagline} ` : ''}Which helps you collect  SMARTER not Harder.
            </p>

            {totalLikes === 0 && (
              <div className="mt-6">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/swipe">Start swiping</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Collector Stats — moved into the hero widget in place of the
              taste-signal pills. Translucent surfaces so the art still
              breathes through. */}
          <div className="mt-auto pt-10 md:pt-16 px-0 py-[4px]">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-primary rotate-[-45deg]" />
              <h2 className="text-sm font-semibold text-foreground">Collector Stats</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <HeroStat
                icon={<BookOpen className="w-6 h-6 text-primary" />}
                tint="bg-primary/15 border-primary/30"
                value={avgPrice > 0 ? `$${avgPrice.toFixed(0)}` : '—'}
                label="Avg Card Value"
              />
              <HeroStat
                icon={<HeartIcon className="w-6 h-6 text-red-400" />}
                tint="bg-red-400/15 border-red-400/30"
                value={totalLikes.toLocaleString()}
                label="Collection Likes"
              />
              <HeroStat
                icon={<Eye className="w-6 h-6 text-blue-400" />}
                tint="bg-blue-400/15 border-blue-400/30"
                value={cardsSwiped.toLocaleString()}
                label="Cards Swiped"
              />
              <HeroStat
                icon={<Target className="w-6 h-6 text-purple-400" />}
                tint="bg-purple-400/15 border-purple-400/30"
                value={cardsSwiped > 0 ? `${matchRate}%` : '—'}
                label="Pull Rate"
                info={`Out of every 100 cards you swipe, you Pull about ${matchRate}. It's simply Pulls ÷ total swipes. A low % means you're picky; a high % means you Pull broadly.`}
              />
            </div>

            {/* View Full DNA — plain text link inside the hero widget, below the signal cards */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => document.getElementById('deep-insights')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline underline-offset-4 text-lg px-0 py-[11px] mx-px"
              >
                View taste insights <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Personality result — sits directly under the Collector DNA widget */}
      <PersonalityTestCTA personalityType={personalityType} name={isPublicView ? (viewedDisplayName || 'Collector') : undefined} />
    </section>
  );
}

function SignalCard({ kicker, value, sub, icon, tint }: { kicker: string; value: string; sub: string; icon: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-5 flex items-center gap-4">
      <div className={cn('w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0', tint)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">{kicker}</p>
        <p className="text-xl font-bold text-foreground leading-tight truncate">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

function CollectorStat({ icon, tint, value, label }: { icon: React.ReactNode; tint: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-11 h-11 rounded-full flex items-center justify-center shrink-0', tint)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground tabular-nums leading-tight truncate">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

function HeroStat({ icon, tint, value, label, info }: { icon: React.ReactNode; tint: string; value: string; label: string; info?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-3 sm:p-4 xl:p-5 flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-3.5 min-w-0 min-h-[76px]">
      <div className={cn('w-10 h-10 xl:w-[52px] xl:h-[52px] rounded-xl border flex items-center justify-center shrink-0', tint)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 w-full">
        <p
          className="font-bold text-foreground tabular-nums leading-tight whitespace-nowrap"
          style={{ fontSize: 'clamp(1.1rem, 3.2vw, 1.5rem)', wordBreak: 'keep-all' }}
        >
          {value}
        </p>
        <p className="text-[11px] sm:text-[12px] xl:text-[13px] text-muted-foreground leading-tight break-words hyphens-auto flex items-center gap-1">
          <span>{label}</span>
          {info && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`What is ${label}?`}
                    className="inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs leading-snug">
                  {info}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 2 — Recently Liked
// ─────────────────────────────────────────────────────────────

function RecentlyLiked({ likes, passes, onOpen, isPublicView, viewedDisplayName, userId }: { likes: LikedCard[]; passes: LikedCard[]; onOpen: (s: CardDetailSeed) => void; isPublicView?: boolean; viewedDisplayName?: string; userId?: string | null }) {
  // For the authed personal view, lock the carousel to the user's most recent
  // completed round so it stays persistent across navigations. Cached locally
  // and only refreshed when a newer round_id appears in the DB.
  const [roundLikes, setRoundLikes] = useState<LikedCard[] | null>(null);
  useEffect(() => {
    if (isPublicView || !userId) { setRoundLikes(null); return; }
    const cacheKey = `matches:last_round:${userId}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const v = JSON.parse(raw);
        if (Array.isArray(v?.likes)) setRoundLikes(v.likes as LikedCard[]);
      }
    } catch {}
    let cancelled = false;
    (async () => {
      const { data: latest } = await supabase
        .from('pullorpass_swipes')
        .select('round_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      const roundId = latest?.[0]?.round_id;
      if (!roundId || cancelled) return;
      const { data: rows } = await supabase
        .from('pullorpass_swipes')
        .select('card_id, card_name, card_set, card_image, card_price, card_rarity, tags, decision, created_at')
        .eq('user_id', userId)
        .eq('round_id', roundId)
        .eq('decision', 'pull')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const mapped: LikedCard[] = (rows ?? []).map((r: any) => ({
        id: `round-${roundId}-${r.card_id}`,
        user_id: userId,
        card_id: r.card_id,
        card_name: r.card_name ?? '',
        pokemon_name: null, artist: null,
        set_name: r.card_set ?? null, set_id: null,
        era: null, release_year: null, card_type: null, pokemon_type: null,
        rarity: r.card_rarity ?? null, language: null, card_number: null,
        variant: null, product_category: null,
        price: r.card_price != null ? Number(r.card_price) : null,
        price_tier: null, image_url: r.card_image ?? null,
        source: Array.isArray(r.tags) && r.tags.includes('Loved') ? 'super_like' : 'pull',
        liked_at: r.created_at,
      }));
      setRoundLikes(mapped);
      try { localStorage.setItem(cacheKey, JSON.stringify({ roundId, likes: mapped })); } catch {}
    })();
    return () => { cancelled = true; };
  }, [userId, isPublicView]);

  const source = useMemo(() => (!isPublicView && roundLikes && roundLikes.length > 0) ? roundLikes : likes, [isPublicView, roundLikes, likes]);

  // Fetch TCGplayer IDs for the cards shown so we can link out with affiliate tracking.
  const [tcgMeta, setTcgMeta] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    const ids = source.map((c) => c.card_id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('market_snapshots')
        .select('card_id, tcgplayer_id')
        .in('card_id', ids)
        .limit(ids.length);
      if (cancelled) return;
      const map = new Map<string, string>();
      (data ?? []).forEach((m: any) => {
        if (m.card_id && m.tcgplayer_id) map.set(m.card_id, m.tcgplayer_id as string);
      });
      setTcgMeta(map);
    })();
    return () => { cancelled = true; };
  }, [source]);

  // Pulls only — super likes first, then regular pulls, newest first within each group.
  const sorted = useMemo(() => {
    return [...source].sort((a, b) => {
      const aSuper = a.source === 'super_like' ? 1 : 0;
      const bSuper = b.source === 'super_like' ? 1 : 0;
      if (aSuper !== bSuper) return bSuper - aSuper;
      return (b.liked_at || '').localeCompare(a.liked_at || '');
    });
  }, [source]);
  const recent = sorted.slice(0, 24);
  const subject = isPublicView ? (viewedDisplayName || 'Collector') : 'you';
  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{isPublicView ? 'Latest matches' : 'Your latest round'}</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {isPublicView
            ? `Every card ${subject} pulled — super likes first.`
            : 'Cards you pulled in your most recent round — super likes first.'}
        </p>
      </div>
      <CarouselRow ariaLabel="latest matches">
        {recent.map((c) => (
          <RecentCard
            key={`pull-${c.id}`}
            like={c}
            decision="pull"
            isSuper={c.source === 'super_like'}
            onOpen={onOpen}
            tcgplayerId={tcgMeta.get(c.card_id)}
          />
        ))}
      </CarouselRow>
    </section>
  );
}

function RecentCard({ like, decision, isSuper, onOpen, tcgplayerId }: { like: LikedCard; decision: 'pull' | 'pass'; isSuper?: boolean; onOpen: (s: CardDetailSeed) => void; tcgplayerId?: string }) {
  const [err, setErr] = useState(false);
  const isPass = decision === 'pass';
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onClick={() => onOpen({
        card_id: like.card_id, card_name: like.card_name, set_name: like.set_name,
        image_url: like.image_url, price: like.price, rarity: like.rarity,
        artist: like.artist, pokemon_type: like.pokemon_type, card_number: like.card_number,
      })}
      className="group shrink-0 w-[170px] sm:w-[190px] snap-start text-left cursor-pointer"
    >
      <div className={cn(
        "relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 shadow-md transition-all duration-300",
        isPass
          ? "ring-border/40 group-hover:ring-destructive/40"
          : "ring-border/60 group-hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.55)] group-hover:ring-primary/50"
      )}>
        {like.image_url && !err ? (
          <img src={like.image_url} alt={like.card_name} loading="lazy" decoding="async" className={cn("w-full h-full object-cover", isPass && "opacity-60 grayscale")} onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        <div className={cn(
          "absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider backdrop-blur",
          isPass
            ? "bg-destructive/80 text-destructive-foreground"
            : isSuper
              ? "bg-amber-400/90 text-background"
              : "bg-primary/80 text-primary-foreground"
        )}>
          {isPass
            ? <><XIcon className="w-2.5 h-2.5" /> Pass</>
            : isSuper
              ? <><Sparkles className="w-2.5 h-2.5" /> Super</>
              : <><HeartIcon className="w-2.5 h-2.5" /> Pull</>}
        </div>
        <TcgLinkIcon tcgplayerId={tcgplayerId} name={like.card_name} />
      </div>
      <p className="mt-2.5 text-sm text-foreground font-medium truncate">{like.card_name}</p>
      <p className="text-xs text-muted-foreground truncate">
        {like.set_name ?? '—'}{like.price ? ` · $${Number(like.price).toFixed(0)}` : ''}
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 3 — Your Binder
// ─────────────────────────────────────────────────────────────

const CARDS_PER_PAGE = 9;
const CARDS_PER_SPREAD = CARDS_PER_PAGE * 2;

function BinderView({ likes, taste, onOpen, userId, isPublicView, viewedDisplayName }: { likes: LikedCard[]; taste: TasteProfile; onOpen: (s: CardDetailSeed) => void; userId: string; isPublicView?: boolean; viewedDisplayName?: string }) {
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [facet, setFacet] = useState<FacetKey>('all');
  const [value, setValue] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Persisted custom order (card_id list). When null, falls back to liked_at desc.
  const orderKey = `binder:order:${userId}`;
  const [customOrder, setCustomOrder] = useState<string[] | null>(() => {
    try {
      const raw = localStorage.getItem(orderKey);
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch { return null; }
  });

  React.useEffect(() => { setSpread(0); setDir(1); }, [facet, value]);

  const facetOptions: AttrCount[] = useMemo(() => {
    switch (facet) {
      case 'artist':    return taste.topArtists;
      case 'set':       return taste.topSets;
      case 'era':       return taste.topEras;
      case 'type':      return taste.topPokemonTypes;
      case 'rarity':    return taste.topRarities;
      case 'priceTier': return taste.priceDistribution;
      default: return [];
    }
  }, [facet, taste]);

  // Apply the user's custom order on top of the default liked_at list.
  const ordered = useMemo(() => {
    if (!customOrder || customOrder.length === 0) return likes;
    const map = new Map(likes.map(l => [l.card_id, l]));
    const seen = new Set<string>();
    const out: LikedCard[] = [];
    for (const id of customOrder) {
      const l = map.get(id);
      if (l && !seen.has(id)) { out.push(l); seen.add(id); }
    }
    for (const l of likes) if (!seen.has(l.card_id)) out.push(l);
    return out;
  }, [likes, customOrder]);

  const filtered = useMemo(() => {
    if (facet === 'all' || !value) return ordered;
    return ordered.filter((c) => {
      switch (facet) {
        case 'artist':    return c.artist === value;
        case 'set':       return c.set_name === value;
        case 'era':       return c.era === value;
        case 'type':      return c.pokemon_type === value;
        case 'rarity':    return c.rarity === value;
        case 'priceTier': return c.price_tier === value;
      }
      return true;
    });
  }, [ordered, facet, value]);

  const totalSpreads = Math.max(1, Math.ceil(filtered.length / CARDS_PER_SPREAD));
  const start = spread * CARDS_PER_SPREAD;
  const leftCards = filtered.slice(start, start + CARDS_PER_PAGE);
  const rightCards = filtered.slice(start + CARDS_PER_PAGE, start + CARDS_PER_SPREAD);

  const go = (delta: 1 | -1) => {
    setDir(delta);
    setSpread((s) => Math.min(Math.max(0, s + delta), totalSpreads - 1));
  };

  // Reordering is only safe when there is no active filter — positions in
  // `ordered` directly map to slot indices on the page.
  const canReorder = facet === 'all' && !value;

  const reorder = (fromIdx: number, toIdx: number) => {
    if (!canReorder) return;
    if (fromIdx === toIdx) return;
    const baseIds = ordered.map(l => l.card_id);
    if (fromIdx < 0 || fromIdx >= baseIds.length) return;
    const [moved] = baseIds.splice(fromIdx, 1);
    const insertAt = Math.min(Math.max(0, toIdx), baseIds.length);
    baseIds.splice(insertAt, 0, moved);
    setCustomOrder(baseIds);
    try { localStorage.setItem(orderKey, JSON.stringify(baseIds)); } catch {}
  };

  const labelFor = (v: string) => {
    if (facet === 'era')       return ERA_LABELS[v] ?? v;
    if (facet === 'priceTier') return PRICE_TIER_LABEL[v] ?? v;
    return v;
  };

  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">{isPublicView ? `${possessive(viewedDisplayName || 'Collector')} binder` : 'Your binder'}</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            · {filtered.length}{value ? ` of ${likes.length}` : ''}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">A curated digital binder of every card {isPublicView ? `${viewedDisplayName || 'Collector'} has` : "you've"} liked.</p>
      </div>

      {likes.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-5 px-5 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FACETS.map((f) => {
            const active = facet === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setFacet(f.key); setValue(''); }}
                className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-all inline-flex items-center gap-1.5 font-medium ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
                }`}
              >
                {f.icon}{f.label}
              </button>
            );
          })}
        </div>
      )}

      {facet !== 'all' && facetOptions.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-2 -mx-5 px-5 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {facetOptions.map((o) => {
            const active = value === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setValue(active ? '' : o.key)}
                className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-all font-medium ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-background/40 text-foreground/85 border-border hover:border-primary/40'
                }`}
              >
                {labelFor(o.key)} <span className="tabular-nums opacity-70 ml-1">{o.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {likes.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-base text-foreground font-medium mb-1">{isPublicView ? `${possessive(viewedDisplayName || 'Collector')} binder is empty.` : 'Your binder is empty.'}</p>
          <p className="text-sm text-muted-foreground mb-5">{isPublicView ? 'This collector has not liked any cards yet.' : 'Like a card on swipe to add it to your binder.'}</p>
          {!isPublicView && <Button asChild><Link to="/swipe">Start swiping</Link></Button>}
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground border-dashed">
          No cards match this filter yet.
        </Card>
      ) : (
        <div className="relative">
          <div className="relative rounded-3xl p-3 sm:p-4 shadow-2xl border border-border/60"
               style={{ background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted)/0.6) 100%)', perspective: '1800px' }}>
            <div className="hidden sm:block absolute top-3 bottom-3 left-1/2 -translate-x-1/2 w-2 rounded-full bg-gradient-to-b from-border/40 via-border to-border/40 shadow-inner pointer-events-none z-10" />
            {/* Edge drop zones — turn pages by dragging a card to the edge. */}
            <EdgeDropZone
              side="left"
              visible={isDragging}
              disabled={spread === 0}
              onTrigger={() => spread > 0 && go(-1)}
            />
            <EdgeDropZone
              side="right"
              visible={isDragging}
              disabled={spread >= totalSpreads - 1}
              onTrigger={() => spread < totalSpreads - 1 && go(1)}
            />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={spread} custom={dir}
                initial={{ rotateY: dir === 1 ? 35 : -35, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir === 1 ? -35 : 35, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <BinderPage
                  cards={leftCards}
                  pageNumber={spread * 2 + 1}
                  side="left"
                  onOpen={onOpen}
                  baseIndex={start}
                  canReorder={canReorder}
                  onReorder={reorder}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                />
                <BinderPage
                  cards={rightCards}
                  pageNumber={spread * 2 + 2}
                  side="right"
                  onOpen={onOpen}
                  baseIndex={start + CARDS_PER_PAGE}
                  canReorder={canReorder}
                  onReorder={reorder}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" onClick={() => go(-1)} disabled={spread === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Pages {spread * 2 + 1}–{Math.min(spread * 2 + 2, Math.ceil(filtered.length / CARDS_PER_PAGE))} of {Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE))}
            </span>
            <Button variant="outline" size="sm" onClick={() => go(1)} disabled={spread >= totalSpreads - 1} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function BinderPage({
  cards, pageNumber, side, onOpen, baseIndex, canReorder, onReorder, onDragStart, onDragEnd,
}: {
  cards: LikedCard[];
  pageNumber: number;
  side: 'left' | 'right';
  onOpen: (s: CardDetailSeed) => void;
  baseIndex: number;
  canReorder: boolean;
  onReorder: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const slots = Array.from({ length: CARDS_PER_PAGE }, (_, i) => cards[i] ?? null);
  return (
    <div className="relative rounded-2xl p-2 sm:p-2.5 bg-background/60 ring-1 ring-border/50 shadow-inner"
         style={{ backgroundImage: 'radial-gradient(hsl(var(--muted-foreground)/0.08) 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {slots.map((c, i) => (
          <BinderSlot
            key={c?.id ?? `empty-${pageNumber}-${i}`}
            like={c}
            onOpen={onOpen}
            slotIndex={baseIndex + i}
            canReorder={canReorder}
            onReorder={onReorder}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
      <p className={`text-[10px] text-muted-foreground tabular-nums mt-1.5 ${side === 'left' ? 'text-left' : 'text-right'}`}>Page {pageNumber}</p>
    </div>
  );
}

function BinderSlot({
  like, onOpen, slotIndex, canReorder, onReorder, onDragStart, onDragEnd,
}: {
  like: LikedCard | null;
  onOpen: (s: CardDetailSeed) => void;
  slotIndex: number;
  canReorder: boolean;
  onReorder: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [err, setErr] = useState(false);
  const [over, setOver] = useState(false);

  const acceptDrop = (e: React.DragEvent) => {
    if (!canReorder) return;
    e.preventDefault();
    setOver(false);
    const from = Number(e.dataTransfer.getData('text/binder-index'));
    if (Number.isFinite(from)) onReorder(from, slotIndex);
  };
  const dragOver = (e: React.DragEvent) => {
    if (!canReorder) return;
    e.preventDefault();
    if (!over) setOver(true);
  };

  if (!like) {
    return (
      <Link
        to="/swipe"
        onDragOver={dragOver}
        onDragLeave={() => setOver(false)}
        onDrop={acceptDrop}
        className={`group aspect-[2.5/3.5] rounded-md bg-muted/30 ring-1 ring-dashed flex items-center justify-center transition-all ${
          over ? 'ring-primary/70 bg-primary/10' : 'ring-border/40 hover:ring-primary/40 hover:bg-primary/5'
        }`}
        title="Add a card by swiping"
        aria-label="Add a card by swiping"
      >
        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </Link>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -3, zIndex: 5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      draggable={canReorder}
      onDragStart={(e) => {
        if (!canReorder) return;
        (e as unknown as React.DragEvent).dataTransfer.setData('text/binder-index', String(slotIndex));
        (e as unknown as React.DragEvent).dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={() => { setOver(false); onDragEnd(); }}
      onDragOver={dragOver}
      onDragLeave={() => setOver(false)}
      onDrop={acceptDrop}
      className={`relative aspect-[2.5/3.5] rounded-md overflow-hidden bg-muted/40 ring-1 shadow-sm hover:shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] cursor-pointer ${
        over ? 'ring-primary ring-2' : 'ring-border/40 hover:ring-primary/50'
      } ${canReorder ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={[like.card_name, like.set_name, like.artist && `by ${like.artist}`].filter(Boolean).join(' · ')}
      onClick={() => onOpen({
        card_id: like.card_id, card_name: like.card_name, set_name: like.set_name,
        image_url: like.image_url, price: like.price, rarity: like.rarity,
        artist: like.artist, pokemon_type: like.pokemon_type, card_number: like.card_number,
      })}
    >
      {like.image_url && !err ? (
        <img src={like.image_url} alt={like.card_name} loading="lazy" decoding="async" draggable={false} className="w-full h-full object-cover pointer-events-none" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-4 h-4 text-muted-foreground" /></div>
      )}
    </motion.div>
  );
}

// Hover-to-turn drop zone pinned to the left/right edge of the binder spread.
// Holding a dragged card over it for ~550ms advances the page in that direction.
function EdgeDropZone({
  side, visible, disabled, onTrigger,
}: { side: 'left' | 'right'; visible: boolean; disabled: boolean; onTrigger: () => void }) {
  const timer = React.useRef<number | null>(null);
  const clear = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } };
  React.useEffect(() => clear, []);

  return (
    <div
      onDragEnter={(e) => {
        if (disabled) return;
        e.preventDefault();
        clear();
        timer.current = window.setTimeout(() => { onTrigger(); clear(); }, 550);
      }}
      onDragOver={(e) => { if (!disabled) e.preventDefault(); }}
      onDragLeave={clear}
      onDrop={(e) => { e.preventDefault(); clear(); }}
      className={`absolute top-3 bottom-3 ${side === 'left' ? 'left-0' : 'right-0'} w-10 sm:w-14 z-20 rounded-${side === 'left' ? 'l' : 'r'}-3xl transition-opacity duration-200 flex items-center justify-center ${
        visible && !disabled ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: side === 'left'
          ? 'linear-gradient(to right, hsl(var(--primary)/0.18), transparent)'
          : 'linear-gradient(to left, hsl(var(--primary)/0.18), transparent)',
      }}
      aria-hidden
    >
      {side === 'left'
        ? <ChevronLeft className="w-5 h-5 text-primary drop-shadow" />
        : <ChevronRight className="w-5 h-5 text-primary drop-shadow" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recommendations (kept between Binder and Deep Insights)
// ─────────────────────────────────────────────────────────────

function RecommendedRow({ items, onOpen }: { items: RecommendedCard[]; onOpen: (s: CardDetailSeed) => void }) {
  return (
    <section>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Recommended for you</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Picked by matching the artists, sets, types, and rarities you keep liking.
        </p>
      </div>
      <CarouselRow ariaLabel="recommended cards">
        {items.map((r) => <RecRowCard key={r.card_id} r={r} onOpen={onOpen} />)}
      </CarouselRow>
    </section>
  );
}

function RecRowCard({ r, onOpen }: { r: RecommendedCard; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      onClick={() => onOpen({
        card_id: r.card_id, card_name: r.card_name, set_name: r.set_name,
        image_url: r.image_url, price: r.price, rarity: r.rarity,
        artist: r.artist, pokemon_type: r.pokemon_type,
      })}
      className="group shrink-0 w-[170px] sm:w-[190px] snap-start text-left cursor-pointer"
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/60 shadow-md group-hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.55)] group-hover:ring-primary/50 transition-all duration-300">
        {r.image_url && !err ? (
          <img src={r.image_url} alt={r.card_name} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        <TcgLinkIcon tcgplayerId={r.tcgplayer_id} name={r.card_name} />
      </div>
      <p className="mt-2.5 text-sm text-foreground font-medium truncate">{r.card_name}</p>
      <p className="text-xs text-muted-foreground truncate">
        {r.set_name ?? '—'}{r.price ? ` · $${Number(r.price).toFixed(0)}` : ''}
      </p>
      <p className="text-[11px] text-primary/80 truncate italic mt-0.5">{r.reason}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION 4 — Deep Taste Insights (tabbed)
// ─────────────────────────────────────────────────────────────

function DeepTasteInsights({ taste, isPublicView, viewedDisplayName }: { taste: TasteProfile; isPublicView?: boolean; viewedDisplayName?: string }) {
  const tabs: { key: string; label: string; items: AttrCount[]; icon: React.ReactNode }[] = [
    { key: 'artists',  label: 'Artists',  items: taste.topArtists,        icon: <Palette className="w-3.5 h-3.5" /> },
    { key: 'sets',     label: 'Sets',     items: taste.topSets,           icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'eras',     label: 'Eras',     items: taste.topEras,           icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'types',    label: 'Types',    items: taste.topPokemonTypes,   icon: <Zap className="w-3.5 h-3.5" /> },
    { key: 'rarity',   label: 'Rarity',   items: taste.topRarities,       icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'value',    label: 'Value',    items: taste.priceDistribution, icon: <Layers className="w-3.5 h-3.5" /> },
  ];
  const hasAnyData = tabs.some((t) => t.items.length > 0);
  const subject = isPublicView ? (viewedDisplayName || 'Collector') : 'your';

  return (
    <section id="deep-insights">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Taste insights</h2>
        <p className="text-sm text-muted-foreground mt-1">The hard patterns behind {isPublicView ? `${possessive(subject)} likes` : 'your likes'}.</p>
      </div>

      {!hasAnyData ? (
        <Card className="p-10 text-center border-dashed">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
          <p className="text-base text-foreground font-medium">More likes unlock deeper taste analysis.</p>
          <p className="text-xs text-muted-foreground mt-1">Keep swiping to reveal artists, sets, eras, and more.</p>
        </Card>
      ) : (
        <Tabs defaultValue="artists">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1.5">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-sm gap-1.5 px-4 py-2">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-6">
              <InsightTable items={t.items} label={t.label} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  );
}

function InsightTable({ items, label }: { items: AttrCount[]; label: string }) {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed">
        <p className="text-sm text-muted-foreground">More likes unlock {label.toLowerCase()} analysis.</p>
      </Card>
    );
  }
  const max = Math.max(...items.map((i) => i.count));
  return (
    <Card className="p-6 sm:p-8">
      <ul className="space-y-4">
        {items.map((a) => {
          const w = max > 0 ? (a.count / max) * 100 : 0;
          return (
            <li key={a.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-medium text-foreground truncate">{a.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {a.count} <span className="opacity-60">· {a.pct}%</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all" style={{ width: `${w}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Daily Limit Widget — moved from Pull or Pass results
// ─────────────────────────────────────────────────────────────
export function SwipeAgainOrLimit() {
  const { isPremium, loading: premiumLoading } = useIsPremium();
  const DAILY_BASE_LIMIT = 20;
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const readQuota = () => {
    try {
      const raw = localStorage.getItem('pop_quota');
      if (!raw) return { date: todayKey(), used: 0, bonus: 0 };
      const q = JSON.parse(raw);
      if (q.date !== todayKey()) return { date: todayKey(), used: 0, bonus: 0 };
      return { date: q.date, used: q.used ?? 0, bonus: q.bonus ?? 0 };
    } catch { return { date: todayKey(), used: 0, bonus: 0 }; }
  };
  const [quota, setQuota] = useState(() => readQuota());
  useEffect(() => {
    const refresh = () => setQuota(readQuota());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  if (premiumLoading) return null;
  const dailyLimit = DAILY_BASE_LIMIT + quota.bonus;
  const remaining = isPremium ? Infinity : Math.max(0, dailyLimit - quota.used);
  const outOfSwipes = !isPremium && remaining <= 0;
  if (outOfSwipes) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
    >
      <Link to="/swipe" state={{ fresh: true }} className="w-full sm:w-auto">
        <motion.button
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base inline-flex items-center justify-center gap-2 shadow-[0_0_24px_hsl(var(--primary)/0.45)]"
        >
          <Sparkles className="w-4 h-4" />
          Swipe again
          {!isPremium && (
            <span className="text-xs font-medium opacity-80 ml-1">· {remaining} left today</span>
          )}
        </motion.button>
      </Link>
      <Link to="/personality-types" className="w-full sm:w-auto">
        <motion.button
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full sm:w-auto h-12 px-7 rounded-xl bg-card/60 backdrop-blur border border-primary/40 text-foreground font-semibold text-base inline-flex items-center justify-center gap-2 hover:border-primary/70 hover:bg-primary/10 transition-colors shadow-[0_0_24px_-8px_hsl(var(--primary)/0.4)]"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          View Collector Profile
        </motion.button>
      </Link>
    </motion.section>
  );
}

export function DailyLimitWidget() {
  const { isPremium, loading: premiumLoading } = useIsPremium();
  const DAILY_BASE_LIMIT = 20;
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  const readQuota = () => {
    try {
      const raw = localStorage.getItem('pop_quota');
      if (!raw) return { date: todayKey(), used: 0, bonus: 0 };
      const q = JSON.parse(raw);
      if (q.date !== todayKey()) return { date: todayKey(), used: 0, bonus: 0 };
      return { date: q.date, used: q.used ?? 0, bonus: q.bonus ?? 0 };
    } catch { return { date: todayKey(), used: 0, bonus: 0 }; }
  };

  const [quota, setQuota] = useState(() => readQuota());
  useEffect(() => {
    const refresh = () => setQuota(readQuota());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const dailyLimit = DAILY_BASE_LIMIT + quota.bonus;
  const remaining = isPremium ? Infinity : Math.max(0, dailyLimit - quota.used);
  const outOfSwipes = !premiumLoading && !isPremium && remaining <= 0;

  // Only render this widget when the user has actually run out of swipes.
  // Premium users or anyone with remaining swipes shouldn't see it at all.
  if (premiumLoading || isPremium || !outOfSwipes) return null;

  // Countdown to midnight
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  const ms = Math.max(0, next.getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="relative rounded-2xl border border-purple-500/30 bg-transparent p-6 sm:p-8 overflow-hidden text-center mx-0">
        <div className="relative space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-purple-300 font-semibold">
            {isPremium ? 'Unlimited Rounds' : outOfSwipes ? 'Daily Limit Reached' : 'Want Another Round?'}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {outOfSwipes ? "You're out of swipes for today" : 'Keep swiping with PokeIQ Premium'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {isPremium ? (
              <>Help Train the PokeIQ by going to the PokeIQ Training Lab.</>
            ) : (
              <>Earn more swipe credits by helping train PokeIQ — or go PokeIQ Premium for unlimited swipes.</>
            )}
            {!isPremium && outOfSwipes && (
              <> Your daily swipes reset in{' '}
                <span className="font-semibold text-purple-200 tabular-nums">{h}h {m}m</span>.
              </>
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 max-w-md mx-auto">
            <Link to="/pokeyelp" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto h-11 px-8 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Train PokeIQ
              </motion.button>
            </Link>
            {!isPremium && (
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.location.assign('/premium')}
                className="w-full sm:w-auto h-11 px-8 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.5)]"
              >
                <Crown className="w-4 h-4" />
                Go PokeIQ Premium
              </motion.button>
            )}
          </div>
          {!isPremium && (
            <p className="text-[11px] text-muted-foreground/80 pt-1">
              {outOfSwipes
                ? 'Every 20 cards you train earns +10 swipes.'
                : `You have ${remaining} swipe${remaining === 1 ? '' : 's'} left today. Every 20 cards you train earns +10 more.`}
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────
// Public-profile helpers — read-only username + non-user CTA.
// ─────────────────────────────────────────────────────────────
function UsernameStatic({ name }: { name: string }) {
  const initial = (name || 'C').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-primary/20 border border-primary/30 text-primary flex items-center justify-center text-base font-bold shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm sm:text-base font-semibold text-foreground truncate">@{name}</span>
        <p className="text-[11px] text-muted-foreground truncate">Public collector profile</p>
      </div>
    </div>
  );
}

function BuildYourOwnProfileCTA() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-card p-8 sm:p-12 text-center shadow-[0_0_40px_-12px_hsl(var(--primary)/0.4)]">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <Sparkles className="w-9 h-9 text-primary mx-auto mb-4" />
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground whitespace-pre-line">
        UNLIMITED{"\n"}Matches
      </h2>
      <p className="mt-3 text-sm sm:text-base text-foreground/80 max-w-md mx-auto">
        Start swiping to discover your taste, unlock your personality, and build a profile like this one.
      </p>
      <Button asChild size="lg" className="mt-6 gap-2">
        <Link to="/swipe">Start swiping <ArrowRight className="w-4 h-4" /></Link>
      </Button>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// SECTION — This or That Rankings (top winners from Training Lab)
// ─────────────────────────────────────────────────────────────

type RankedTotCard = {
  card_id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  price: number | null;
  wins: number;
  losses: number;
  tcgplayer_id: string | null;
};

function totTcgImage(id: string | null): string | null {
  if (!id) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`;
}

function ThisOrThatRankings({ userId, onOpen }: { userId: string; onOpen: (s: CardDetailSeed) => void }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RankedTotCard[]>([]);
  const [totalMatchups, setTotalMatchups] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('this_or_that_matchups')
        .select('winner_card_id, loser_card_id, winner_name, winner_set, winner_price')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setItems([]); setTotalMatchups(0); setLoading(false); return;
      }

      const tally = new Map<string, RankedTotCard>();
      for (const r of data as any[]) {
        const wId = r.winner_card_id as string;
        const lId = r.loser_card_id as string;
        if (wId) {
          const cur = tally.get(wId) ?? { card_id: wId, name: r.winner_name ?? '', set_name: r.winner_set ?? null, image_url: null, price: r.winner_price != null ? Number(r.winner_price) : null, wins: 0, losses: 0, tcgplayer_id: null };
          cur.wins += 1;
          if (!cur.name && r.winner_name) cur.name = r.winner_name;
          if (!cur.set_name && r.winner_set) cur.set_name = r.winner_set;
          if (cur.price == null && r.winner_price != null) cur.price = Number(r.winner_price);
          tally.set(wId, cur);
        }
        if (lId) {
          const cur = tally.get(lId) ?? { card_id: lId, name: '', set_name: null, image_url: null, price: null, wins: 0, losses: 0, tcgplayer_id: null };
          cur.losses += 1;
          tally.set(lId, cur);
        }
      }

      const ranked = Array.from(tally.values())
        .filter((c) => c.wins > 0)
        .sort((a, b) => b.wins - a.wins || (b.wins / Math.max(1, b.wins + b.losses)) - (a.wins / Math.max(1, a.wins + a.losses)))
        .slice(0, 10);

      // Enrich with images + missing meta from market_snapshots
      const ids = ranked.map((r) => r.card_id);
      if (ids.length) {
        const { data: meta } = await supabase
          .from('market_snapshots')
          .select('card_id, tcgplayer_id, name, set_name, price, image_url')
          .in('card_id', ids);
        const byId = new Map<string, any>();
        (meta ?? []).forEach((m: any) => byId.set(m.card_id, m));
        for (const r of ranked) {
          const m = byId.get(r.card_id);
          if (m) {
            r.image_url = m.image_url || totTcgImage(m.tcgplayer_id);
            if (!r.name) r.name = m.name ?? r.name;
            if (!r.set_name) r.set_name = m.set_name ?? r.set_name;
            if (r.price == null && m.price != null) r.price = Number(m.price);
            if (!r.tcgplayer_id) r.tcgplayer_id = m.tcgplayer_id ?? null;
          }
        }
      }

      if (cancelled) return;
      setItems(ranked);
      setTotalMatchups(data.length);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return null;
  if (items.length === 0) {
    return (
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Rankings</h2>
            <p className="text-xs text-muted-foreground">Your top 10 cards from This or That.</p>
          </div>
          <Link to="/this-or-that" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Play This or That <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No This or That picks yet. Play a round to see your rankings.
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-3 gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight">Rankings</h2>
          <p className="text-xs text-muted-foreground">
            Your top {items.length} cards from This or That · {totalMatchups} matchup{totalMatchups === 1 ? '' : 's'}
          </p>
        </div>
        <Link to="/this-or-that" className="text-xs text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap">
          Play more <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
        {items.map((c, i) => (
          <RankedThumb key={c.card_id} card={c} rank={i + 1} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function RankedThumb({ card, rank, onOpen }: { card: RankedTotCard; rank: number; onOpen: (s: CardDetailSeed) => void }) {
  const [err, setErr] = useState(false);
  const total = card.wins + card.losses;
  const winPct = total > 0 ? Math.round((card.wins / total) * 100) : 0;
  const rankBg =
    rank === 1 ? 'bg-amber-400 text-black' :
    rank === 2 ? 'bg-slate-300 text-black' :
    rank === 3 ? 'bg-orange-400 text-black' :
    'bg-background/85 text-foreground';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen({ card_id: card.card_id, name: card.name, set_name: card.set_name, image_url: card.image_url, price: card.price ?? undefined } as any)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen({ card_id: card.card_id, name: card.name, set_name: card.set_name, image_url: card.image_url, price: card.price ?? undefined } as any); }}
      className="group text-left space-y-1.5 cursor-pointer"
    >
      <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/30 ring-1 ring-border/40 group-hover:ring-primary/40 transition-shadow shadow-md group-hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)]">
        {card.image_url && !err ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-muted-foreground" /></div>
        )}
        <div className={`absolute top-1.5 left-1.5 ${rankBg} rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md backdrop-blur-sm`}>
          #{rank}
        </div>
        <div className="absolute bottom-1.5 right-1.5 bg-background/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums shadow-md">
          {card.wins}W · {winPct}%
        </div>
        <TcgLinkIcon tcgplayerId={card.tcgplayer_id} name={card.name} />
      </div>
      <p className="text-xs text-foreground truncate font-medium">{card.name || '—'}</p>
      <p className="text-[10px] text-muted-foreground truncate">
        {card.set_name ?? '—'}{card.price ? ` · $${Number(card.price).toFixed(0)}` : ''}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// This or That — cross-promo widget below "Swipe again"
// ─────────────────────────────────────────────────────────────
function ThisOrThatCTA() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/60 to-card/40 p-6 sm:p-8 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.6)]"
    >
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
            <Sparkles className="w-3 h-3" /> New training lab
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-2">
            🔥 Try <span className="text-primary">This or That</span> — now live on PokeIQ
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            See 20 head-to-head Pokémon card matchups, choose your favorite each time, and help PokeIQ rank
            your preferences and learn more about what makes you unique as a collector.
          </p>
        </div>
        <Link to="/this-or-that" className="w-full sm:w-auto shrink-0">
          <motion.button
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base inline-flex items-center justify-center gap-2 shadow-[0_0_28px_hsl(var(--primary)/0.55)]"
          >
            <Zap className="w-4 h-4" />
            Battle now
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </Link>
      </div>
    </motion.section>
  );
}
