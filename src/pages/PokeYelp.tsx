import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ImageOff, Plus, X, Sparkles, Coins, RotateCw, LogIn, Check, MessageSquare, Wand2, Filter, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
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

    items = items.sort(() => Math.random() - 0.5).slice(0, 40);

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
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
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
      nextCard();
      return;
    }

    // 1 credit per card reviewed + bonus credits per custom tag (accuracy reward)
    const applicableTags = Array.from(selected);
    const customBonus = custom.length * CUSTOM_TAG_BONUS_CREDITS;
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
      custom_tags: custom,
      credits_awarded: earned,
    });
    if (error) {
      toast.error('Could not save review');
      return;
    }
    const newCredits = credits + earned;
    setCredits(newCredits);
    await supabase.from('pokeiq_credits').upsert({
      user_id: userId, credits: newCredits, updated_at: new Date().toISOString(),
    });
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
    nextCard();
  };

  const skip = () => nextCard();

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
        <GlobalNavBar />

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
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight"
              style={{ textShadow: '0 0 40px hsl(var(--primary) / 0.35)' }}
            >
              PokeIQ Training <span className="inline-block">✨</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              className="mt-3 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto"
            >
              Help train smarter recommendations for yourself and collectors everywhere.
            </motion.p>

            {/* Milestone progress strip — one clear goal: 10 reviews → +10 swipes */}
            {(() => {
              const inRound = reviewedCount % REVIEWS_PER_SWIPE_BATCH;
              const toNext = REVIEWS_PER_SWIPE_BATCH - inRound;
              const pct = (inRound / REVIEWS_PER_SWIPE_BATCH) * 100;
              return (
                <div className="mt-8 max-w-md mx-auto">
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
              );
            })()}

            {/* Subtle filter / credits row */}
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums text-foreground font-medium">{credits}</span> credits
              </span>
              <span className="w-px h-3 bg-border" />
              <button
                onClick={() => {
                  if (todaysMode && (todaysRemaining ?? 0) > 0) {
                    toast.message('Filters locked', {
                      description: `Tag the ${todaysRemaining ?? ''} cards you swiped today first to teach PokeIQ your vibe.`,
                    });
                    return;
                  }
                  setShowFilters((s) => !s);
                }}
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Filter className="w-3.5 h-3.5" />
                {todaysMode && (todaysRemaining ?? 0) > 0 ? 'Filters locked' : 'Filters'}
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] font-bold text-primary">· {activeFiltersCount}</span>
                )}
              </button>
              {todaysMode && todaysRemaining != null && todaysRemaining > 0 && (
                <>
                  <span className="w-px h-3 bg-border" />
                  <span><span className="text-foreground font-medium tabular-nums">{todaysRemaining}</span> from today left</span>
                </>
              )}
            </div>
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
                  <h2 className="text-lg font-semibold text-foreground mb-1">What fits this card?</h2>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-xs text-muted-foreground">
                      Tap any tag that fits. Skip the rest. <span className="text-amber-400/90">Accuracy is rewarded!</span>
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
                          Add your own
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-amber-400/90">
                          Add custom tags for bonus credit
                        </p>
                      </div>
                      <div className="flex gap-2">
                      <Input
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustom())}
                        placeholder="e.g. Mona Lisa pose"
                        maxLength={40}
                        className="h-10 text-sm bg-muted/30 border-transparent focus-visible:border-primary/40"
                      />
                      <Button onClick={addCustom} size="sm" variant="outline" className="gap-1">
                        <Plus className="w-3.5 h-3.5" /> Add
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
                      <Sparkles className="w-5 h-5" />
                      Submit Review
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
    </>
  );
}