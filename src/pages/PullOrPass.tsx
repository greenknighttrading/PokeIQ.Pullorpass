import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, ImageOff, Sparkles, RotateCw, Loader2, Trophy, Star, LogIn, Check, Lock, DollarSign, Apple, User as UserIcon, Layers, SlidersHorizontal, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  SwipeCard, SwipeRecord, analyzeRound, pickDiverse20, mulberry32, hashStringToSeed,
} from '@/lib/pullorpass';
import { toast } from 'sonner';
import { MatchOverlay } from '@/components/pullorpass/MatchOverlay';
import { MatchPulse, type MatchPulseEvent } from '@/components/pullorpass/MatchPulse';
import { saveLike, classifyEra, priceTier, extractPokemonName, type LikedCard } from '@/lib/likesService';
import { backfillGuestSwipes } from '@/lib/pullorpassBackfill';
import { recommendForUser, type RecommendedCard } from '@/lib/recommendCards';
import { BookOpen, Wand2, TrendingUp as TrendingUpIcon, ArrowRight, Crown, Infinity as InfinityIcon, Zap, BarChart3, Library } from 'lucide-react';
import { CardDetailModal, CardDetailSeed } from '@/components/cards/CardDetailModal';
import pikachuMascot from '@/assets/pikachu-mascot.png';
import binderMockup from '@/assets/binder-mockup.jpg';
import dittoDancing from '@/assets/ditto-dancing.gif.asset.json';
import { DailyLimitWidget } from '@/pages/Matches';
import { useIsPremium } from '@/hooks/useIsPremium';
import { useHasFilterAccess } from '@/hooks/useHasFilterAccess';
import { InviteFriendModal } from '@/components/pullorpass/InviteFriendModal';
import {
  FeedFiltersDrawer,
  DEFAULT_FILTERS,
  type FeedFilters,
  matchesEras,
  formatsToProductTypes,
} from '@/components/pullorpass/FeedFiltersDrawer';

type Stage = 'intro' | 'loading' | 'swiping' | 'results';

const INTRO_SEEN_KEY = 'pop_intro_seen_v1';
type SwipeDir = 'left' | 'right' | 'up';

const SWIPE_THRESHOLD = 110;

// ─── Daily swipe quota (free tier) ───────────────────────
const DAILY_BASE_LIMIT = 50;
const EARN_BONUS_PER_BATCH = 10; // +10 swipes per 10 Earn reviews
const CREDITS_PER_REDEMPTION = 10; // 10 credits → 10 swipes (1 credit = 1 swipe)
const SWIPES_PER_REDEMPTION = 10;
const REDEMPTIONS_BEFORE_PRO_NUDGE = 3;
const REDEMPTION_COUNT_KEY = 'pop_redemption_count_v1';
const PRO_NUDGE_DISMISSED_KEY = 'pop_pro_nudge_dismissed_v1';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function yesterdayKey() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
// ─── Daily swipe streak ─────────────────────────────────
const STREAK_KEY = 'pop_streak_v1';
export function readSwipeStreak(): { lastDate: string | null; streak: number } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastDate: null, streak: 0 };
    const v = JSON.parse(raw);
    return { lastDate: v.lastDate ?? null, streak: v.streak ?? 0 };
  } catch { return { lastDate: null, streak: 0 }; }
}
export function bumpSwipeStreak(): number {
  const cur = readSwipeStreak();
  const today = todayKey();
  if (cur.lastDate === today) return cur.streak;
  const next = cur.lastDate === yesterdayKey() ? cur.streak + 1 : 1;
  try { localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: today, streak: next })); } catch {}
  return next;
}
function readQuota() {
  try {
    const raw = localStorage.getItem('pop_quota');
    if (!raw) return { date: todayKey(), used: 0, bonus: 0, lifetime: 0 };
    const q = JSON.parse(raw);
    if (q.date !== todayKey()) return { date: todayKey(), used: 0, bonus: 0, lifetime: q.lifetime ?? 0 };
    return { date: q.date, used: q.used ?? 0, bonus: q.bonus ?? 0, lifetime: q.lifetime ?? 0 };
  } catch { return { date: todayKey(), used: 0, bonus: 0, lifetime: 0 }; }
}
function writeQuota(q: { date: string; used: number; bonus: number; lifetime: number }) {
  try { localStorage.setItem('pop_quota', JSON.stringify(q)); } catch {}
}

// PokeIQ Premium (granted after 200 Earn reviews → 30 days unlimited)
function isPremiumActive(): boolean {
  try {
    // PokeIQ Pro requires a paid subscription. No free auto-grants.
    // Clear any legacy auto-granted premium flag so previously-flagged
    // accounts (e.g. earned via training rewards) revert to Free.
    if (localStorage.getItem('pokeiq_premium_until')) {
      localStorage.removeItem('pokeiq_premium_until');
    }
    return false;
  } catch { return false; }
}

// ─── Resume state (remember where the user left off) ─────
const RESUME_KEY = 'pop_resume_v1';
type ResumeState = {
  cards: SwipeCard[];
  index: number;
  records: SwipeRecord[];
  roundId: string;
};
function readResume(): ResumeState | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.cards?.length) return null;
    if (typeof v.index !== 'number' || v.index >= v.cards.length) return null;
    return v as ResumeState;
  } catch { return null; }
}
function writeResume(s: ResumeState) {
  try { localStorage.setItem(RESUME_KEY, JSON.stringify(s)); } catch {}
}
function clearResume() {
  try { localStorage.removeItem(RESUME_KEY); } catch {}
}

// ─── Results state (remember the last completed round so back-nav restores it) ─
const RESULTS_KEY = 'pop_results_v1';
type ResultsState = { records: SwipeRecord[]; roundId: string; cards: SwipeCard[] };
function readResults(): ResultsState | null {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.records?.length) return null;
    return v as ResultsState;
  } catch { return null; }
}
function writeResults(s: ResultsState) {
  try { localStorage.setItem(RESULTS_KEY, JSON.stringify(s)); } catch {}
}
function clearResults() {
  try { localStorage.removeItem(RESULTS_KEY); } catch {}
}

function tcgImage(tcgplayerId: string | null): string | null {
  if (!tcgplayerId) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_1000x1000.jpg`;
}

export default function PullOrPass() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stage, setStage] = useState<Stage>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<SwipeCard[]>([]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<SwipeRecord[]>([]);
  const [roundId, setRoundId] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const [flyAnim, setFlyAnim] = useState<{ type: 'pull' | 'love' | 'pass'; key: number } | null>(null);
  const [exitDir, setExitDir] = useState<SwipeDir | null>(null);
  const [matchCard, setMatchCard] = useState<SwipeCard | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [pendingMatchAdvance, setPendingMatchAdvance] = useState<null | (() => void)>(null);
  const [matchPulse, setMatchPulse] = useState<MatchPulseEvent | null>(null);
  const [quota, setQuota] = useState(() => readQuota());
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [detailSeed, setDetailSeed] = useState<CardDetailSeed | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [redeeming, setRedeeming] = useState(false);
  const [swipeBlocked, setSwipeBlocked] = useState(false);
  const [redemptionCount, setRedemptionCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(sessionStorage.getItem(REDEMPTION_COUNT_KEY) ?? '0') || 0;
  });
  const [proNudgeDismissed, setProNudgeDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(PRO_NUDGE_DISMISSED_KEY) === '1';
  });
  const [outOfCreditsDismissed, setOutOfCreditsDismissed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { hasAccess: hasFilterAccess, completedReferrals, refresh: refreshFilterAccess } =
    useHasFilterAccess();

  // Capture ?ref=<uuid> in the URL and persist for the auth flow.
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if (ref && /^[0-9a-f-]{32,40}$/i.test(ref)) {
        sessionStorage.setItem('pop_referrer_id', ref);
      }
    } catch {}
  }, [location.search]);

  const dailyLimit = DAILY_BASE_LIMIT + quota.bonus;
  const { isPremium: premium, loading: premiumLoading } = useIsPremium();
  const remaining = premium ? Infinity : Math.max(0, dailyLimit - quota.used);
  // Compute out-of-swipes eagerly (without waiting for the async premium
  // check) so the gating modal mounts on the same paint as the page. This
  // avoids a brief flash of the results/intro view before the modal pops in
  // when navigating in from /matches. Premium users will hide it the moment
  // their cached premium flag resolves.
  const outOfSwipes = !premium && remaining <= 0;
  const canRedeem = !premium && credits >= CREDITS_PER_REDEMPTION;
  const showProNudge =
    !premium &&
    redemptionCount >= REDEMPTIONS_BEFORE_PRO_NUDGE &&
    !proNudgeDismissed;

  // Auth check (optional — anyone can play, sign-in saves results)
  useEffect(() => {
    const handleSignedIn = (session: any) => {
      if (session?.user && !session.user.is_anonymous) {
        setUserId(session.user.id);
        // ── Per-account isolation ────────────────────────────
        // Local storage is shared across all logins on this device. If a
        // different account just signed in, wipe shared swipe state so one
        // user's history (quota, seen cards, in-progress round, results)
        // never bleeds into another's.
        // IMPORTANT: we backfill guest swipes BEFORE wiping, so a brand new
        // signup (prevUid === null) preserves its pre-account swipes, and
        // even an account-switch still captures any guest swipes made on
        // this device before this auth event fired.
        backfillGuestSwipes(session.user.id).catch((e) =>
          console.warn('guest swipe backfill failed', e),
        );
        try {
          const prevUid = localStorage.getItem('pop_last_user_id');
          if (prevUid && prevUid !== session.user.id) {
            [
              'pop_quota',
              'pop_resume_v1',
              'pop_results_v1',
              'pop_seen_card_ids',
              REDEMPTION_COUNT_KEY,
              PRO_NUDGE_DISMISSED_KEY,
            ].forEach((k) => localStorage.removeItem(k));
            Object.keys(localStorage)
              .filter((k) => k.startsWith('pop_today_swiped_'))
              .forEach((k) => localStorage.removeItem(k));
            try { sessionStorage.removeItem(REDEMPTION_COUNT_KEY); } catch {}
            try { sessionStorage.removeItem(PRO_NUDGE_DISMISSED_KEY); } catch {}
            setRedemptionCount(0);
            setProNudgeDismissed(false);
            setQuota({ date: todayKey(), used: 0, bonus: 0, lifetime: 0 });
          }
          localStorage.setItem('pop_last_user_id', session.user.id);
        } catch {}
        // First time EVER for this user on this device → grant them their
        // one-time post-signup free swipes bonus so brand-new accounts get
        // 60 total free swipes (20 daily base + 40 bonus). After that, the
        // normal daily quota applies (earn credits or upgrade to keep swiping).
        try {
          const bonusFlag = `pop_signup_bonus_granted_${session.user.id}`;
          const alreadyGranted = localStorage.getItem(bonusFlag) === '1';
          if (!alreadyGranted) {
            localStorage.setItem(bonusFlag, '1');
            localStorage.setItem('pop_last_user_id', session.user.id);
            const fresh = { date: todayKey(), used: 0, bonus: 40, lifetime: readQuota().lifetime };
            writeQuota(fresh);
            setQuota(fresh);
          }
        } catch {}
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => handleSignedIn(session));
    // Also listen for sign-in events that happen AFTER mount (e.g. user signs
    // up via the auth modal while staying on this page). Without this listener
    // a fresh signup never triggers the guest-swipe backfill, leaving the
    // user's pre-account swipes orphaned in localStorage.
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        handleSignedIn(session);
      }
    });
    // Force a fresh round when navigated here with `state.fresh` (e.g.
    // "Swipe again" from the profile page). Skip resume/results entirely.
    const storedResume = readResume();
    const wantsFresh = (location.state as { fresh?: boolean } | null)?.fresh === true && !storedResume;
    // First-time visitors see the landing/instructions page
    let introSeen = false;
    try { introSeen = localStorage.getItem(INTRO_SEEN_KEY) === '1'; } catch {}
    // New users always see the intro/landing first, regardless of any
    // stale resume or results that may be lingering in storage.
    if (wantsFresh) {
      try { window.history.replaceState({}, ''); } catch {}
      try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch {}
      clearResume();
      clearResults();
      loadRound();
    } else if (!introSeen) {
      setStage('intro');
    } else {
      // Try to resume an in-progress round first, then fall back to last results
      const resume = storedResume;
      if (resume) {
      setCards(resume.cards);
      setIndex(resume.index);
      setRecords(resume.records || []);
      setRoundId(resume.roundId);
      setStage('swiping');
      } else {
      const last = readResults();
      if (last) {
        // If the user still has swipes left, skip the results recap and
        // drop them straight back into a new round.
        const q = readQuota();
        const remainingNow = Math.max(0, (DAILY_BASE_LIMIT + (q.bonus ?? 0)) - (q.used ?? 0));
        if (remainingNow > 0) {
          loadRound();
        } else {
          setCards(last.cards);
          setRecords(last.records);
          setRoundId(last.roundId);
          setIndex(last.cards.length);
          setStage('results');
        }
      } else {
        loadRound();
      }
      }
    }
    // Bonus swipes are written directly into pop_quota by the Earn page
    // (every 20 reviews → +10 swipes). Refresh on focus to pick them up.
    const refresh = () => setQuota(readQuota());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      try { authSub?.subscription?.unsubscribe(); } catch {}
    };
  }, []);


  // Fetch credits balance (signed-in users)
  const refreshCredits = useCallback(async (uid?: string | null) => {
    const id = uid ?? userId;
    if (!id) { setCredits(0); return; }
    const { data } = await supabase
      .from('pokeiq_credits').select('credits').eq('user_id', id).maybeSingle();
    setCredits(data?.credits ?? 0);
  }, [userId]);

  useEffect(() => {
    refreshCredits();
    const onFocus = () => refreshCredits();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshCredits]);

  // Redeem 10 credits → +10 swipes (bonus added to today's quota)
  const redeemSwipes = useCallback(async () => {
    if (!userId) {
      navigate('/auth', { state: { from: '/swipe' } });
      return;
    }
    if (credits < CREDITS_PER_REDEMPTION || redeeming) return;
    setRedeeming(true);
    try {
      const { data: updated, error } = await supabase.rpc('change_pokeiq_credits', { p_delta: -CREDITS_PER_REDEMPTION });
      if (error) throw error;
      const newCredits = typeof updated === 'number' ? updated : credits - CREDITS_PER_REDEMPTION;
      setCredits(newCredits);
      const q = readQuota();
      const next = { ...q, bonus: (q.bonus ?? 0) + SWIPES_PER_REDEMPTION };
      writeQuota(next);
      setQuota(next);
      setRedemptionCount((c) => {
        const nextC = c + 1;
        try { sessionStorage.setItem(REDEMPTION_COUNT_KEY, String(nextC)); } catch {}
        return nextC;
      });
      toast.success(`+${SWIPES_PER_REDEMPTION} swipes unlocked!`, {
        description: `${newCredits} credits remaining.`,
        position: 'top-center',
      });
    } catch (e: any) {
      toast.error('Could not redeem credits');
    } finally {
      setRedeeming(false);
    }
  }, [userId, credits, redeeming, navigate]);

  // Persist in-progress round so users can leave and come back
  useEffect(() => {
    if (stage !== 'swiping') return;
    if (!cards.length) return;
    if (index >= cards.length) return;
    writeResume({ cards, index, records, roundId });
  }, [stage, cards, index, records, roundId]);

  const loadRound = useCallback(async () => {
    setStage('loading');
    const loadStart = Date.now();
    clearResults();
    setIndex(0);
    setRecords([]);
    setImgError(false);
    setExitDir(null);
    setFlyAnim(null);
    setMatchPulse(null);
    setMatchCard(null);
    setPendingMatchAdvance(null);
    setMatchCount(0);
    // Deterministic seed: same user (or guest device) gets the same cards
    // on the same day, so reloads / new sessions show the same round until
    // they actually swipe through it. Authed users seed by user_id; guests
    // by a stable device id stored in localStorage.
    let identity = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !session.user.is_anonymous) {
        identity = `user:${session.user.id}`;
      } else {
        let dev = localStorage.getItem('pop_device_id');
        if (!dev) {
          dev = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
          localStorage.setItem('pop_device_id', dev);
        }
        identity = `guest:${dev}`;
      }
    } catch {
      identity = 'guest:fallback';
    }
    const seedStr = `${identity}|${todayKey()}`;
    const rand = mulberry32(hashStringToSeed(seedStr));
    // Stable round id per identity+day so resume/results keys line up.
    setRoundId(`r-${hashStringToSeed(seedStr).toString(16)}`);

    // Build an exclusion set of every card this user has ever swiped, so we
    // never show the same card twice. For signed-in users we pull from the
    // DB; for anon/guest users we fall back to localStorage history.
    const seen = new Set<string>();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !session.user.is_anonymous) {
        let from = 0;
        const PAGE = 1000;
        // Paginate to bypass the 1000-row default cap
        while (true) {
          const { data: prior } = await supabase
            .from('pullorpass_swipes')
            .select('card_id')
            .eq('user_id', session.user.id)
            .range(from, from + PAGE - 1);
          if (!prior || prior.length === 0) break;
          prior.forEach((r: any) => r.card_id && seen.add(r.card_id));
          if (prior.length < PAGE) break;
          from += PAGE;
        }
      }
    } catch (e) {
      console.warn('seen-history load failed', e);
    }
    try {
      const local = JSON.parse(localStorage.getItem('pop_seen_card_ids') || '[]');
      if (Array.isArray(local)) local.forEach((id: string) => id && seen.add(id));
    } catch {}

    // Pool of value cards. We sample across multiple random price tiers so
    // every round draws from a different slice of the 10k+ unique card pool —
    // otherwise we'd keep dipping into the same top-priced rows every round.
    const TIERS: Array<[number, number]> = [
      [5, 15], [15, 40], [40, 100], [100, 300], [300, 1000], [1000, 100000],
    ];
    // Shuffle tier order + use a seeded offset within each tier so the same
    // identity+day deterministically draws the same pool.
    const shuffledTiers = [...TIERS].sort(() => rand() - 0.5);
    const rows: any[] = [];
    let lastError: any = null;
    for (const [lo, hi] of shuffledTiers) {
      const offset = Math.floor(rand() * 400);
      const { data: chunk, error: e } = await supabase
        .from('market_snapshots')
        .select('card_id, tcgplayer_id, name, set_name, price, rarity')
        .eq('game', 'Pokemon')
        .eq('product_type', 'card')
        .gte('price', lo)
        .lt('price', hi)
        .not('tcgplayer_id', 'is', null)
        .order('card_id')
        .range(offset, offset + 499);
      if (e) { lastError = e; continue; }
      if (chunk) rows.push(...chunk);
      if (rows.length > 2500) break;
    }

    if (rows.length === 0) {
      const error = lastError;
      console.error('pullorpass load error', error);
      toast.error('Could not load cards for this round');
      const elapsed = Date.now() - loadStart;
      if (elapsed < 3000) await new Promise(r => setTimeout(r, 3000 - elapsed));
      setStage('swiping');
      return;
    }

    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    // Dedup by card_id — market_snapshots has multiple rows per card (one per
    // condition/printing) and we only want to consider each card once.
    const byId = new Map<string, any>();
    for (const c of rows) {
      if (!c.tcgplayer_id || !c.price) continue;
      if (EXCLUDE.test(c.name)) continue;
      if (seen.has(c.card_id)) continue;
      if (!byId.has(c.card_id)) byId.set(c.card_id, c);
    }
    const pool: SwipeCard[] = Array.from(byId.values())
      .map((c) => ({
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name,
        image_url: tcgImage(c.tcgplayer_id),
        price: Number(c.price),
        rarity: c.rarity,
      }));

    // New/unauthed users get a shorter 10-card first round so we can prompt
    // them to sign up sooner. Returning guests + signed-in users get the
    // full 20-card round.
    const { data: { session: liveSession } } = await supabase.auth.getSession();
    const isGuest = !liveSession?.user || liveSession.user.is_anonymous;
    const isFirstRound = isGuest && readQuota().lifetime === 0;
    const roundSize = isFirstRound ? 10 : 20;
    const picked = pickDiverse20(pool, roundSize, rand);
    if (picked.length === 0) {
      toast.error("You've swiped every card we have — new ones drop daily!");
    }
    setCards(picked);
    const elapsed = Date.now() - loadStart;
    if (elapsed < 3000) await new Promise(r => setTimeout(r, 3000 - elapsed));
    setStage('swiping');
  }, []);

  // Regenerate cards *after* the currently displayed card using new filters.
  // Current card never changes. Swipe history & quota are untouched.
  const applyFilters = useCallback(async (filters: FeedFilters) => {
    setFeedFilters(filters);
    setFiltersOpen(false);

    // Cards still to be shown (after current). If none, just confirm filters
    // for the next round and bail.
    const needed = Math.max(0, cards.length - (index + 1));
    if (needed === 0) {
      toast.success('Feed Updated', {
        description: 'Remaining cards have been refreshed.',
        duration: 2000,
      });
      return;
    }

    // Build seen-set so we never re-show a card the user has swiped, and
    // also exclude every card already queued (including current).
    const seen = new Set<string>();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !session.user.is_anonymous) {
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const { data: prior } = await supabase
            .from('pullorpass_swipes')
            .select('card_id')
            .eq('user_id', session.user.id)
            .range(from, from + PAGE - 1);
          if (!prior || prior.length === 0) break;
          prior.forEach((r: any) => r.card_id && seen.add(r.card_id));
          if (prior.length < PAGE) break;
          from += PAGE;
        }
      }
    } catch {}
    try {
      const local = JSON.parse(localStorage.getItem('pop_seen_card_ids') || '[]');
      if (Array.isArray(local)) local.forEach((id: string) => id && seen.add(id));
    } catch {}
    cards.forEach((c) => seen.add(c.card_id));

    const productTypes = formatsToProductTypes(filters.formats);
    let query = supabase
      .from('market_snapshots')
      .select('card_id, tcgplayer_id, name, set_name, price, rarity')
      .eq('game', 'Pokemon')
      .in('product_type', productTypes)
      .gte('price', filters.priceMin)
      .lte('price', filters.priceMax)
      .not('tcgplayer_id', 'is', null);
    if (filters.eras.length > 0) {
      query = query.in('era', filters.eras);
    }
    if (filters.languages.length > 0) {
      query = query.in('language', filters.languages);
    }
    const { data: rows, error } = await query.limit(2000);

    if (error || !rows || rows.length === 0) {
      toast.error('No cards matched those filters — try a wider range.');
      return;
    }

    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    const byId = new Map<string, any>();
    for (const c of rows) {
      if (!c.tcgplayer_id || !c.price) continue;
      if (EXCLUDE.test(c.name)) continue;
      if (seen.has(c.card_id)) continue;
      // Era + language filtered server-side via dedicated columns.
      if (!byId.has(c.card_id)) byId.set(c.card_id, c);
    }

    const pool: SwipeCard[] = Array.from(byId.values()).map((c) => ({
      card_id: c.card_id,
      name: c.name,
      set_name: c.set_name,
      image_url: tcgImage(c.tcgplayer_id),
      price: Number(c.price),
      rarity: c.rarity,
    }));

    if (pool.length === 0) {
      toast.error('No cards matched those filters — try a wider range.');
      return;
    }

    // Light shuffle + take what we need.
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, needed);
    setCards((prev) => [...prev.slice(0, index + 1), ...shuffled]);
    toast.success('✨ Feed Updated', {
      description: 'Remaining cards have been refreshed.',
      duration: 2000,
    });
  }, [cards, index]);

  const resetFilters = useCallback(() => {
    setFeedFilters(DEFAULT_FILTERS);
  }, []);

  const current = cards[index];
  const next = cards[index + 1];
  const after = cards[index + 2];

  const persistSwipeProgress = (rec: SwipeRecord, newRecords: SwipeRecord[]) => {
    // Track today's swiped cards so Matches/Earn/Profile can reflect the
    // latest swipe immediately, even if the DB write is still in flight.
    try {
      const key = 'pop_today_swiped_' + todayKey();
      const prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.push({
        card_id: rec.card.card_id,
        name: rec.card.name,
        set_name: rec.card.set_name,
        image_url: rec.card.image_url,
        price: rec.card.price,
        rarity: rec.card.rarity,
        decision: rec.decision,
        tags: rec.tags,
        client_ts: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(prev.slice(-200)));
    } catch {}

    // Persistently remember every card_id this device has ever swiped so
    // guests never see the same card twice across rounds.
    try {
      const seenKey = 'pop_seen_card_ids';
      const seenPrev: string[] = JSON.parse(localStorage.getItem(seenKey) || '[]');
      if (!seenPrev.includes(rec.card.card_id)) {
        seenPrev.push(rec.card.card_id);
        localStorage.setItem(seenKey, JSON.stringify(seenPrev.slice(-5000)));
      }
    } catch {}

    const nextIndex = index + 1;
    if (nextIndex >= cards.length) {
      clearResume();
      writeResults({ records: newRecords, roundId, cards });
    } else {
      writeResume({ cards, index: nextIndex, records: newRecords, roundId });
    }
  };

  const recordSwipe = async (rec: SwipeRecord, advanceDelay = 320) => {
    const newRecords = [...records, rec];
    setRecords(newRecords);
    bumpQuota();
    persistSwipeProgress(rec, newRecords);

    if (userId) {
      supabase.from('pullorpass_swipes').insert({
        user_id: userId,
        round_id: roundId,
        card_id: rec.card.card_id,
        card_name: rec.card.name,
        card_set: rec.card.set_name,
        card_image: rec.card.image_url,
        card_price: rec.card.price,
        card_rarity: rec.card.rarity,
        decision: rec.decision,
        tags: rec.tags,
      }).then(({ error }) => { if (error) console.error('swipe insert', error); });
      if (rec.decision === 'pull') {
        saveLike(userId, {
          card_id: rec.card.card_id,
          card_name: rec.card.name,
          set_name: rec.card.set_name,
          image_url: rec.card.image_url,
          price: rec.card.price,
          rarity: rec.card.rarity,
          source: (rec.tags || []).includes('Loved') ? 'super_like' : 'swipe',
        }).catch((e) => console.warn('saveLike failed', e));
      }
    }

    // Delay advancing so the freeze + exit animation can play.
    window.setTimeout(() => {
      if (index + 1 >= cards.length) {
        finalizeRound(newRecords);
      } else {
        setIndex(index + 1);
        setImgError(false);
        setExitDir(null);
      }
    }, advanceDelay);
  };

  const bumpQuota = () => {
    setQuota((q) => {
      const next = { ...q, used: q.used + 1, lifetime: q.lifetime + 1 };
      writeQuota(next);
      return next;
    });
    bumpSwipeStreak();
  };

  const finalizeRound = async (allRecords: SwipeRecord[]) => {
    setStage('results');
    clearResume();
    writeResults({ records: allRecords, roundId, cards });
    if (!userId) {
      // New/unauthed user just finished a round — nudge them to create an
      // account (or log in) so their picks + Collector Profile are saved.
      setShowSignupPrompt(true);
      return;
    }
    const analysis = analyzeRound(allRecords);

    // Update / upsert DNA
    const { data: existing } = await supabase
      .from('pullorpass_dna')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const tagCounts: Record<string, number> = (existing?.tag_counts as any) || {};
    analysis.topTags.forEach((t) => { tagCounts[t.tag] = (tagCounts[t.tag] ?? 0) + t.count; });

    await supabase.from('pullorpass_dna').upsert({
      user_id: userId,
      tag_counts: tagCounts,
      traits: { topTrait: analysis.topTrait },
      pull_count: (existing?.pull_count ?? 0) + analysis.pulls,
      pass_count: (existing?.pass_count ?? 0) + analysis.passes,
      rounds_completed: (existing?.rounds_completed ?? 0) + 1,
      archetype: analysis.archetype?.name ?? null,
    });
  };

  const triggerAnim = (type: 'pull' | 'love' | 'pass') => {
    setFlyAnim({ type, key: Date.now() });
    setTimeout(() => setFlyAnim(null), 400);
  };

  const shouldTriggerMatch = () => {
    // Only during the first 20 reviews, max 2 matches per session,
    // never on the very first card, ~18% chance after that.
    if (index === 0) return false;
    if (index >= 20) return false;
    if (matchCount >= 2) return false;
    // Spacing: don't fire two in a row
    const lastRec = records[records.length - 1];
    if (lastRec && (lastRec as any).matched) return false;
    return Math.random() < 0.18;
  };

  const handlePull = () => {
    if (!current) return;
    if (outOfSwipes) { setSwipeBlocked(true); return; }
    triggerAnim('pull');
    setExitDir('right');
    const matched = shouldTriggerMatch();
    const pulledCard = current;
    if (matched) {
      setMatchCount((c) => c + 1);
      const rec: SwipeRecord = { card: pulledCard, decision: 'pull', tags: ['Match'] };
      const newRecords = [...records, rec];
      setRecords(newRecords);
      bumpQuota();
      persistSwipeProgress(rec, newRecords);
      if (userId) {
        supabase.from('pullorpass_swipes').insert({
          user_id: userId,
          round_id: roundId,
          card_id: rec.card.card_id,
          card_name: rec.card.name,
          card_set: rec.card.set_name,
          card_image: rec.card.image_url,
          card_price: rec.card.price,
          card_rarity: rec.card.rarity,
          decision: rec.decision,
          tags: rec.tags,
        }).then(({ error }) => { if (error) console.error('swipe insert', error); });
        saveLike(userId, {
          card_id: rec.card.card_id,
          card_name: rec.card.name,
          set_name: rec.card.set_name,
          image_url: rec.card.image_url,
          price: rec.card.price,
          rarity: rec.card.rarity,
          source: 'swipe',
        }).catch((e) => console.warn('saveLike failed', e));
      }

      // First match of the day → full celebratory overlay (tutorial moment).
      // Subsequent matches → lightweight, non-blocking pulse so flow keeps moving.
      const FIRST_MATCH_KEY = 'pop_first_match_date';
      let isFirstToday = false;
      try {
        isFirstToday = localStorage.getItem(FIRST_MATCH_KEY) !== todayKey();
        if (isFirstToday) localStorage.setItem(FIRST_MATCH_KEY, todayKey());
      } catch {}

      if (isFirstToday) {
        window.setTimeout(() => setMatchCard(pulledCard), 450);
        setPendingMatchAdvance(() => () => {
          if (index + 1 >= cards.length) {
            finalizeRound(newRecords);
          } else {
            setIndex(index + 1);
            setImgError(false);
            setExitDir(null);
          }
        });
      } else {
        // Quick microinteraction; advance immediately so swiping stays fast.
        setMatchPulse({ key: Date.now() });
        window.setTimeout(() => setMatchPulse(null), 900);
        if (index + 1 >= cards.length) {
          finalizeRound(newRecords);
        } else {
          setIndex(index + 1);
          setImgError(false);
          setExitDir(null);
        }
      }
    } else {
      recordSwipe({ card: pulledCard, decision: 'pull', tags: [] });
    }
  };

  const dismissMatch = () => {
    setMatchCard(null);
    if (pendingMatchAdvance) {
      pendingMatchAdvance();
      setPendingMatchAdvance(null);
    }
  };

  const handlePass = () => {
    if (!current) return;
    if (outOfSwipes) { setSwipeBlocked(true); return; }
    triggerAnim('pass');
    setExitDir('left');
    recordSwipe({ card: current, decision: 'pass', tags: [] });
  };

  const handleLove = () => {
    if (!current) return;
    if (outOfSwipes) { setSwipeBlocked(true); return; }
    triggerAnim('love');
    setExitDir('up');
    recordSwipe({ card: current, decision: 'pull', tags: ['Loved'] });
  };

  const handleSwipeDir = (dir: SwipeDir) => {
    if (dir === 'left') handlePass();
    else if (dir === 'right') handlePull();
    else handleLove();
  };

  return (
    <>
      <Seo
        title="Pull or Pass — Train Your DNA Profile | PokeIQ"
        description="React to Pokémon cards on instinct. Pull or Pass quietly learns what your eye gravitates toward — your evolving DNA Profile."
      />
      <div className={`relative bg-background flex flex-col ${stage === 'results' && !outOfSwipes ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>

        <main className={`flex-1 min-h-0 w-full mx-auto py-3 flex-col select-none flex md:items-center md:justify-start ${stage === 'results' && !outOfSwipes ? 'overflow-y-auto max-w-none px-0' : 'max-w-2xl px-4'}`}>
          <MatchOverlay card={matchCard} onDismiss={dismissMatch} />
          <MatchPulse event={matchPulse} />
          {stage === 'intro' && (
            <IntroScreen
              onStart={() => {
                try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch {}
                loadRound();
              }}
              onAuth={() => navigate('/auth', { state: { from: '/swipe' } })}
              isAuthed={!!userId}
            />
          )}
          {stage === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground text-center px-6">
              <img
                src={dittoDancing.url}
                alt="Dancing Ditto"
                className="w-32 h-32 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
              <p className="text-sm">Loading 20 randomized cards to start mapping your collector DNA</p>
            </div>
          )}

          {stage === 'swiping' && current && (
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div className={(outOfSwipes && swipeBlocked) ? 'pointer-events-none select-none opacity-30 blur-[2px] flex-1 min-h-0 flex flex-col transition-all duration-300' : 'flex-1 min-h-0 flex flex-col'}>
              {/* Progress + quota */}
              <div className="flex items-center justify-between mb-3 gap-3">
                <span className="text-sm font-medium text-muted-foreground tabular-nums">
                  Card <span className="text-foreground font-semibold">{index + 1}</span>
                  <span className="text-muted-foreground/60"> / {cards.length}</span>
                </span>
                <div className="flex items-center gap-2">
                   {userId && (
                     <>
                       {hasFilterAccess ? (
                         <button
                           type="button"
                           onClick={() => setFiltersOpen(true)}
                           className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-primary hover:text-primary/80 transition-colors"
                         >
                           <SlidersHorizontal className="w-3 h-3" /> Filter
                         </button>
                       ) : (
                         <button
                           type="button"
                           onClick={() => setInviteOpen(true)}
                           className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground hover:text-foreground transition-colors"
                           title="Invite a friend to unlock filters"
                         >
                           <Lock className="w-3 h-3" /> Filter
                         </button>
                       )}
                       <span className="text-muted-foreground/40">·</span>
                     </>
                   )}
                   <Link
                     to="/matches"
                     className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-primary hover:text-primary/80 transition-colors"
                   >
                     <Layers className="w-3 h-3" /> Matches
                   </Link>
                  <span className="text-muted-foreground/40">·</span>
                  {premiumLoading ? null : premium ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950">
                      <Crown className="w-3 h-3" /> Unlimited
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 tabular-nums">
                      {remaining} left
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden mb-4 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-purple-400 shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
                  initial={false}
                  animate={{ width: `${(index / cards.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>

              {/* Card stack */}
              {/* Branded game title */}
              <div className="relative flex flex-col items-center justify-center text-center mt-0 mb-2 select-none">
                {/* Animated glow backdrop */}
                <motion.div
                  aria-hidden
                  className="absolute inset-0 -z-10 pointer-events-none blur-2xl"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, hsl(var(--primary) / 0.35), transparent 65%)',
                  }}
                  animate={{ opacity: [0.55, 0.95, 0.55], scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* Light streaks */}
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 pointer-events-none opacity-40 mix-blend-screen"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(115deg, transparent 0 14px, hsl(var(--primary) / 0.08) 14px 15px)',
                    maskImage:
                      'radial-gradient(ellipse at center, black 30%, transparent 75%)',
                  }}
                />
                <div className="inline-flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.9)] animate-pulse" />
                  <motion.h1
                    className="font-black uppercase tracking-[0.18em] text-3xl sm:text-4xl md:text-5xl leading-none bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
                      backgroundSize: '250% 100%',
                      WebkitTextStroke: '1px hsl(var(--primary) / 0.25)',
                      filter: 'drop-shadow(0 0 14px hsl(var(--primary) / 0.55))',
                    }}
                    animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  >
                    Pull or Pass
                  </motion.h1>
                  <Sparkles className="w-4 h-4 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.9)] animate-pulse" />
                </div>
                <p className="mt-1.5 text-[11px] sm:text-xs uppercase tracking-[0.32em] text-muted-foreground/80">
                  A game by <span className="text-primary/90 font-semibold">PokeIQ</span>
                </p>
              </div>

              {/* Card stack */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-start gap-3 relative">
                <SwipeAnimationLayer anim={flyAnim} />
                <div
                  className="relative aspect-[2.5/3.5] w-auto"
                  style={{ touchAction: 'none', height: 'min(56vh, 420px)' }}
                >
                  {/* Soft ambient glow behind the card */}
                  <div className="absolute -inset-8 rounded-[2.5rem] bg-primary/20 blur-3xl pointer-events-none -z-10" />
                  <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-purple-500/15 blur-2xl pointer-events-none -z-10" />
                  {/* Behind cards — stable keys so they smoothly promote forward */}
                  {after && (
                    <StackCardShell key={after.card_id} offset={2}>
                      <CardArt card={after} />
                    </StackCardShell>
                  )}
                  {next && (
                    <StackCardShell key={next.card_id} offset={1}>
                      <CardArt card={next} />
                    </StackCardShell>
                  )}
                  {/* Top draggable card */}
                  <DraggableCard
                    key={current.card_id + '-' + index}
                    card={current}
                    onSwipe={handleSwipeDir}
                    exitDir={exitDir}
                  />
                </div>

                <div className="text-center space-y-1.5 mt-4 sm:mt-5">
                  <div className="flex items-center justify-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-none">
                      {current.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setDetailSeed({
                        card_id: current.card_id,
                        card_name: current.name,
                        set_name: current.set_name,
                        image_url: current.image_url,
                        price: current.price,
                        rarity: current.rarity,
                      })}
                      className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary hover:text-primary/80 transition-colors px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:shadow-[0_0_14px_hsl(var(--primary)/0.35)]"
                      aria-label="View card details"
                    >
                      Details
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground/90 font-medium">
                    <span>{current.set_name ?? 'Unknown set'}</span>
                    <span className="mx-2 text-primary/60">•</span>
                    <span className="text-foreground/90">${current.price.toFixed(2)}</span>
                    {current.rarity && (
                      <>
                        <span className="mx-2 text-primary/60">•</span>
                        <span>{current.rarity}</span>
                      </>
                    )}
                  </p>
                </div>

                <>
                  <div className="flex items-end justify-center gap-7 sm:gap-10 pt-1">
                    <ActionButton
                      onClick={handlePass}
                      label="Pass"
                      ariaLabel="Pass"
                      icon={<X className="w-6 h-6" strokeWidth={3} />}
                      tone="pass"
                    />
                    <ActionButton
                      onClick={handleLove}
                      label="Love"
                      ariaLabel="Love"
                      icon={<Star className="w-6 h-6 fill-current" />}
                      tone="love"
                    />
                    <ActionButton
                      onClick={handlePull}
                      label="Pull"
                      ariaLabel="Pull"
                      icon={<Heart className="w-6 h-6 fill-current" />}
                      tone="pull"
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 font-medium">
                    Swipe left to pass <span className="mx-1.5 text-primary/60">•</span> Swipe right to pull
                  </p>
                </>
              </div>
              </div>
            </div>
          )}

          {stage === 'results' && (
            <ResultsView
              records={records}
              onPlayAgain={() => { if (!outOfSwipes) loadRound(); }}
              isAuthed={!!userId}
              onSignUp={() => navigate('/auth', { state: { from: '/swipe' } })}
              outOfSwipes={outOfSwipes}
              premium={premium}
              remaining={remaining}
            />
          )}
        </main>

        {/* Mid-session signup nudge after first 20 lifetime swipes */}
        <AnimatePresence>
          {showSignupPrompt && (
            <SignupNudge
              onClose={() => setShowSignupPrompt(false)}
              onSignUp={() => navigate('/auth', { state: { from: '/swipe' } })}
              onLogin={() => navigate('/auth', { state: { from: '/swipe', mode: 'login' } })}
            />
          )}
        </AnimatePresence>
        <CardDetailModal open={!!detailSeed} seed={detailSeed} onClose={() => setDetailSeed(null)} />
        <FeedFiltersDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          initial={feedFilters}
          remainingCount={Math.max(0, cards.length - (index + 1))}
          onApply={applyFilters}
          onReset={resetFilters}
        />
        {userId && (
          <InviteFriendModal
            open={inviteOpen}
            onOpenChange={(v) => { setInviteOpen(v); if (!v) refreshFilterAccess(); }}
            userId={userId}
            completedReferrals={completedReferrals}
          />
        )}
        <AnimatePresence>
          {outOfSwipes && stage !== 'intro' && stage !== 'loading' && (stage !== 'swiping' || swipeBlocked) && (
            <OutOfSwipesModal
              credits={credits}
              canRedeem={canRedeem}
              onRedeem={redeemSwipes}
              redeeming={redeeming}
              isAuthed={!!userId}
              onSignUp={() => navigate('/auth', { state: { from: '/swipe' } })}
              showProNudge={showProNudge}
              onKeepTraining={() => {
                try { sessionStorage.setItem(PRO_NUDGE_DISMISSED_KEY, '1'); } catch {}
                setProNudgeDismissed(true);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Swipe direction animations (heart / super-star / X)
// ─────────────────────────────────────────────────────────
function SwipeAnimationLayer({ anim }: { anim: { type: 'pull' | 'love' | 'pass'; key: number } | null }) {
  return (
    <AnimatePresence>
      {anim && (
        <motion.div
          key={anim.key}
          className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {anim.type === 'pull' && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.3, 1.1], rotate: [0, 10, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="w-40 h-40 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_80px_rgba(16,185,129,0.9)]">
                <Check className="w-24 h-24 text-white" strokeWidth={4} />
              </div>
            </motion.div>
          )}
          {anim.type === 'love' && (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: [0, 1.8, 1.5], rotate: [0, 20, -10, 0] }}
                exit={{ scale: [1.5, 2.5], opacity: 0, y: -120 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              >
                <Star className="w-44 h-44 text-amber-400 fill-amber-400 drop-shadow-[0_0_60px_rgba(251,191,36,0.9)]" />
              </motion.div>
              {/* sparkle burst */}
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const dx = Math.cos(angle) * 140;
                const dy = Math.sin(angle) * 140;
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
                    animate={{ opacity: 0, x: dx, y: dy, scale: 1.2 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  >
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </motion.div>
                );
              })}
            </>
          )}
          {anim.type === 'pass' && (
            <motion.div
              initial={{ scale: 0, rotate: 20 }}
              animate={{ scale: [0, 1.3, 1.1], rotate: [0, -10, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="w-40 h-40 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_80px_rgba(239,68,68,0.9)]">
                <X className="w-24 h-24 text-white" strokeWidth={4} />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
// Card stack subcomponents
// ─────────────────────────────────────────────────────────

function StackCardShell({ offset, children }: { offset: number; children: React.ReactNode }) {
  // Behind cards: scaled down, pushed down, dimmed.
  // Animated so when index advances they smoothly glide forward.
  const scale = 1 - offset * 0.05;
  const y = offset * 14;
  const opacity = offset === 1 ? 0.9 : 0.6;
  return (
    <motion.div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-muted/30 shadow-xl"
      initial={{ scale: scale - 0.04, y: y + 10, opacity: 0 }}
      animate={{ scale, y, opacity }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.6 }}
      style={{ zIndex: 10 - offset }}
    >
      {children}
    </motion.div>
  );
}

function CardArt({ card }: { card: SwipeCard }) {
  const [err, setErr] = React.useState(false);
  if (!card.image_url || err) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-muted/30">
        <ImageOff className="w-10 h-10" />
        <span className="text-xs">No image</span>
      </div>
    );
  }
  return (
    <img
      src={card.image_url}
      alt={card.name}
      draggable={false}
      className="w-full h-full object-cover pointer-events-none"
      onError={() => setErr(true)}
    />
  );
}

// Tactile, color-coded swipe action button with press + glow feedback.
function ActionButton({
  onClick,
  label,
  ariaLabel,
  icon,
  tone,
}: {
  onClick: () => void;
  label: string;
  ariaLabel: string;
  icon: React.ReactNode;
  tone: 'pass' | 'love' | 'pull';
}) {
  const toneStyles = {
    pass: {
      btn: 'bg-zinc-900/80 border-zinc-700/80 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:shadow-[0_0_22px_rgba(255,255,255,0.08)]',
      label: 'text-muted-foreground',
    },
    love: {
      btn: 'bg-amber-500/10 border-amber-400/60 text-amber-300 hover:bg-amber-400/15 hover:border-amber-300 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]',
      label: 'text-amber-300/90',
    },
    pull: {
      btn: 'bg-primary text-primary-foreground border-primary/80 shadow-[0_0_24px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_38px_hsl(var(--primary)/0.8)] hover:bg-primary/95',
      label: 'text-primary',
    },
  }[tone];

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        className={`rounded-full h-16 w-16 sm:h-[68px] sm:w-[68px] border-2 flex items-center justify-center transition-shadow transition-colors ${toneStyles.btn}`}
      >
        {icon}
      </motion.button>
      <span className={`text-[10px] uppercase tracking-[0.22em] font-bold ${toneStyles.label}`}>
        {label}
      </span>
    </div>
  );
}

function DraggableCard({
  card,
  onSwipe,
  disabled,
  exitDir,
}: {
  card: SwipeCard;
  onSwipe: (dir: SwipeDir) => void;
  disabled?: boolean;
  exitDir?: SwipeDir | null;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  // Overlays begin fading in almost immediately on drag, then ramp up quickly
  // so they're fully visible at roughly half the previous distance.
  const passOpacity = useTransform(x, [-45, -20, -4, 0], [1, 0.55, 0.12, 0]);
  const passScale = useTransform(x, [-60, -20, 0], [1.3, 0.85, 0.6]);
  const pullOpacity = useTransform(x, [0, 4, 20, 45], [0, 0.12, 0.55, 1]);
  const pullScale = useTransform(x, [0, 20, 60], [0.6, 0.85, 1.3]);
  const loveOpacity = useTransform(y, [-45, -20, -4, 0], [1, 0.55, 0.12, 0]);

  const [frozen, setFrozen] = React.useState<{ x: number; y: number; rot: number } | null>(null);

  // Mobile/touch users get an amplified horizontal drag so swipes feel more
  // responsive to thumb movement. Desktop mouse behavior is unchanged.
  const isTouch = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    []
  );
  const X_MULTIPLIER = isTouch ? 1.25 : 1;
  const touchThreshold = isTouch ? 88 : SWIPE_THRESHOLD;

  const handleDrag = (_: any, info: PanInfo) => {
    if (!isTouch) return;
    x.set(info.offset.x * X_MULTIPLIER);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { x: rawDx, y: dy } = info.offset;
    const dx = rawDx * X_MULTIPLIER;
    const { x: vx, y: vy } = info.velocity;
    const fastUp = vy < -500 || dy < -SWIPE_THRESHOLD;
    const fastRight = vx > 500 || dx > touchThreshold;
    const fastLeft = vx < -500 || dx < -touchThreshold;

    const willSwipe = (fastUp && Math.abs(dy) > Math.abs(dx)) || fastRight || fastLeft;
    if (willSwipe) {
      // Freeze card at its current released position before exit animation.
      setFrozen({ x: x.get(), y: y.get(), rot: (rotate as any).get() });
    }

    if (fastUp && Math.abs(dy) > Math.abs(dx)) {
      onSwipe('up');
    } else if (fastRight) {
      onSwipe('right');
    } else if (fastLeft) {
      onSwipe('left');
    }
    // else snap back (framer handles it)
  };

  const exitX = exitDir === 'right' ? 800 : exitDir === 'left' ? -800 : 0;
  const exitY = exitDir === 'up' ? -900 : 0;
  const exitRot = exitDir === 'right' ? 25 : exitDir === 'left' ? -25 : 0;

  const buildExitAnimate = () => {
    if (!exitDir) return { opacity: 1, scale: 1 };
    const fx = frozen?.x ?? 0;
    const fy = frozen?.y ?? 0;
    const fr = frozen?.rot ?? 0;
    return {
      x: [fx, fx, exitX],
      y: [fy, fy, exitY],
      rotate: [fr, fr, exitRot],
      opacity: [1, 1, 0],
      transition: {
        duration: 0.38,
        times: [0, 0.2, 1],
        ease: 'easeIn',
      },
    } as any;
  };

  return (
    <motion.div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-muted/30 shadow-2xl cursor-grab active:cursor-grabbing"
      style={exitDir ? { zIndex: 20, touchAction: 'none' } : { x, y, rotate, zIndex: 20, touchAction: 'none' }}
      drag={disabled || exitDir ? false : true}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0.85, scale: 0.95, y: 14 }}
      animate={buildExitAnimate()}
      transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 0.6 }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <CardArt card={card} />

      {/* Directional drag overlays */}
      <motion.div
        style={{ opacity: pullOpacity, scale: pullScale }}
        className="absolute top-1/2 right-6 -translate-y-1/2 w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.7)] pointer-events-none"
      >
        <Check className="w-12 h-12 text-white" strokeWidth={4} />
      </motion.div>
      <motion.div
        style={{ opacity: passOpacity, scale: passScale }}
        className="absolute top-1/2 left-6 -translate-y-1/2 w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.7)] pointer-events-none"
      >
        <X className="w-12 h-12 text-white" strokeWidth={4} />
      </motion.div>
      <motion.div
        style={{ opacity: loveOpacity }}
        className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-md border-2 border-amber-400 text-amber-400 font-bold tracking-widest bg-background/50 backdrop-blur-sm pointer-events-none"
      >
        LOVE
      </motion.div>
    </motion.div>
  );
}

export function ResultsView({
  records,
  onPlayAgain,
  isAuthed,
  onSignUp,
  outOfSwipes,
  premium,
  remaining,
}: {
  records: SwipeRecord[];
  onPlayAgain: () => void;
  isAuthed: boolean;
  onSignUp: () => void;
  outOfSwipes?: boolean;
  premium?: boolean;
  remaining?: number;
}) {
  const a = analyzeRound(records);
  const pulled = records.filter((r) => r.decision === 'pull');
  const passed = records.filter((r) => r.decision === 'pass');

  const displayArchetype =
    a.archetype?.name?.replace(/^The /, '') ?? 'Nostalgic Chaos Collector';
  const archetypeDesc =
    a.archetype?.tagline ??
    "You're drawn to iconic Pokémon, vintage energy, and bold expressive artwork that hits with nostalgia.";
  const tagList = (a.topTags.length
    ? a.topTags.map((t) => t.tag)
    : ['Vintage Nostalgia', 'Bold & Dynamic Art', 'Gen 1 Love', 'High Energy', 'Holo & Shine', 'Chaos Energy', 'Iconic Pokémon', 'Expressive Artwork']
  ).slice(0, 8);
  const completion = Math.min(100, Math.round(((records.length) / 100) * 100));

  // Build a sparse LikedCard[] from this round's pulls so we can fetch
  // *different* but stylistically related recommendations.
  const likedAsRich: LikedCard[] = useMemo(
    () =>
      pulled.map((r) => ({
        id: r.card.card_id,
        user_id: '',
        card_id: r.card.card_id,
        card_name: r.card.name,
        pokemon_name: extractPokemonName(r.card.name),
        artist: null,
        set_name: r.card.set_name,
        set_id: null,
        era: classifyEra(r.card.set_name)?.id ?? null,
        release_year: null,
        card_type: null,
        pokemon_type: null,
        rarity: r.card.rarity,
        language: null,
        card_number: null,
        variant: null,
        product_category: null,
        price: r.card.price,
        price_tier: priceTier(r.card.price),
        image_url: r.card.image_url,
        source: 'swipe',
        liked_at: '',
      })),
    [pulled]
  );

  const [recs, setRecs] = useState<RecommendedCard[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setRecsLoading(true);
    if (likedAsRich.length === 0) {
      setRecs([]);
      setRecsLoading(false);
      return;
    }
    recommendForUser(likedAsRich, 12)
      .then((r) => { if (alive) setRecs(r); })
      .catch(() => { if (alive) setRecs([]); })
      .finally(() => { if (alive) setRecsLoading(false); });
    return () => { alive = false; };
  }, [likedAsRich]);

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  } as const;

  return (
    <div className="flex-1 flex flex-col w-full max-w-[1400px] px-4 lg:px-12 sm:px-0 py-[32px] mx-0 my-[19px] gap-[13px]">
      {/* ── SECTION 1: Hero ───────────────────────────────────── */}
      <motion.section {...fadeUp} className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="inline-flex flex-col items-center gap-1"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full" />
            <Trophy className="relative w-8 h-8 text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.7)]" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Your Matches</p>
        </motion.div>
        {!isAuthed ? (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Your DNA Profile Is Taking Shape <span className="inline-block">✨</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Every swipe teaches PokeIQ what you naturally love — not just what's valuable.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Your Matches <span className="inline-block">✨</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Here's how your taste sharpened this round.
            </p>
          </>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-5 pt-4 max-w-5xl mx-auto">
          <StatGlowCard
            icon={<Heart className="w-5 h-5 fill-primary text-primary" />}
            tint="primary"
            value={String(a.pulls)}
            label="Liked"
            sub="Cards you connected with"
          />
          <StatGlowCard
            icon={<X className="w-5 h-5 text-purple-400" />}
            tint="purple"
            value={String(a.passes)}
            label="Passed"
            sub="Cards you didn't vibe with"
          />
          <StatGlowCard
            icon={<DollarSign className="w-5 h-5 text-amber-400" />}
            tint="amber"
            value={`$${a.avgPullPrice.toFixed(0)}`}
            label="Avg Value Preference"
            sub="Your sweet spot"
          />
          <StatGlowCard
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            tint="flame"
            value={`${readSwipeStreak().streak}d`}
            label="Daily Streak"
            sub="Swipe every day to grow it"
          />
        </div>

        {/* Swipe Again CTA — hidden for guests; we want them to sign up first */}
        {isAuthed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="pt-6 px-0 mx-0 py-[19px]"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-6 sm:gap-8">
            <Link to="/profile" className="inline-flex">
              <motion.button
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="h-14 w-full sm:w-auto px-10 rounded-2xl bg-primary text-primary-foreground font-bold text-base tracking-wide inline-flex items-center justify-center gap-3 shadow-[0_0_32px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_48px_hsl(var(--primary)/0.8)] transition-shadow"
              >
                <UserIcon className="w-5 h-5" />
                View Profile
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onPlayAgain}
              disabled={outOfSwipes}
              className="h-14 px-10 rounded-2xl bg-card/60 backdrop-blur border border-primary/40 text-foreground font-semibold text-base tracking-wide inline-flex items-center justify-center gap-3 hover:border-primary/70 hover:bg-primary/10 transition-colors shadow-[0_0_28px_-10px_hsl(var(--primary)/0.5)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCw className="w-5 h-5 text-primary" />
              Swipe Again
            </motion.button>
          </div>
          {outOfSwipes && (
            <p className="mt-2.5 text-xs text-muted-foreground">
              You're out of swipes — go to{' '}
              <Link to="/earn" className="text-primary underline underline-offset-2 hover:text-primary/80">Earn Credits</Link>{' '}
              or upgrade to Premium.
            </p>
          )}
        </motion.div>
        )}
      </motion.section>

      {/* ── SECTION 2: Liked vs Disliked ──────────────────────── */}
      <motion.section {...fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LikedDislikedPanel
          tint="primary"
          label="Liked"
          icon={<Heart className="w-4 h-4 fill-primary text-primary" />}
          count={pulled.length}
          records={pulled}
          glow
          viewProfileHref={isAuthed ? '/profile' : undefined}
        />
        <LikedDislikedPanel
          tint="purple"
          label="Disliked"
          icon={<X className="w-4 h-4 text-purple-400" />}
          count={passed.length}
          records={passed}
        />
      </motion.section>

      {/* ── This or That CTA — shown to signed-in users with previous matches ─── */}
      {isAuthed && (
        <motion.section {...fadeUp}>
          <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-purple-500/10 p-6 sm:p-8 overflow-hidden shadow-xl">
            <div className="absolute -top-24 -right-24 w-[320px] h-[320px] bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[11px] font-semibold uppercase tracking-wider text-primary mb-3">
                  <Flame className="w-3.5 h-3.5" /> New
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                  Play This or That
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl">
                  See 20 head-to-head Pokémon card matchups. Pick your favorite each time and help PokeIQ rank your preferences and learn what makes you unique as a collector.
                </p>
              </div>
              <Link to="/this-or-that" className="shrink-0">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Zap className="w-4 h-4" /> Play now <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── SECTION 4: Your Collection Awaits (authed → /profile, guest → /auth) + binder hero for guests ─── */}
      <motion.section {...fadeUp}>
        {!isAuthed && (
          <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-purple-500/10 p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl">
            <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-primary/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-10 lg:gap-14 items-center">
              {/* Left: layered profile + binder + matches previews */}
              <div className="relative h-[280px] sm:h-[340px]">
                {/* Profile preview card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 }}
                  className="absolute left-0 top-0 w-[55%] rounded-xl border border-white/10 bg-zinc-950/90 p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">Your Profile</p>
                      <p className="text-sm font-bold text-foreground truncate">{displayArchetype}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tagList.slice(0, 4).map((t) => (
                      <span key={t} className="px-2 py-0.5 text-[10px] rounded-full border border-primary/40 bg-primary/10 text-primary">{t}</span>
                    ))}
                  </div>
                </motion.div>

                {/* Binder preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 }}
                  className="absolute right-0 top-6 w-[55%] rounded-xl border border-white/10 bg-zinc-950/90 p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur"
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-300" />
                    <p className="text-[10px] uppercase tracking-widest text-purple-300 font-semibold">Your Binder</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const r = pulled[idx];
                      return (
                        <div key={idx} className="aspect-[2.5/3.5] rounded-sm overflow-hidden bg-muted/30 border border-white/5">
                          {r?.card?.image_url ? (
                            <img src={r.card.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                              <ImageOff className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Matches preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 }}
                  className="absolute left-6 bottom-0 w-[60%] rounded-xl border border-white/10 bg-zinc-950/90 p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur"
                >
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Heart className="w-3.5 h-3.5 fill-primary text-primary" />
                  </div>
                  <div className="flex gap-1.5">
                    {(recs.length ? recs : pulled.map((p) => ({ image_url: p.card.image_url, card_id: p.card.card_id }))).slice(0, 4).map((c: any, i) => (
                      <div key={c.card_id ?? i} className="flex-1 aspect-[2.5/3.5] rounded-sm overflow-hidden bg-muted/30 border border-white/5">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                            <ImageOff className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Right: copy + CTA */}
              <div className="space-y-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-primary font-semibold">
                  Your Collection Awaits
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-[1.05]">
                  Go to Your Profile and<br />See Your Matches
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed">
                  View all your liked cards, your evolving custom binder, and deeper insights built around your unique collector DNA.
                </p>
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (isAuthed) {
                      window.location.assign('/profile');
                    } else {
                      onSignUp();
                    }
                  }}
                  className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide inline-flex items-center gap-2 shadow-[0_0_28px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_44px_hsl(var(--primary)/0.8)] transition-shadow"
                >
                  {isAuthed ? 'Go To Your Profile' : 'Create Your Account'}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        )}
        {!isAuthed && (
        <div className="relative rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-6 sm:p-8 lg:p-10 overflow-hidden shadow-2xl">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-primary/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-center">
            {/* Left: binder mockup with two pages of 4 cards each */}
            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.18),transparent_70%)] blur-2xl pointer-events-none" />
              <div className="relative rounded-xl bg-gradient-to-b from-zinc-800/60 to-black p-3 sm:p-4 border border-white/10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[0, 1].map((page) => (
                    <div
                      key={page}
                      className="grid grid-cols-2 gap-2 p-2 sm:p-3 rounded-md bg-black/40 border border-white/5"
                    >
                      {Array.from({ length: 4 }).map((_, idx) => {
                        const cardIdx = page * 4 + idx;
                        const r = pulled[cardIdx];
                        return (
                          <div
                            key={idx}
                            className="relative aspect-[2.5/3.5] rounded-sm overflow-hidden bg-muted/30 border border-white/5"
                          >
                            {r?.card?.image_url ? (
                              <img src={r.card.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                                <ImageOff className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: headline + 3 feature pills */}
            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary font-semibold">
                Your Future Collection
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.1]">
                Create a custom binder shaped by your taste
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                PokeIQ automatically organizes your favorite cards into a personalized digital binder built around your unique collector identity.
              </p>
              <div className="grid grid-cols-3 gap-3 sm:gap-5 pt-2">
                <BinderPill
                  icon={<BookOpen className="w-5 h-5" />}
                  title="Auto-organized"
                  sub="by sets & themes"
                  tint="primary"
                />
                <BinderPill
                  icon={<Wand2 className="w-5 h-5" />}
                  title="Matches your"
                  sub="unique taste"
                  tint="purple"
                />
                <BinderPill
                  icon={<TrendingUpIcon className="w-5 h-5" />}
                  title="Evolves as you"
                  sub="swipe more"
                  tint="primary"
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </motion.section>

      {/* ── SECTION 5: Hand-picked recommendations row ────────── */}
      {!isAuthed && (
      <motion.section {...fadeUp} className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Hand-picked For You</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">Hand-picked Cards Based On Your Preference</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            A mix of cards you liked and new discoveries tailored to your taste.
          </p>
          <p className="text-xs text-primary/80 mt-1 italic">
            This is just a sample — accuracy will increase as you swipe more.
          </p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recsLoading && recs.length === 0 ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-[180px] sm:w-[200px] shrink-0 aspect-[2.5/3.5] rounded-lg bg-muted/20 border border-white/5 animate-pulse"
              />
            ))
          ) : recs.length > 0 ? (
            recs.slice(0, 12).map((c, i) => (
              <RecommendedRecCard key={c.card_id} card={c} match={Math.max(70, 98 - i * 2)} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-8 px-2">
              Like a few more cards to unlock personalized picks.
            </p>
          )}
        </div>
      </motion.section>
      )}

      {/* ── SECTION 6: Sign Up (guests) OR Premium upsell (authed, non-premium) ─ */}
      {!isAuthed && (
      <motion.section {...fadeUp}>
        <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-[#0a1414] via-card to-[#0a0a14] p-8 sm:p-10 lg:p-12 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[460px] h-[460px] bg-primary/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-[460px] h-[460px] bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative flex flex-col items-center text-center gap-8">
            {/* TOP: recommendation accuracy meter */}
            <div className="flex flex-col items-center gap-3">
              <CircularMeter value={completion} />
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.24em] text-primary font-semibold">Recommendation Accuracy</p>
                <p className="text-xs text-muted-foreground max-w-[220px] leading-snug">
                  Sharpens with every swipe.
                </p>
              </div>
            </div>

            {/* MIDDLE: benefits */}
            <div className="space-y-4 flex flex-col items-center">
              <p className="text-[11px] uppercase tracking-[0.24em] text-purple-300 font-semibold">What You Unlock</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mx-auto">
                {[
                  'Save your collector profile',
                  'Build your custom binder',
                  'Get smarter recommendations',
                  '50 free swipes a day',
                  'Learn more about you as a collector',
                  'Organize your dream collection',
                ].map((s) => (
                  <li key={s} className="flex items-center gap-3 text-[15px] text-foreground/90 text-left">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* BOTTOM: dominant CTA */}
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
                Ready for another round?
              </h3>
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-2xl opacity-70 pointer-events-none" />
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSignUp}
                  className="relative h-14 px-12 rounded-2xl bg-primary text-primary-foreground font-bold text-base tracking-wide inline-flex items-center justify-center gap-2 shadow-[0_0_32px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_52px_hsl(var(--primary)/0.9)] transition-shadow whitespace-nowrap"
                >
                  Sign Up Now
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
              <p className="text-xs text-muted-foreground">It's free and only takes a moment.</p>
            </div>
          </div>
        </div>
      </motion.section>
      )}

      {/* Play Another Round (premium only) — daily-limit widget moved to /profile */}
      {isAuthed && premium && (
        <motion.section {...fadeUp}>
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm text-muted-foreground">PokeIQ Premium · unlimited swipes unlocked.</p>
            <Button onClick={onPlayAgain} size="lg" className="gap-2 min-w-[280px]">
              <RotateCw className="w-4 h-4" />
              Play Another Round
            </Button>
          </div>
        </motion.section>
      )}

      {/* Daily Limit Widget — bottom of matches for both guests and authed users */}
      <DailyLimitWidget />
    </div>
  );
}

/* ─── Helpers for the redesigned results page ─────────────── */

function ResetCountdown() {
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
    <div className="inline-flex items-center gap-2 px-4 h-11 rounded-xl border border-purple-400/30 bg-purple-500/5 text-sm text-foreground/90">
      <RotateCw className="w-3.5 h-3.5 text-purple-300" />
      <span>Daily swipes reset in <span className="font-semibold text-purple-200 tabular-nums">{h}h {m}m</span></span>
    </div>
  );
}

function InlineResetCountdown() {
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
  return <span className="font-semibold text-purple-200 tabular-nums">{h}h {m}m</span>;
}

function StatGlowCard({
  icon, value, label, sub, tint,
}: {
  icon: React.ReactNode; value: string; label: string; sub: string;
  tint: 'primary' | 'purple' | 'amber' | 'flame';
}) {
  const ring =
    tint === 'primary' ? 'border-primary/25 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.25)]'
    : tint === 'purple' ? 'border-purple-500/25 hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]'
    : tint === 'amber' ? 'border-amber-400/25 hover:border-amber-300/50 hover:shadow-[0_0_30px_rgba(251,191,36,0.22)]'
    : 'border-orange-500/30 hover:border-orange-400/60 hover:shadow-[0_0_30px_rgba(249,115,22,0.28)]';
  const iconBg =
    tint === 'primary' ? 'bg-primary/10'
    : tint === 'purple' ? 'bg-purple-500/10'
    : tint === 'amber' ? 'bg-amber-400/10'
    : 'bg-orange-500/10';
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`rounded-xl border ${ring} bg-card/60 p-3 sm:p-5 transition-all duration-300`}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${iconBg} shrink-0`}>{icon}</div>
        <div className="text-center sm:text-left">
          <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">{value}</p>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5 sm:mt-1">{label}</p>
        </div>
      </div>
      <p className="text-[10px] sm:text-xs text-muted-foreground/80 mt-2 sm:mt-3 hidden sm:block">{sub}</p>
    </motion.div>
  );
}

function LikedDislikedPanel({
  label, icon, count, records, glow, tint, viewProfileHref,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  records: SwipeRecord[];
  glow?: boolean;
  tint: 'primary' | 'purple';
  viewProfileHref?: string;
}) {
  const border = tint === 'primary' ? 'border-primary/20' : 'border-purple-500/20';
  const headColor = tint === 'primary' ? 'text-primary' : 'text-purple-300';
  const [page, setPage] = React.useState(0);
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(records.length / ITEMS_PER_PAGE));
  const currentRecords = records.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className={`rounded-2xl border ${border} bg-card/60 p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[11px] uppercase tracking-[0.22em] font-semibold flex items-center gap-2 ${headColor}`}>
          {icon} {label}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-4">
        {records.length === 0 && (
          <p className="col-span-3 text-xs text-muted-foreground text-center py-6">No cards</p>
        )}
        {currentRecords.map((r) => (
          <motion.div
            key={r.card.card_id}
            whileHover={{ scale: 1.06, y: -6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className={`relative aspect-[2.5/3.5] rounded-lg overflow-hidden bg-muted/30 transition-shadow duration-300 ${
              glow
                ? 'ring-1 ring-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.55)] hover:ring-primary/60'
                : 'ring-1 ring-purple-500/20 hover:shadow-[0_0_36px_rgba(168,85,247,0.45)] hover:ring-purple-400/60'
            }`}
          >
            {r.card.image_url ? (
              <img
                src={r.card.image_url}
                alt={r.card.name}
                className={`w-full h-full object-cover ${glow ? '' : 'opacity-60 saturate-50'}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {records.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={!canPrev}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              canPrev
                ? 'bg-muted hover:bg-muted/80 text-foreground'
                : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
            }`}
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={!canNext}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              canNext
                ? 'bg-muted hover:bg-muted/80 text-foreground'
                : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {viewProfileHref && (
        <div className="mt-4 pt-4 border-t border-primary/15">
          <Link
            to={viewProfileHref}
            className="group flex items-center justify-center gap-3 text-base font-bold text-primary hover:text-primary/80 transition-colors w-full py-3 rounded-lg bg-primary/5 hover:bg-primary/10"
          >
            <Sparkles className="w-5 h-5" />
            View your profile
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  );
}

function LockedCTA({
  title, desc, cta, onClick, tint, compact,
}: {
  title: string; desc: string; cta: string;
  onClick: () => void;
  tint: 'primary' | 'purple';
  compact?: boolean;
}) {
  const btn =
    tint === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_24px_hsl(var(--primary)/0.45)]'
      : 'bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.45)]';
  return (
    <div className={`rounded-xl border border-white/10 bg-background/40 backdrop-blur-sm p-5 ${compact ? 'max-w-[240px]' : 'max-w-[260px]'} text-center`}>
      <div className="flex items-center justify-center gap-1.5 text-foreground font-semibold text-sm mb-1">
        <Lock className="w-3.5 h-3.5" /> {title}
      </div>
      <p className="text-xs text-muted-foreground mb-4">{desc}</p>
      <button
        onClick={onClick}
        className={`w-full h-10 rounded-md text-sm font-semibold transition ${btn}`}
      >
        {cta}
      </button>
    </div>
  );
}

function BinderFeature({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 min-w-[80px]">
      <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-300">
        {icon}
      </div>
      <p className="text-[11px] font-semibold text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground -mt-0.5">{sub}</p>
    </div>
  );
}

function RecCard({ card, match }: { card: SwipeCard; match: number }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="relative w-[180px] sm:w-[200px] shrink-0 rounded-lg overflow-hidden bg-muted/30 ring-1 ring-primary/40 shadow-[0_0_22px_hsl(var(--primary)/0.35)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.6)] transition-shadow"
    >
      <div className="aspect-[2.5/3.5]">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-primary">
        {match}% <span className="text-[8px] font-semibold text-white/70">MATCH</span>
      </div>
    </motion.div>
  );
}

function LockedRecCard() {
  return (
    <div className="relative w-[180px] sm:w-[200px] shrink-0 rounded-lg overflow-hidden bg-muted/20 border border-white/5">
      <div className="aspect-[2.5/3.5] flex flex-col items-center justify-center gap-1.5 backdrop-blur-md bg-gradient-to-br from-purple-500/10 to-primary/10">
        <Lock className="w-5 h-5 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground text-center px-2 leading-tight">Unlocks after signup</p>
      </div>
    </div>
  );
}

function BinderPill({
  icon, title, sub, tint,
}: { icon: React.ReactNode; title: string; sub: string; tint: 'primary' | 'purple' }) {
  const ring = tint === 'primary'
    ? 'border-primary/30 text-primary'
    : 'border-purple-400/30 text-purple-300';
  const bg = tint === 'primary' ? 'bg-primary/10' : 'bg-purple-500/10';
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      className="flex flex-col items-center text-center gap-2"
    >
      <div className={`w-11 h-11 rounded-full border ${ring} ${bg} flex items-center justify-center`}>
        {icon}
      </div>
      <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
      <p className="text-[11px] text-muted-foreground -mt-1.5 leading-tight">{sub}</p>
    </motion.div>
  );
}

function RecommendedRecCard({ card, match }: { card: RecommendedCard; match: number }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className="relative w-[180px] sm:w-[200px] shrink-0 rounded-lg overflow-hidden bg-muted/30 ring-1 ring-primary/40 shadow-[0_0_22px_hsl(var(--primary)/0.35)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.6)] transition-shadow"
      title={card.reason}
    >
      <div className="aspect-[2.5/3.5]">
        {card.image_url ? (
          <img src={card.image_url} alt={card.card_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-bold text-primary">
        {match}% <span className="text-[8px] font-semibold text-white/70">MATCH</span>
      </div>
    </motion.div>
  );
}

function CircularMeter({ value }: { value: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.35" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none"
          stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - dash }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.7))' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-foreground tabular-nums">{value}%</span>
      </div>
    </div>
  );
}

function ResultThumb({ card, loved }: { card: SwipeCard; loved?: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative aspect-[2.5/3.5] rounded-md overflow-hidden bg-muted/30">
      {card.image_url && !err ? (
        <img
          src={card.image_url}
          alt={card.name}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageOff className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      {loved && (
        <div className="absolute top-0.5 right-0.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Out-of-swipes + signup nudge
// ─────────────────────────────────────────────────────────
function OutOfSwipesView({
  limit,
  hasBonus,
  isAuthed,
  onSignUp,
}: {
  limit: number;
  hasBonus: boolean;
  isAuthed: boolean;
  onSignUp: () => void;
}) {
  return _OutOfSwipesViewImpl({ limit, hasBonus, isAuthed, onSignUp });
}

// Static, blurred Pull-or-Pass shell shown behind the OutOfSwipesModal so the
// gating modal always sits on top of the swipe game UI — never the results
// view, intro, or a loading spinner.
function OutOfSwipesBackdrop() {
  return (
    <div className="relative flex-1 min-h-0 flex flex-col pointer-events-none select-none opacity-30 blur-[2px]">
      <div className="flex items-center justify-between mb-3 gap-3">
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          Card <span className="text-foreground font-semibold">1</span>
          <span className="text-muted-foreground/60"> / 20</span>
        </span>
        <span className="text-[10px] uppercase tracking-wide tabular-nums font-bold text-amber-400">0 left</span>
      </div>
      <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden mb-4 shadow-inner">
        <div className="h-full w-full rounded-full bg-gradient-to-r from-primary via-primary to-purple-400" />
      </div>
      <div className="relative flex flex-col items-center justify-center text-center mt-0 mb-2">
        <div className="inline-flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <h1
            className="font-black uppercase tracking-[0.18em] text-3xl sm:text-4xl md:text-5xl leading-none bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
              backgroundSize: '250% 100%',
              WebkitTextStroke: '1px hsl(var(--primary) / 0.25)',
            }}
          >
            Pull or Pass
          </h1>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <p className="mt-1.5 text-[11px] sm:text-xs uppercase tracking-[0.32em] text-muted-foreground/80">
          A game by <span className="text-primary/90 font-semibold">PokeIQ</span>
        </p>
      </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-start gap-3 relative">
        <div
          className="relative aspect-[2.5/3.5] w-auto"
          style={{ height: 'min(56vh, 420px)' }}
        >
          <div className="absolute -inset-8 rounded-[2.5rem] bg-primary/20 blur-3xl pointer-events-none -z-10" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 border border-border/60" />
        </div>
        <div className="flex items-end justify-center gap-7 sm:gap-10 pt-1">
          <div className="w-14 h-14 rounded-full bg-muted/60 border border-border/60" />
          <div className="w-14 h-14 rounded-full bg-muted/60 border border-border/60" />
          <div className="w-14 h-14 rounded-full bg-muted/60 border border-border/60" />
        </div>
      </div>
    </div>
  );
}

function _OutOfSwipesViewImpl({
  limit,
  hasBonus,
  isAuthed,
  onSignUp,
}: {
  limit: number;
  hasBonus: boolean;
  isAuthed: boolean;
  onSignUp: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4 py-8">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">You're out of swipes today</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Free players get {limit} swipes per day.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
        {/* Earn swipes card */}
        <Card className="p-5 text-left space-y-4 flex flex-col">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Earn More Swipes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Review cards to earn credits, train PokeIQ, and unlock cards you'll actually love.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-1">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-1" />
              <span>Review cards to earn credits for more swipes</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-1" />
              <span>Help train PokeIQ to spot your taste</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 shrink-1" />
              <span>Curate and surface cards you'll love</span>
            </li>
          </ul>
          <Link to="/earn">
            <Button size="lg" className="w-full gap-2">
              <Sparkles className="w-4 h-4" /> Earn Swipes
            </Button>
          </Link>
        </Card>

        {/* Go Pro card */}
        <Card className="p-5 text-left space-y-4 flex flex-col border-amber-400/40 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              Go Pro
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Best Value</span>
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unlock the full power of PokeIQ — unlimited swipes and every premium tool.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground flex-1">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-1" />
              <span>Unlimited swipes, every single day</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-1" />
              <span>Full PokeIQ suite — every premium feature unlocked</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-1" />
              <span>Advanced analytics, buy signals & market movers</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-1" />
              <span>Custom Smart Feed tuned to your collection</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-1" />
              <span>Priority access to new tools & beta features</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-1" />
              <span>Just $5/mo or $39/yr — cancel anytime</span>
            </li>
          </ul>
          <Button
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400 font-semibold"
            onClick={() => toast.success('PokeIQ Premium launches soon — you\'re on the early list.')}
          >
            <Trophy className="w-4 h-4" /> Upgrade to Premium
          </Button>
        </Card>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link to="/matches">
          <Button size="lg" variant="outline" className="w-full gap-2">
            <Heart className="w-4 h-4" /> See your Matches
          </Button>
        </Link>
        {!isAuthed && (
          <Button size="lg" variant="ghost" className="w-full gap-2" onClick={onSignUp}>
            <LogIn className="w-4 h-4" /> Sign up to save progress
          </Button>
        )}
      </div>
    </div>
  );
}

function OutOfSwipesModal({
  credits,
  canRedeem,
  onRedeem,
  redeeming,
  isAuthed,
  onSignUp,
  showProNudge,
  onKeepTraining,
}: {
  credits: number;
  canRedeem: boolean;
  onRedeem: () => void;
  redeeming: boolean;
  isAuthed: boolean;
  onSignUp: () => void;
  showProNudge?: boolean;
  onKeepTraining?: () => void;
}) {
  const needed = Math.max(0, CREDITS_PER_REDEMPTION - credits);
  const inProNudge = !!showProNudge && isAuthed;
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-background/70 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 14, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="w-full max-w-md"
      >
        <Card className="relative overflow-hidden p-7 border-primary/40 bg-card/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.45)]">
          <div aria-hidden className="absolute -top-24 -right-24 w-[280px] h-[280px] rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          {inProNudge ? (
            <div className="relative space-y-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-400/15 flex items-center justify-center ring-1 ring-amber-400/40">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">Swiping a lot lately?</h2>
                <p className="text-sm text-muted-foreground">
                  Skip the credit grind. Go PokeIQ Premium for unlimited swipes — or keep training and earning.
                </p>
              </div>
              <div className="space-y-2.5 pt-1">
                <motion.button
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toast.success("PokeIQ Premium launches soon — you're on the early list.")}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold text-base inline-flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(251,191,36,0.55)]"
                >
                  <Crown className="w-5 h-5" />
                  Go PokeIQ Premium — unlimited
                </motion.button>
                <button
                  onClick={onKeepTraining}
                  className="w-full h-12 rounded-xl border border-border bg-muted/40 hover:bg-muted/60 text-foreground font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  Keep training PokeIQ
                </button>
                <Link to="/matches" className="block text-xs text-primary hover:underline">
                  See your matches →
                </Link>
              </div>
            </div>
          ) : (
          <div className="relative space-y-5 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">You're out of swipes</h2>
              {canRedeem ? (
                <p className="text-sm text-muted-foreground">Redeem your credits to keep swiping.</p>
              ) : isAuthed ? (
                <p className="text-sm text-muted-foreground">
                 You've used up your free 50 swipes a day limit — you can{' '}
                  <Link to="/earn" className="text-primary font-semibold hover:underline">earn credits</Link>{' '}
                  or{' '}
                  <Link to="/premium" className="text-amber-400 font-semibold hover:underline">upgrade to Premium</Link>.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sign up to earn credits and unlock more swipes.</p>
              )}
            </div>

            {/* Credits chip */}
            {isAuthed && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border text-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums font-semibold text-foreground">{credits}</span>
                <span className="text-muted-foreground text-xs">credits</span>
              </div>
            )}

            {canRedeem ? (
              <div className="space-y-2.5 pt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onRedeem}
                  disabled={redeeming}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base inline-flex items-center justify-center gap-2 shadow-[0_0_28px_hsl(var(--primary)/0.5)] disabled:opacity-60"
                >
                  <Sparkles className="w-5 h-5" />
                  {redeeming ? 'Redeeming…' : `Redeem ${CREDITS_PER_REDEMPTION} credits → +${SWIPES_PER_REDEMPTION} swipes`}
                </motion.button>
                <Link to="/earn" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Or train PokeIQ to earn more →
                </Link>
              </div>
            ) : isAuthed ? (
              <div className="space-y-3 pt-1">
                {credits > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-semibold">{needed}</span> more credit{needed === 1 ? '' : 's'} to redeem +{SWIPES_PER_REDEMPTION} swipes
                  </p>
                )}
                <motion.button
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toast.success("PokeIQ Premium launches soon — you're on the early list.")}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-bold text-base inline-flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(251,191,36,0.55)]"
                >
                  <Crown className="w-5 h-5" />
                  Go PokeIQ Premium — unlimited
                </motion.button>
                <Link to="/earn" className="block">
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <Sparkles className="w-4 h-4" /> Earn credits
                  </Button>
                </Link>
                <Link to="/matches" className="block text-center text-primary hover:underline pt-1 text-base font-sans font-medium">
                  See your matches →
                </Link>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Button size="lg" className="w-full gap-2" onClick={onSignUp}>
                  <LogIn className="w-4 h-4" /> Sign up — get 50 free swipes
                </Button>
                <Link to="/matches" className="block text-center text-primary hover:underline pt-1 text-base font-sans font-medium">
                  See your matches →
                </Link>
              </div>
            )}
          </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

/* ── Intro / Landing Screen ── */
function IntroScreen({ onStart, onAuth, isAuthed }: { onStart: () => void; onAuth?: () => void; isAuthed?: boolean }) {
  // Interactive draggable demo card — user actually swipes a chase card.
  // Mew GG10/GG70 from Crown Zenith Galarian Gallery.
  const charizardImg = 'https://images.pokemontcg.io/swsh12pt5gg/GG10_hires.png';
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const pullOpacity = useTransform(x, [40, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -40], [1, 0]);
  const superOpacity = useTransform(y, [-140, -40], [1, 0]);
  const [decision, setDecision] = useState<null | 'pull' | 'pass' | 'super'>(null);
  const [hint, setHint] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setHint(false);
    const { offset } = info;
    let swiped: 'pull' | 'pass' | 'super' | null = null;
    if (offset.y < -110 && Math.abs(offset.y) > Math.abs(offset.x)) {
      swiped = 'super';
    } else if (offset.x > 110) {
      swiped = 'pull';
    } else if (offset.x < -110) {
      swiped = 'pass';
    } else {
      // Snap back
      x.set(0); y.set(0);
      return;
    }
    setDecision(swiped);
    // Any swipe on the demo card counts as a "like" — jump straight into the game.
    window.setTimeout(() => {
      onStart();
    }, 350);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-6 scrollbar-none">
      <div className="max-w-md md:max-w-xl mx-auto px-4 pt-1 space-y-3 flex flex-col items-center text-center">
        {/* SECTION 1 — HERO */}
        <div className="w-full text-center space-y-1">
          <motion.h1
            className="font-black uppercase tracking-[0.16em] text-4xl sm:text-5xl md:text-6xl bg-clip-text text-transparent leading-none"
            style={{
              backgroundImage:
                'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
              backgroundSize: '250% 100%',
              filter: 'drop-shadow(0 0 18px hsl(var(--primary) / 0.6))',
            }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            Pull or<br />Pass
          </motion.h1>
          <p className="text-sm text-foreground/90 font-medium">
            An AI-powered Pokémon card discovery game.
          </p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-semibold">
            Swipe. Discover. Collect.
          </p>
        </div>

        {/* SECTION 2 — INTERACTIVE SWIPE DEMO (real drag) */}
        <div className="relative w-full mx-auto h-[320px] flex items-center justify-center select-none touch-none">
          {/* Ambient glows that react to demo direction */}
          <motion.div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/2 rounded-l-[3rem]"
            style={{ opacity: passOpacity, background: 'radial-gradient(circle at left, rgb(244 63 94 / 0.45), transparent 70%)' }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-y-0 right-0 w-1/2 rounded-r-[3rem]"
            style={{ opacity: pullOpacity, background: 'radial-gradient(circle at right, rgb(16 185 129 / 0.45), transparent 70%)' }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1/2"
            style={{ opacity: superOpacity, background: 'radial-gradient(circle at top, rgb(251 191 36 / 0.45), transparent 70%)' }}
          />

          {/* Stacked back cards */}
          <div className="absolute w-[210px] h-[294px] rounded-2xl bg-card border border-border/60 -rotate-[6deg] translate-x-2 translate-y-3 opacity-50" />
          <div className="absolute w-[210px] h-[294px] rounded-2xl bg-card border border-border/60 rotate-[4deg] -translate-x-2 translate-y-1 opacity-70" />

          {/* Top demo card — fully draggable by the user */}
          <motion.div
            key={resetKey}
            className="relative w-[230px] h-[322px] rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] border border-border/80 bg-card cursor-grab active:cursor-grabbing z-10"
            drag
            dragElastic={0.6}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragStart={() => setHint(false)}
            onDragEnd={handleDragEnd}
            style={{ x, y, rotate }}
            whileTap={{ scale: 0.98 }}
          >
            <img
              src={charizardImg}
              alt="Charizard sample card"
              className="w-full h-full object-cover pointer-events-none"
              loading="eager"
              draggable={false}
            />
            {/* Live decision stamps that fade in as you drag */}
            <motion.div
              style={{ opacity: pullOpacity }}
              className="absolute top-4 left-4 px-4 py-2 rounded-lg border-[5px] border-emerald-400 text-emerald-400 font-black uppercase tracking-widest text-4xl sm:text-5xl bg-background/40 backdrop-blur-sm -rotate-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
            >
              Pull
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="absolute top-4 right-4 px-4 py-2 rounded-lg border-[5px] border-rose-400 text-rose-400 font-black uppercase tracking-widest text-4xl sm:text-5xl bg-background/40 backdrop-blur-sm rotate-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
            >
              Pass
            </motion.div>
            <motion.div
              style={{ opacity: superOpacity }}
              className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg border-[5px] border-amber-400 text-amber-400 font-black uppercase tracking-widest text-3xl sm:text-4xl bg-background/40 backdrop-blur-sm whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
            >
              ★ Super
            </motion.div>
            {/* "Swipe Me" hint — wrapper handles centering so Motion scale cannot override it */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <AnimatePresence>
                {hint && (
                  <motion.div
                    key="hint-on-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-[calc(100%-28px)] max-w-[190px] flex items-center justify-center gap-2 px-3 py-3 rounded-full bg-primary/75 border-2 border-white text-white text-base sm:text-lg font-black uppercase tracking-[0.12em] backdrop-blur-md shadow-[0_0_46px_hsl(var(--primary)/0.95),0_0_20px_rgba(255,255,255,0.6)] whitespace-nowrap drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                  >
                    <span>←</span>
                    <span>Swipe Me</span>
                    <span>→</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Gesture labels around the card */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-rose-400">
            <div className="w-9 h-9 rounded-full bg-rose-400/15 border border-rose-400/40 flex items-center justify-center">
              <X className="w-4 h-4" strokeWidth={3} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Pass</span>
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-emerald-400">
            <div className="w-9 h-9 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Pull</span>
          </div>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Super</span>
            <div className="w-9 h-9 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>

        </div>

        <p className="w-full text-center text-sm sm:text-base md:text-lg text-foreground/90 font-medium -mt-1">
          Swipe <span className="text-emerald-400 font-bold">right to pull</span>,{' '}
          <span className="text-rose-400 font-bold">left to pass</span>,{' '}
          <span className="text-amber-400 font-bold">up to super like</span>.
        </p>

        {/* SIMPLE FEATURE SUMMARY */}
        <p className="w-full text-xs text-foreground/75 leading-snug max-w-sm">
          Swipe through 20 cards a round. PokeIQ learns your taste, finds your matches, and
          curates custom binders that tell your collector story.
        </p>

        {/* CTA — start swiping, plus sign-in for returning users */}
        <div className="w-full flex flex-col items-center gap-2">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full max-w-xs sm:max-w-sm h-12 text-base font-bold bg-gradient-to-r from-primary via-cyan-500 to-purple-500 hover:opacity-90 text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.55)] flex"
          >
            Start Swiping <ArrowRight className="w-5 h-5" />
          </Button>
          {!isAuthed && onAuth && (
            <Button
              onClick={onAuth}
              size="lg"
              variant="outline"
              className="w-full max-w-xs sm:max-w-sm h-11 text-sm font-semibold gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Sign Up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function __DeprecatedIntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-6">
      <div className="max-w-xl mx-auto space-y-5 pt-4">
        <div className="text-center space-y-3">
          <motion.h1
            className="font-black uppercase tracking-[0.18em] text-4xl sm:text-5xl bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(100deg, hsl(var(--primary)) 0%, #b8fff0 25%, hsl(var(--primary)) 50%, #c7a8ff 75%, hsl(var(--primary)) 100%)',
              backgroundSize: '250% 100%',
              filter: 'drop-shadow(0 0 14px hsl(var(--primary) / 0.55))',
            }}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            Pull or Pass
          </motion.h1>
          <p className="text-base text-foreground/90 italic">
            A dating app for Pokémon cards.
          </p>
        </div>

        <Card className="p-4 space-y-2 border-primary/30 bg-card/60">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary"><Heart className="w-3.5 h-3.5" /></span>
            <span><strong className="text-foreground">Swipe right</strong> if you like the card.</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></span>
            <span><strong className="text-foreground">Swipe left</strong> if you'd pass.</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/20 text-amber-400"><Star className="w-3.5 h-3.5 fill-current" /></span>
            <span><strong className="text-foreground">Swipe up</strong> for a Super Like.</span>
          </div>
        </Card>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Every round contains <strong className="text-foreground">20 different cards</strong> pulled from
          across the Pokémon hobby — vintage grails, modern hits, beautiful artwork, weird promos,
          underrated cards, and everything in between.
        </p>

        <div className="space-y-2">
          <p className="text-sm text-foreground font-semibold">As you swipe, PokeIQ learns:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>your collecting taste</li>
            <li>your favorite artwork styles</li>
            <li>the Pokémon you gravitate toward</li>
            <li>the eras, artists, rarities, and cards you naturally love</li>
          </ul>
          <p className="text-xs text-muted-foreground/80 pt-1">
            Over time, your profile becomes smarter and more personalized.
          </p>
        </div>

        <Card className="p-4 border-primary/30 bg-primary/5">
          <p className="text-sm text-foreground">
            <Sparkles className="inline w-4 h-4 text-primary mr-1 -mt-0.5" />
            <strong>Matches</strong> are cards PokeIQ thinks you'll really connect with based on your
            DNA profile and swipe history.
          </p>
        </Card>

        <div className="space-y-2">
          <p className="text-sm text-foreground font-semibold">Your swipes will help:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>build your digital binder / gallery</li>
            <li>unlock your collector personality</li>
            <li>power personalized recommendations</li>
            <li>discover cards you may want to buy</li>
            <li>compare your taste with other collectors</li>
          </ul>
        </div>

        <p className="text-center text-sm text-muted-foreground italic">
          There are no wrong answers. Just trust your instincts and swipe.
        </p>

        <Button
          onClick={onStart}
          size="lg"
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-cyan-500 to-purple-500 hover:opacity-90 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.45)]"
        >
          I Understand — Let's Start Swiping
        </Button>
      </div>
    </div>
  );
}

function SignupNudge({ onClose, onSignUp, onLogin }: { onClose: () => void; onSignUp: () => void; onLogin?: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full"
      >
        <Card className="p-6 border-primary/40 bg-card relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-center space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-primary" />
            <h3 className="text-lg font-bold text-foreground">Create an account to remember your matches</h3>
            <p className="text-sm text-muted-foreground">
              Sign up so PokeIQ can save the cards you liked and{' '}
              <strong className="text-foreground">build your Collector Profile</strong> — the more it learns, the better your matches get.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={onSignUp} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> SIGN UP NOW
              </Button>
              {onLogin && (
                <Button onClick={onLogin} size="lg" variant="outline" className="gap-2">
                  Log in to existing account
                </Button>
              )}
              <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
                Review my matches
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}