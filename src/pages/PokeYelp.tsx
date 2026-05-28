import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ImageOff, Plus, X, Sparkles, Coins, RotateCw, LogIn, Check, MessageSquare, Wand2, Filter, ArrowLeft, Zap, Flame, Trophy, Gamepad2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Seo } from '@/components/seo/Seo';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PACK_ODDS_REGISTRY } from '@/lib/packOdds';
import { CardDetailModal, CardDetailSeed } from '@/components/cards/CardDetailModal';

// ── Reward constants ────────────────────────────────────
// Every 20 reviews → +10 PullOrPass swipes
// Every 200 reviews → 30 days of PokeIQ Premium (unlimited swipes + premium features)
const REVIEWS_PER_SWIPE_BATCH = 10;
const SWIPES_PER_BATCH = 10;
const CUSTOM_TAG_BONUS_CREDITS = 1; // bonus credit per custom tag for accuracy
const REVIEWS_FOR_PREMIUM = 200;
const PREMIUM_DAYS = 30;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function grantSwipeBonus(amount: number) {
  try {
    const raw = localStorage.getItem('pop_quota');
    const today = todayKey();
    const q = raw ? JSON.parse(raw) : null;
    const fresh = !q || q.date !== today;
    const next = {
      date: today,
      used: fresh ? 0 : (q.used ?? 0),
      bonus: (fresh ? 0 : (q.bonus ?? 0)) + amount,
      lifetime: q?.lifetime ?? 0,
    };
    localStorage.setItem('pop_quota', JSON.stringify(next));
  } catch {}
}

function grantPremium(days: number) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem('pokeiq_premium_until', String(until));
  } catch {}
}

// Cards from Pack Gains sets (only "hit" rarities — i.e. not the no-hit baseline)
const PACK_GAINS_SETS = PACK_ODDS_REGISTRY.map((p) => p.setName);
const PACK_GAINS_HIT_RARITIES = Array.from(
  new Set(
    PACK_ODDS_REGISTRY.flatMap((p) =>
      p.rarities.filter((r) => r.fixedValue == null).map((r) => r.rarity)
    )
  )
);
const ANON_REVIEWED_KEY = 'pokeyelp_reviewed_pg';
const SESSION_SHOWN_KEY = 'pokeyelp_session_shown';
const CREDITS_PER_REDEMPTION = 20;
const SWIPES_PER_REDEMPTION = 20;

// ── Arcade XP rules ─────────────────────────────────────
const ROUND_SIZE = 10;
const XP_PER_TAG = 10;
const XP_PER_CUSTOM = 25;
const XP_PER_SUBMIT = 50;
const XP_STREAK_BONUS = 25; // every 3-card streak
const XP_ROUND_BONUS = 250; // 10-card completion
const XP_DAILY_BONUS_BASE = 100; // first card of the day
const XP_DAILY_BONUS_PER_DAY = 25; // +25 per consecutive day, capped
const XP_DAILY_BONUS_CAP = 500;

const DAILY_STREAK_KEY = 'pokeiq_daily_streak';

function loadDailyStreak(): { count: number; lastDate: string | null } {
  try {
    const raw = localStorage.getItem(DAILY_STREAK_KEY);
    if (!raw) return { count: 0, lastDate: null };
    const v = JSON.parse(raw);
    return { count: Number(v.count) || 0, lastDate: v.lastDate ?? null };
  } catch { return { count: 0, lastDate: null }; }
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const TAG_FEEDBACK = ['Nice read', 'Taste logged', 'Collector instinct', 'Vibe captured', 'DNA updated'];
const CUSTOM_FEEDBACK = ['Original read', 'New collector language', 'Trendsetter energy', 'Fresh tag created', 'PokeIQ learned something new'];
const CARD_FEEDBACK = ['Card trained', 'AI updated', 'Collector signal captured'];

const DECOY_TAGS = [
  'Tastes like ham',
  'Smells like feet',
  'Made of cheese',
  'WWII memorabilia',
  'Powered by diesel',
  'Available at IKEA',
  'Vintage 1850s oil painting',
  'Officially endorsed by NASA',
  'Edible',
  'Glows in the dark (it does not)',
  'Banned in 12 countries',
  'Hand-signed by Shakespeare',
];

function pickDecoy(cardId: string): string {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) >>> 0;
  return DECOY_TAGS[h % DECOY_TAGS.length];
}

interface FloatingXp {
  id: number;
  amount: number;
  label?: string;
  x: number; // viewport %
  y: number;
  color?: string;
}

interface YelpCard {
  card_id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  price: number;
  rarity: string | null;
}

interface Suggestion {
  tag: string;
  category: string;
  reason: string;
}

const MAX_CUSTOM = 5;

// Eras based on set-name keyword matching (loose)
const ERAS: { id: string; label: string; match: RegExp }[] = [
  { id: 'vintage', label: 'Vintage (1999-2003)', match: /base set|jungle|fossil|team rocket|gym|neo |expedition|aquapolis|skyridge|legendary collection/i },
  { id: 'ex',      label: 'EX Era (2003-2007)', match: /\bex (ruby|sandstorm|dragon|team magma|hidden legends|fire red|deoxys|emerald|unseen forces|delta|legend maker|holon|crystal guardians|dragon frontiers|power keepers)/i },
  { id: 'dp',      label: 'DP / Platinum (2007-2011)', match: /diamond|pearl|platinum|mysterious treasures|secret wonders|stormfront|majestic dawn|legends awakened|rising rivals|supreme victors|arceus|heartgold|soulsilver|hgss|call of legends/i },
  { id: 'bw',      label: 'Black & White (2011-2013)', match: /black & white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures/i },
  { id: 'xy',      label: 'XY (2013-2016)', match: /\bxy\b|flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|double crisis|kalos starter/i },
  { id: 'sm',      label: 'Sun & Moon (2016-2019)', match: /sun & moon|sun and moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|detective pikachu|dragon majesty/i },
  { id: 'swsh',    label: 'Sword & Shield (2020-2022)', match: /sword & shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|shining fates|celebrations|champion's path/i },
  { id: 'sv',      label: 'Scarlet & Violet (2023+)', match: /scarlet & violet|paldea|obsidian flames|151|paradox rift|temporal forces|twilight masquerade|shrouded fable|stellar crown|surging sparks|prismatic|journey together|destined rivals/i },
];

function classifyEra(setName: string | null): string | null {
  if (!setName) return null;
  for (const e of ERAS) if (e.match.test(setName)) return e.id;
  return null;
}

function tcgImage(id: string | null): string | null {
  if (!id) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`;
}

export default function PokeYelp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<YelpCard[]>([]);
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);

  // AI suggestions — single-select (tap = applicable)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [custom, setCustom] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [comment, setComment] = useState('');
  const [reviewedCount, setReviewedCount] = useState<number>(() => {
    try { return Number(localStorage.getItem('earn_reviews_total') || '0'); } catch { return 0; }
  });
  const [imgErr, setImgErr] = useState(false);
  const [detailSeed, setDetailSeed] = useState<CardDetailSeed | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('5');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [setQuery, setSetQuery] = useState<string>('');
  const [eraId, setEraId] = useState<string>('');

  // ── Arcade state ──
  const [roundXp, setRoundXp] = useState(0);
  const [roundCards, setRoundCards] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [customTagCount, setCustomTagCount] = useState(0);
  const [trainingCredits, setTrainingCredits] = useState(0);
  const [dailyStreak, setDailyStreak] = useState<number>(() => {
    const s = loadDailyStreak();
    const today = todayKey();
    const yest = yesterdayKey();
    // If lastDate isn't today or yesterday, streak resets to 0 visually until they train today
    if (s.lastDate === today) return s.count;
    if (s.lastDate === yest) return s.count; // still alive, will increment on first card today
    return 0;
  });
  const [dailyAwardedToday, setDailyAwardedToday] = useState<boolean>(() => {
    return loadDailyStreak().lastDate === todayKey();
  });
  const [floatingXps, setFloatingXps] = useState<FloatingXp[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ id: number; text: string } | null>(null);
  const [cardResult, setCardResult] = useState<null | {
    xp: number;
    tagCount: number;
    customCount: number;
    streak: number;
    streakBonus: boolean;
    creditsEarned: number;
    dailyBonusXp: number;
    dailyCount: number;
  }>(null);
  const [roundComplete, setRoundComplete] = useState<null | {
    xp: number;
    cards: number;
    custom: number;
    longest: number;
  }>(null);
  const xpIdRef = useRef(0);
  const fbIdRef = useRef(0);
  const proceedNextCardRef = useRef<() => void>(() => {});

  const spawnXp = useCallback((amount: number, label?: string, opts?: { x?: number; y?: number; color?: string }) => {
    const id = ++xpIdRef.current;
    const x = opts?.x ?? 40 + Math.random() * 20;
    const y = opts?.y ?? 50 + Math.random() * 10;
    setFloatingXps((p) => [...p, { id, amount, label, x, y, color: opts?.color }]);
    setTimeout(() => setFloatingXps((p) => p.filter((f) => f.id !== id)), 1400);
  }, []);

  const flashFeedback = useCallback((pool: string[]) => {
    const text = pool[Math.floor(Math.random() * pool.length)];
    const id = ++fbIdRef.current;
    setFeedbackMsg({ id, text });
    setTimeout(() => {
      setFeedbackMsg((curr) => (curr && curr.id === id ? null : curr));
    }, 1200);
  }, []);

  // Prioritize cards the user PullOrPassed today — filters locked until done
  const [todaysMode, setTodaysMode] = useState(true);
  const [todaysRemaining, setTodaysRemaining] = useState<number | null>(null);

  const fetchCredits = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('pokeiq_credits').select('credits').eq('user_id', uid).maybeSingle();
    setCredits(data?.credits ?? 0);
  }, []);

  const loadPool = useCallback(async () => {
    setLoading(true);

    // === Today's PullOrPass swipes First mode ===
    if (todaysMode) {
      let swiped: YelpCard[] = [];
      try {
        const raw = localStorage.getItem('pop_today_swiped_' + todayKey());
        const arr = raw ? JSON.parse(raw) : [];
        swiped = (Array.isArray(arr) ? arr : []).map((c: any) => ({
          card_id: c.card_id,
          name: c.name,
          set_name: c.set_name ?? null,
          image_url: c.image_url ?? null,
          price: Number(c.price) || 0,
          rarity: c.rarity ?? null,
        }));
      } catch { swiped = []; }

      // Drop cards already reviewed this session/account
      let reviewedIds = new Set<string>();
      if (userId && swiped.length) {
        const { data: revs } = await supabase
          .from('pokeyelp_reviews')
          .select('card_id')
          .eq('user_id', userId)
          .in('card_id', swiped.map((c) => c.card_id));
        reviewedIds = new Set((revs ?? []).map((r: any) => r.card_id));
      } else {
        try {
          const prev = JSON.parse(localStorage.getItem(ANON_REVIEWED_KEY) || '[]');
          reviewedIds = new Set(prev);
        } catch {}
      }

      // De-dupe by card_id, preserve order (most recent first)
      const seen = new Set<string>();
      const items = swiped
        .slice()
        .reverse()
        .filter((c) => c.card_id && !seen.has(c.card_id) && !reviewedIds.has(c.card_id) && (seen.add(c.card_id), true));

      setTodaysRemaining(items.length);

      if (items.length > 0) {
        setPool(items);
        setIndex(0);
        setLoading(false);
        return;
      }

      // No today's swipes to review — unlock filters and fall through
      setTodaysMode(false);
      setTodaysRemaining(0);
    }

    // === Liked cards next: anything the user pulled before, not yet reviewed ===
    if (userId) {
      const { data: liked } = await supabase
        .from('pullorpass_swipes')
        .select('card_id, card_name, card_set, card_image, card_price, card_rarity, created_at')
        .eq('user_id', userId)
        .eq('decision', 'pull')
        .order('created_at', { ascending: false })
        .limit(500);

      if (liked && liked.length) {
        const likedIds = liked.map((r: any) => r.card_id).filter(Boolean);
        const { data: revs } = await supabase
          .from('pokeyelp_reviews')
          .select('card_id')
          .eq('user_id', userId)
          .in('card_id', likedIds);
        const reviewedIds = new Set((revs ?? []).map((r: any) => r.card_id));

        const seen = new Set<string>();
        const items: YelpCard[] = liked
          .filter((r: any) => r.card_id && !reviewedIds.has(r.card_id) && !seen.has(r.card_id) && (seen.add(r.card_id), true))
          .map((r: any) => ({
            card_id: r.card_id,
            name: r.card_name,
            set_name: r.card_set ?? null,
            image_url: r.card_image ?? null,
            price: Number(r.card_price) || 0,
            rarity: r.card_rarity ?? null,
          }));

        if (items.length > 0) {
          setPool(items);
          setIndex(0);
          setLoading(false);
          return;
        }
      }
    }

    const minP = Number(minPrice) || 5;
    const maxP = Number(maxPrice) || 0;
    let q = supabase
      .from('market_snapshots')
      .select('card_id, tcgplayer_id, name, set_name, price, rarity')
      .eq('game', 'Pokemon')
      .eq('product_type', 'card')
      .gt('price', minP)
      .not('tcgplayer_id', 'is', null)
      .limit(800);

    if (maxP > minP) q = q.lt('price', maxP);
    if (setQuery.trim()) q = q.ilike('set_name', `%${setQuery.trim()}%`);

    const { data, error } = await q;
    if (error || !data) {
      toast.error('Could not load cards');
      setLoading(false);
      return;
    }
    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    let items: YelpCard[] = data
      .filter((c) => c.tcgplayer_id && c.price && !EXCLUDE.test(c.name))
      .map((c) => ({
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name,
        image_url: tcgImage(c.tcgplayer_id),
        price: Number(c.price),
        rarity: c.rarity,
      }));

    if (eraId) items = items.filter((c) => classifyEra(c.set_name) === eraId);

    // Avoid repeating cards already shown earlier in this session (fallback pool)
    let sessionShown: Set<string> = new Set();
    try {
      const raw = sessionStorage.getItem(SESSION_SHOWN_KEY);
      sessionShown = new Set(raw ? JSON.parse(raw) : []);
    } catch {}
    const filtered = items.filter((c) => !sessionShown.has(c.card_id));
    const sourcePool = filtered.length >= 10 ? filtered : items;
    items = sourcePool.sort(() => Math.random() - 0.5).slice(0, 40);
    try {
      const next = Array.from(sessionShown);
      for (const c of items) if (!sessionShown.has(c.card_id)) next.push(c.card_id);
      // Cap to last 400 to keep storage small
      sessionStorage.setItem(SESSION_SHOWN_KEY, JSON.stringify(next.slice(-400)));
    } catch {}

    if (items.length === 0) {
      toast.message('No cards match your filters', { description: 'Try widening price or clearing filters.' });
    }
    setPool(items);
    setIndex(0);
    setLoading(false);
  }, [todaysMode, userId, minPrice, maxPrice, setQuery, eraId]);

  const fetchSuggestions = useCallback(async (card: YelpCard) => {
    setSuggestLoading(true);
    setSuggestions([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('pokeyelp-suggest-tags', {
        body: { name: card.name, set_name: card.set_name, rarity: card.rarity, price: card.price },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Could not generate tags');
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) {
        setUserId(session.user.id);
        fetchCredits(session.user.id);
      }
      loadPool();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = pool[index];

  useEffect(() => {
    if (current) fetchSuggestions(current);
  }, [current?.card_id, fetchSuggestions]);

  const toggleTag = (t: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(t)) {
        n.delete(t);
      } else {
        n.add(t);
        setRoundXp((x) => x + XP_PER_TAG);
        spawnXp(XP_PER_TAG);
        flashFeedback(TAG_FEEDBACK);
      }
      return n;
    });
  };

  const [clickedDecoys, setClickedDecoys] = useState<Set<string>>(new Set());
  const decoyTag = useMemo(() => (current ? pickDecoy(current.card_id) : ''), [current?.card_id]);

  const hitDecoy = () => {
    if (!current) return;
    if (clickedDecoys.has(current.card_id)) return;
    setClickedDecoys((p) => new Set(p).add(current.card_id));
    setRoundXp((x) => Math.max(0, x - 5));
    setStreak(0);
    spawnXp(-5, 'FALSE SIGNAL', { color: 'magenta' });
    toast.error('False signal detected', {
      description: 'PokeIQ is getting confused (−5 XP)',
      position: 'top-center',
    });
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    if (custom.includes(v)) { setCustomInput(''); return; }
    if (custom.length >= MAX_CUSTOM) {
      toast.message(`Max ${MAX_CUSTOM} custom tags`);
      return;
    }
    setCustom((p) => [...p, v]);
    setCustomInput('');
    setRoundXp((x) => x + XP_PER_CUSTOM);
    setCustomTagCount((c) => c + 1);
    spawnXp(XP_PER_CUSTOM, 'ORIGINAL READ', { color: 'amber' });
    flashFeedback(CUSTOM_FEEDBACK);
  };

  const removeCustom = (t: string) => setCustom((p) => p.filter((x) => x !== t));

  const nextCard = useCallback(() => {
    setSelected(new Set());
    setSuggestions([]);
    setCustom([]);
    setCustomInput('');
    setComment('');
    setImgErr(false);
    if (index + 1 >= pool.length) loadPool();
    else setIndex(index + 1);
  }, [index, pool.length, loadPool]);

  const submit = async () => {
    if (!current) return;
    const isPriorityCard = todaysMode;
    if (!userId) {
      // Track anon-reviewed priority cards so they don't repeat in the locked pool
      if (isPriorityCard) {
        try {
          const prev: string[] = JSON.parse(localStorage.getItem(ANON_REVIEWED_KEY) || '[]');
          if (!prev.includes(current.card_id)) {
            localStorage.setItem(ANON_REVIEWED_KEY, JSON.stringify([...prev, current.card_id]));
          }
        } catch { /* ignore */ }
        if (todaysMode) setTodaysRemaining((n) => (n == null ? n : Math.max(0, n - 1)));
      }
      toast.message('Sign up to keep training PokeIQ', {
        description: 'Create a free account so your reviews count toward swipe bonuses and Premium.',
        action: { label: 'Sign up', onClick: () => navigate('/auth') },
      });
      finishCardArcade(0, [], []);
      return;
    }

    // 1 credit per card reviewed + bonus credits per custom tag (accuracy reward)
    const applicableTags = Array.from(selected);
    // Include any pending tag the user typed but didn't explicitly add
    const pendingTag = customInput.trim();
    const mergedCustom = pendingTag && !custom.includes(pendingTag) && custom.length < MAX_CUSTOM
      ? [...custom, pendingTag]
      : custom;
    const customBonus = mergedCustom.length * CUSTOM_TAG_BONUS_CREDITS;
    const earned = 1 + customBonus;

    const tagPayload = [
      ...applicableTags,
      ...(comment.trim() ? [`__comment__:${comment.trim().slice(0, 500)}`] : []),
    ];

    const { error } = await supabase.from('pokeyelp_reviews').insert({
      user_id: userId,
      card_id: current.card_id,
      card_name: current.name,
      card_set: current.set_name,
      card_image: current.image_url,
      card_price: current.price,
      tags: tagPayload,
      custom_tags: mergedCustom,
      credits_awarded: earned,
    });
    if (error) {
      toast.error('Could not save review');
      return;
    }
    const newCredits = credits + earned;
    setCredits(newCredits);
    const { data: updated, error: creditErr } = await supabase.rpc('change_pokeiq_credits', { p_delta: earned });
    if (!creditErr && typeof updated === 'number') setCredits(updated);
    // Track lifetime review count → reward milestones
    let lifetime = 0;
    try {
      lifetime = Number(localStorage.getItem('earn_reviews_total') || '0') + 1;
      localStorage.setItem('earn_reviews_total', String(lifetime));
    } catch {}
    setReviewedCount((c) => c + 1);

    // Every 10 reviews → +10 PullOrPass swipes
    if (lifetime > 0 && lifetime % REVIEWS_PER_SWIPE_BATCH === 0) {
      grantSwipeBonus(SWIPES_PER_BATCH);
      toast.success(`+${SWIPES_PER_BATCH} PullOrPass swipes unlocked!`, {
        description: customBonus > 0
          ? `+${customBonus} bonus credits for custom tags. ${lifetime} reviews and counting.`
          : `Thanks for training PokeIQ — ${lifetime} reviews and counting.`,
        position: 'top-center',
      });
    } else {
      const toNext = REVIEWS_PER_SWIPE_BATCH - (lifetime % REVIEWS_PER_SWIPE_BATCH);
      toast.success(
        customBonus > 0
          ? `Review saved · +${customBonus} bonus credits`
          : 'Review saved — PokeIQ just got smarter',
        {
        description: `${toNext} more to unlock +${SWIPES_PER_BATCH} swipes.`,
        position: 'top-center',
        }
      );
    }

    // PokeIQ Pro is a paid subscription — training only grants swipe credits,
    // never auto-upgrades the account to Pro.
    if (todaysMode) {
      setTodaysRemaining((n) => (n == null ? n : Math.max(0, n - 1)));
    }
    setTrainingCredits((c) => c + earned);
    finishCardArcade(earned, applicableTags, mergedCustom);
  };

  // Award arcade XP + show per-card result panel
  const finishCardArcade = (creditsEarned: number, tags: string[], customTags: string[]) => {
    const tagXp = tags.length * XP_PER_TAG; // already counted live, but we surface in panel
    const customXp = customTags.length * XP_PER_CUSTOM;
    const newStreak = streak + 1;
    const streakBonus = newStreak > 0 && newStreak % 3 === 0;
    const bonusXp = (streakBonus ? XP_STREAK_BONUS : 0);

    // Daily streak bonus — once per day on the first card you tag
    let dailyBonusXp = 0;
    let newDailyCount = dailyStreak;
    if (!dailyAwardedToday) {
      const s = loadDailyStreak();
      const today = todayKey();
      const yest = yesterdayKey();
      if (s.lastDate === yest) newDailyCount = (s.count || 0) + 1;
      else if (s.lastDate === today) newDailyCount = s.count || 1;
      else newDailyCount = 1;
      try { localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify({ count: newDailyCount, lastDate: today })); } catch {}
      dailyBonusXp = Math.min(
        XP_DAILY_BONUS_CAP,
        XP_DAILY_BONUS_BASE + (newDailyCount - 1) * XP_DAILY_BONUS_PER_DAY,
      );
      setDailyStreak(newDailyCount);
      setDailyAwardedToday(true);
      spawnXp(dailyBonusXp, `DAY ${newDailyCount} BONUS`, { color: 'amber' });
    }

    const submitXp = XP_PER_SUBMIT + bonusXp + dailyBonusXp;
    setRoundXp((x) => x + submitXp);
    setStreak(newStreak);
    setLongestStreak((l) => Math.max(l, newStreak));
    spawnXp(submitXp, streakBonus ? `STREAK ×${newStreak}` : 'LOCK IN', { color: streakBonus ? 'amber' : undefined });
    flashFeedback(CARD_FEEDBACK);

    const totalCardXp = tagXp + customXp + submitXp;
    setCardResult({
      xp: totalCardXp,
      tagCount: tags.length,
      customCount: customTags.length,
      streak: newStreak,
      streakBonus,
      creditsEarned,
      dailyBonusXp,
      dailyCount: newDailyCount,
    });

    const newRoundCards = roundCards + 1;
    setRoundCards(newRoundCards);

    // Auto-advance to next card after the summary lingers briefly
    window.setTimeout(() => {
      proceedNextCardRef.current?.();
    }, 1800);
  };

  const proceedNextCard = () => {
    setCardResult(null);
    if (roundCards >= ROUND_SIZE) {
      const finalXp = roundXp + XP_ROUND_BONUS;
      setRoundXp(finalXp);
      setRoundComplete({
        xp: finalXp,
        cards: ROUND_SIZE,
        custom: customTagCount,
        longest: longestStreak,
      });
      spawnXp(XP_ROUND_BONUS, 'ROUND COMPLETE', { color: 'amber' });
      return;
    }
    nextCard();
  };
  proceedNextCardRef.current = proceedNextCard;

  const startNewRound = () => {
    setRoundComplete(null);
    setRoundXp(0);
    setRoundCards(0);
    setStreak(0);
    setLongestStreak(0);
    setCustomTagCount(0);
    setTrainingCredits(0);
    nextCard();
  };

  const skip = () => {
    setStreak(0); // skipping breaks the streak
    nextCard();
  };

  const [redeeming, setRedeeming] = useState(false);
  const redeemCredits = useCallback(async () => {
    if (!userId) { navigate('/auth?next=/earn'); return; }
    if (credits < CREDITS_PER_REDEMPTION || redeeming) return;
    setRedeeming(true);
    try {
      const { data: updated, error } = await supabase.rpc('change_pokeiq_credits', { p_delta: -CREDITS_PER_REDEMPTION });
      if (error) throw error;
      setCredits(typeof updated === 'number' ? updated : credits - CREDITS_PER_REDEMPTION);
      grantSwipeBonus(SWIPES_PER_REDEMPTION);
      toast.success(`+${SWIPES_PER_REDEMPTION} swipes unlocked!`, {
        description: 'Head to Pull or Pass to use them.',
        position: 'top-center',
      });
    } catch (e: any) {
      toast.error('Could not redeem credits');
    } finally {
      setRedeeming(false);
    }
  }, [userId, credits, redeeming, navigate]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (Number(minPrice) > 5) n++;
    if (maxPrice) n++;
    if (setQuery.trim()) n++;
    if (eraId) n++;
    return n;
  }, [minPrice, maxPrice, setQuery, eraId]);

  const clearFilters = () => {
    setMinPrice('5'); setMaxPrice(''); setSetQuery(''); setEraId('');
  };

  return (
    <>
      <Seo
        title="Earn Credits — Train PokeIQ, Unlock Swipes & Premium | PokeIQ"
        description="Help train PokeIQ. Your reviews personalize recommendations, unlock more Pull or Pass swipes, and earn PokeIQ Premium."
      />
      <div className="min-h-screen bg-background flex flex-col">

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col select-none">
          {/* Cinematic hero */}
          <header className="relative text-center mb-10 pt-4">
            {/* Soft neon glow + animated particles */}
            <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[260px] rounded-full blur-3xl opacity-40 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.45),transparent_70%)]" />
              {[...Array(6)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute block w-1 h-1 rounded-full bg-primary/60"
                  style={{ left: `${15 + i * 12}%`, top: `${30 + (i % 3) * 18}%` }}
                  animate={{ y: [0, -14, 0], opacity: [0.2, 0.9, 0.2] }}
                  transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                />
              ))}
              <motion.div
                className="absolute left-[10%] top-[60%] w-32 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                animate={{ x: [-40, 40, -40], opacity: [0, 0.8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute right-[8%] top-[35%] w-40 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
                animate={{ x: [30, -30, 30], opacity: [0, 0.6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
              style={{ textShadow: '0 0 24px hsl(var(--primary) / 0.3)' }}
            >
              PokeIQ Training Arcade <span className="inline-block">✨</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto"
            >
              Every tag helps uncode the Collectr DNA.
            </motion.p>

            {/* Arcade scoreboard */}
            <div className="mt-6 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <ArcadeStat icon={<Zap className="w-3 h-3" />} label="Score" value={`${roundXp.toLocaleString()} XP`} color="primary" accent />
                <ArcadeStat icon={<Flame className="w-3 h-3" />} label="Card Streak" value={`${streak} 🔥`} color="amber" />
                <ArcadeStat icon={<Trophy className="w-3 h-3" />} label={`Daily 🔥`} value={`${dailyStreak}d`} color="magenta" />
                <ArcadeStat icon={<Coins className="w-3 h-3" />} label="Credits" value={`${credits} ◎`} color="amber" accent />
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground max-w-xl mx-auto leading-relaxed">
                <span className="text-primary font-semibold">XP</span> is your arcade score — bragging rights only.{' '}
                <span className="text-amber-400 font-semibold">Credits</span> are real currency: earn{' '}
                <span className="text-foreground">1 per card</span> tagged, plus{' '}
                <span className="text-foreground">+1 bonus</span> for every <em>original tag</em> you create.
                Trade <span className="text-foreground">{CREDITS_PER_REDEMPTION} credits → {SWIPES_PER_REDEMPTION} Pull or Pass swipes</span>.
              </p>
            </div>

            {/* Milestone progress strip — one clear goal: 10 reviews → +10 swipes */}
            {(() => {
              const inRound = reviewedCount % REVIEWS_PER_SWIPE_BATCH;
              const toNext = REVIEWS_PER_SWIPE_BATCH - inRound;
              const pct = (inRound / REVIEWS_PER_SWIPE_BATCH) * 100;
              return (
                <div className="mt-8 max-w-2xl mx-auto flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-foreground font-semibold tabular-nums">{inRound}</span>
                        <span>/ {REVIEWS_PER_SWIPE_BATCH} reviewed</span>
                      </span>
                      <span className="tabular-nums">
                        {toNext} to <span className="text-primary font-semibold">+{SWIPES_PER_BATCH} swipes</span>
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.5)' }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (todaysMode && (todaysRemaining ?? 0) > 0) {
                        toast.message('Filters locked', {
                          description: `Tag the ${todaysRemaining ?? ''} cards you swiped today first to teach PokeIQ your vibe.`,
                        });
                        return;
                      }
                      toast.message('Premium unlocks card-level training', {
                        description: 'PokeIQ Pro lets you pick specific cards to train so your favorites get the most accurate tags.',
                      });
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filters locked
                    {activeFiltersCount > 0 && (
                      <span className="text-[10px] font-bold text-primary">· {activeFiltersCount}</span>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* Redeem / today-left row */}
            {(credits >= CREDITS_PER_REDEMPTION || (todaysMode && todaysRemaining != null && todaysRemaining > 0)) && (
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {credits >= CREDITS_PER_REDEMPTION && (
                  <button
                    onClick={redeemCredits}
                    disabled={redeeming}
                    className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title={`Trade ${CREDITS_PER_REDEMPTION} credits for ${SWIPES_PER_REDEMPTION} swipes`}
                  >
                    <RotateCw className="w-3 h-3" />
                    {redeeming ? 'Redeeming…' : `Redeem ${CREDITS_PER_REDEMPTION} → ${SWIPES_PER_REDEMPTION} swipes`}
                  </button>
                )}
                {todaysMode && todaysRemaining != null && todaysRemaining > 0 && (
                  <>
                    {credits >= CREDITS_PER_REDEMPTION && <span className="w-px h-3 bg-border" />}
                    <span><span className="text-foreground font-medium tabular-nums">{todaysRemaining}</span> from today left</span>
                  </>
                )}
              </div>
            )}
          </header>

          {/* Filters panel */}
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="p-4 mb-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Price range ($)</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" inputMode="decimal" min={0}
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          placeholder="min" className="h-9 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input
                          type="number" inputMode="decimal" min={0}
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          placeholder="max" className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Set contains</p>
                      <Input
                        value={setQuery}
                        onChange={(e) => setSetQuery(e.target.value)}
                        placeholder="e.g. Evolving Skies, 151"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Era</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setEraId('')}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          !eraId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Any era
                      </button>
                      {ERAS.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => setEraId(e.id)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                            eraId === e.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" onClick={() => { loadPool(); setShowFilters(false); }} className="gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Apply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Loading cards…</p>
            </div>
          )}

          {!loading && !current && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-12">
              <p className="text-sm">No cards match your filters.</p>
              <Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}

          {!loading && current && (
            <motion.div
              key={current.card_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-10 items-start justify-center"
            >
              {/* Card image and info: left column on tablet/desktop */}
              <div className="space-y-3 w-full max-w-[280px] mx-auto sm:mx-0 sm:max-w-none sm:w-[280px] lg:w-[300px] sm:shrink-0">
                <div className="relative">
                  <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.25),transparent_70%)] blur-2xl" />
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
                  aria-label="View card details"
                  className="relative block w-full aspect-[2.5/3.5] rounded-2xl overflow-hidden bg-muted/30 shadow-2xl hover:scale-[1.02] transition-transform duration-300"
                >
                  {current.image_url && !imgErr ? (
                    <img
                      src={current.image_url}
                      alt={current.name}
                      className="w-full h-full object-cover"
                      onError={() => setImgErr(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <ImageOff className="w-8 h-8" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </button>
                </div>
                <div className="text-center sm:text-left pt-1">
                  <p className="text-base font-semibold text-foreground truncate">{current.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {current.set_name ?? 'Unknown set'} · ${current.price.toFixed(2)}
                    {current.rarity && ` · ${current.rarity}`}
                  </p>
                </div>
              </div>

              {/* Tag picker — borderless, breathing */}
              <div className="space-y-6 min-w-0 w-full sm:flex-1">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">What does this card feel like?</h2>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-xs text-muted-foreground">
                      Pick what feels true. Your unique read helps train the AI. <span className="text-amber-400/90">Originality is rewarded — honest taste trains better AI.</span>
                    </p>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {selected.size} selected
                    </span>
                  </div>

                  <div className="min-h-[140px]">
                    {suggestLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
                        <Wand2 className="w-4 h-4 animate-pulse text-primary" />
                        AI is reading the card…
                      </div>
                    )}

                    {!suggestLoading && suggestions.length === 0 && (
                      <div className="text-xs text-muted-foreground py-8 text-center">
                        No suggestions yet.
                        <Button
                          variant="link" size="sm" className="ml-1 h-auto p-0"
                          onClick={() => current && fetchSuggestions(current)}
                        >
                          Try again
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      <AnimatePresence initial={false}>
                        {suggestions.slice(0, 10).map((s) => {
                          const on = selected.has(s.tag);
                          return (
                            <motion.button
                              key={s.tag}
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => toggleTag(s.tag)}
                              whileTap={{ scale: 0.94 }}
                              className={`px-4 py-2 text-sm rounded-full transition-all duration-200 ${
                                on
                                  ? 'bg-primary/15 text-primary border border-primary/60 font-semibold'
                                  : 'bg-muted/40 text-foreground/80 border border-transparent hover:bg-muted/70 hover:text-foreground'
                              }`}
                              style={on ? { boxShadow: '0 0 18px hsl(var(--primary) / 0.35)' } : undefined}
                            >
                              {s.tag}
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Custom tags + comment — no boxed border, just whitespace */}
                  <div className="mt-8 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Create your own tag
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-amber-400/90">
                          +{XP_PER_CUSTOM} XP · Originality bonus
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Invent collector language. If others agree later, you get discovery credit.
                      </p>
                      <div className="flex gap-2">
                      <Input
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                        placeholder="e.g. Binder goblin energy"
                        maxLength={40}
                        className="h-10 text-sm bg-muted/30 border-transparent focus-visible:border-primary/40"
                      />
                      <Button onClick={addCustom} size="sm" variant="outline" className="gap-1">
                        <Plus className="w-3.5 h-3.5" /> Create Tag
                      </Button>
                      </div>
                    {custom.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {custom.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30"
                          >
                            <Sparkles className="w-3 h-3" />
                            {t}
                            <button onClick={() => removeCustom(t)} aria-label="Remove">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    </div>

                    {/* Optional comment */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 mb-2">
                        <MessageSquare className="w-3 h-3" /> Optional comment
                      </p>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, 500))}
                        placeholder="Any extra thoughts?"
                        className="text-sm min-h-[60px] bg-muted/30 border-transparent focus-visible:border-primary/40 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Action area — primary hero CTA */}
                <div className="pt-2 space-y-3">
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      onClick={submit}
                      className="w-full h-14 text-base font-bold rounded-2xl gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary hover:to-primary"
                      style={{ boxShadow: '0 0 28px hsl(var(--primary) / 0.45), 0 8px 24px hsl(var(--primary) / 0.25)' }}
                    >
                      <Zap className="w-5 h-5" />
                      Lock In Tags
                    </Button>
                  </motion.div>
                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <button
                      onClick={() => {
                        if (index > 0) {
                          setSelected(new Set());
                          setSuggestions([]);
                          setCustom([]);
                          setCustomInput('');
                          setComment('');
                          setImgErr(false);
                          setIndex(index - 1);
                        }
                      }}
                      disabled={index === 0}
                      className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <span className="w-px h-3 bg-border" />
                    <button onClick={skip} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <RotateCw className="w-3.5 h-3.5" /> Skip this card
                    </button>
                  </div>
                </div>

                {!userId && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Sign up to save your contributions and unlock rewards.
                    </p>
                    <Button onClick={() => navigate('/auth')} size="sm" variant="outline" className="gap-1.5 rounded-full">
                      <LogIn className="w-3.5 h-3.5" /> Sign up to start earning
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </main>
      </div>
      <CardDetailModal open={!!detailSeed} seed={detailSeed} onClose={() => setDetailSeed(null)} />

      {/* CRT scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, hsl(var(--primary)) 0 1px, transparent 1px 3px)',
        }}
      />

      {/* Floating XP */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
        <AnimatePresence>
          {floatingXps.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -60, scale: 1 }}
              exit={{ opacity: 0, y: -90 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute font-mono font-bold"
              style={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                color: f.color === 'amber' ? 'hsl(45 95% 60%)' : 'hsl(var(--primary))',
                textShadow: f.color === 'amber'
                  ? '0 0 12px hsl(45 95% 60% / 0.8)'
                  : '0 0 12px hsl(var(--primary) / 0.8)',
              }}
            >
              <div className="text-2xl">{f.amount >= 0 ? `+${f.amount}` : f.amount} XP</div>
              {f.label && <div className="text-[10px] tracking-[0.2em] text-center mt-0.5">{f.label}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mini feedback chip */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            key={feedbackMsg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-[75] px-3 py-1.5 rounded-full font-mono text-[11px] tracking-[0.15em] uppercase bg-background/80 border border-primary/40 text-primary backdrop-blur"
            style={{ boxShadow: '0 0 16px hsl(var(--primary) / 0.3)' }}
          >
            ⚡ {feedbackMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Per-card result panel */}
      <AnimatePresence>
        {cardResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={proceedNextCard}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-sm w-full rounded-3xl p-7 text-center bg-card border-2 border-primary/60"
              style={{ boxShadow: '0 0 48px hsl(var(--primary) / 0.45)' }}
            >
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-primary mb-2">Training Complete</div>
              <div
                className="text-5xl font-black tabular-nums text-primary mb-4"
                style={{ textShadow: '0 0 24px hsl(var(--primary) / 0.7)' }}
              >
                +{cardResult.xp} XP
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs mb-5">
                <div>
                  <div className="text-muted-foreground">Tags</div>
                  <div className="text-foreground font-semibold tabular-nums">{cardResult.tagCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Original</div>
                  <div className="text-amber-400 font-semibold tabular-nums">{cardResult.customCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Streak</div>
                  <div className={`font-semibold tabular-nums ${cardResult.streakBonus ? 'text-amber-400' : 'text-foreground'}`}>
                    🔥 {cardResult.streak}
                  </div>
                </div>
              </div>
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-mono">
                <Coins className="w-3.5 h-3.5" />
                +{cardResult.creditsEarned} CREDIT{cardResult.creditsEarned === 1 ? '' : 'S'}
                <span className="text-amber-400/60">· swipe currency</span>
              </div>
              {cardResult.dailyBonusXp > 0 && (
                <div className="mb-3 text-xs text-amber-400 font-mono tracking-wider">
                  +{cardResult.dailyBonusXp} XP · DAY {cardResult.dailyCount} DAILY BONUS 🔥
                </div>
              )}
              {cardResult.streakBonus && (
                <div className="mb-4 text-xs text-amber-400 font-mono tracking-wider">
                  +{XP_STREAK_BONUS} XP STREAK BONUS
                </div>
              )}
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                Next card loading…
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round-complete arcade screen */}
      <AnimatePresence>
        {roundComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-background/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative max-w-md w-full rounded-3xl p-8 text-center bg-card border-2 border-primary"
              style={{ boxShadow: '0 0 80px hsl(var(--primary) / 0.5)' }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-400 text-background font-mono text-[10px] tracking-[0.3em] font-bold">
                ROUND COMPLETE
              </div>
              <Trophy className="w-12 h-12 mx-auto text-amber-400 mt-2 mb-3"
                style={{ filter: 'drop-shadow(0 0 12px hsl(45 95% 60% / 0.8))' }} />
              <div
                className="text-6xl font-black tabular-nums text-primary mb-1"
                style={{ textShadow: '0 0 32px hsl(var(--primary) / 0.7)' }}
              >
                {roundComplete.xp.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-6">Total XP</div>
              <div className="grid grid-cols-3 gap-3 text-sm mb-6">
                <ArcadeStatLg label="Cards" value={String(roundComplete.cards)} />
                <ArcadeStatLg label="Custom" value={String(roundComplete.custom)} accent />
                <ArcadeStatLg label="Longest 🔥" value={String(roundComplete.longest)} />
              </div>
              <div className="text-xs text-muted-foreground mb-5">Collector DNA updated ✨</div>
              <div className="space-y-2">
                <Button onClick={startNewRound} className="w-full h-12 rounded-xl font-bold gap-2"
                  style={{ boxShadow: '0 0 24px hsl(var(--primary) / 0.5)' }}>
                  <Gamepad2 className="w-4 h-4" /> Train Another Round
                </Button>
                <Button onClick={() => navigate('/pokeiq/last-round')} variant="outline" className="w-full h-11 rounded-xl">
                  View My Collector DNA
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ArcadeStat({
  icon,
  label,
  value,
  accent,
  color = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  color?: 'primary' | 'amber' | 'magenta';
}) {
  const palette = {
    primary: { hsl: '174 47% 43%', text: 'text-primary', label: 'text-primary/80' },
    amber:   { hsl: '38 92% 55%',  text: 'text-amber-400', label: 'text-amber-300/80' },
    magenta: { hsl: '320 85% 62%', text: 'text-pink-400', label: 'text-pink-300/80' },
  }[color];
  const glow = accent ? 0.55 : 0.25;
  return (
    <div
      className="relative rounded-lg px-3 py-2 bg-card/60 backdrop-blur font-mono"
      style={{
        border: `1.5px solid hsl(${palette.hsl} / ${accent ? 0.9 : 0.55})`,
        boxShadow: `0 0 ${accent ? 18 : 10}px hsl(${palette.hsl} / ${glow}), inset 0 0 12px hsl(${palette.hsl} / 0.08)`,
      }}
    >
      <div className={`flex items-center justify-center gap-1 text-[9px] uppercase tracking-[0.25em] ${palette.label}`}>
        <span className={palette.text}>{icon}</span> {label}
      </div>
      <div
        className={`text-xl font-black tabular-nums leading-tight ${palette.text}`}
        style={{ textShadow: `0 0 10px hsl(${palette.hsl} / ${accent ? 0.75 : 0.45})` }}
      >
        {value}
      </div>
    </div>
  );
}

function ArcadeStatLg({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-2 py-3">
      <div className={`text-2xl font-black tabular-nums font-mono ${accent ? 'text-amber-400' : 'text-foreground'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}