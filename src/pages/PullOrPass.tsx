import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, ImageOff, Sparkles, RotateCw, Loader2, Trophy, Star, LogIn, Check, Lock, DollarSign, Apple } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { useNavigate, Link } from 'react-router-dom';
import {
  SwipeCard, SwipeRecord, analyzeRound, pickDiverse20,
} from '@/lib/pullorpass';
import { toast } from 'sonner';
import { MatchOverlay } from '@/components/pullorpass/MatchOverlay';
import { MatchPulse, type MatchPulseEvent } from '@/components/pullorpass/MatchPulse';
import { saveLike, classifyEra, priceTier, extractPokemonName, type LikedCard } from '@/lib/likesService';
import { recommendForUser, type RecommendedCard } from '@/lib/recommendCards';
import { BookOpen, Wand2, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { CardDetailModal, CardDetailSeed } from '@/components/cards/CardDetailModal';

type Stage = 'loading' | 'swiping' | 'results';
type SwipeDir = 'left' | 'right' | 'up';

const SWIPE_THRESHOLD = 110;

// ─── Daily swipe quota (free tier) ───────────────────────
const DAILY_BASE_LIMIT = 20;
const EARN_BONUS_PER_BATCH = 10; // +10 swipes per 20 Earn reviews

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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
    const until = Number(localStorage.getItem('pokeiq_premium_until') || '0');
    return until > Date.now();
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

function tcgImage(tcgplayerId: string | null): string | null {
  if (!tcgplayerId) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_1000x1000.jpg`;
}

export default function PullOrPass() {
  const navigate = useNavigate();
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

  // DEV: grant Pro membership for testing (unlimited swipes on this device).
  useEffect(() => {
    try {
      const FAR_FUTURE = new Date('2099-12-31').getTime();
      const current = Number(localStorage.getItem('pokeiq_premium_until') || '0');
      if (current < FAR_FUTURE) {
        localStorage.setItem('pokeiq_premium_until', String(FAR_FUTURE));
      }
    } catch {}
  }, []);

  const dailyLimit = DAILY_BASE_LIMIT + quota.bonus;
  const premium = isPremiumActive();
  const remaining = premium ? Infinity : Math.max(0, dailyLimit - quota.used);
  const outOfSwipes = !premium && remaining <= 0;

  // Auth check (optional — anyone can play, sign-in saves results)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) setUserId(session.user.id);
    });
    // Try to resume an in-progress round first
    const resume = readResume();
    if (resume) {
      setCards(resume.cards);
      setIndex(resume.index);
      setRecords(resume.records || []);
      setRoundId(resume.roundId);
      setStage('swiping');
    } else {
      loadRound();
    }
    // Bonus swipes are written directly into pop_quota by the Earn page
    // (every 20 reviews → +10 swipes). Refresh on focus to pick them up.
    const refresh = () => setQuota(readQuota());
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Persist in-progress round so users can leave and come back
  useEffect(() => {
    if (stage !== 'swiping') return;
    if (!cards.length) return;
    if (index >= cards.length) return;
    writeResume({ cards, index, records, roundId });
  }, [stage, cards, index, records, roundId]);

  const loadRound = useCallback(async () => {
    setStage('loading');
    setIndex(0);
    setRecords([]);
    setImgError(false);
    setExitDir(null);
    setFlyAnim(null);
    setMatchPulse(null);
    setMatchCard(null);
    setPendingMatchAdvance(null);
    setMatchCount(0);
    setRoundId(crypto.randomUUID());

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
    // Shuffle tier order + use a random offset within each tier for variety.
    const shuffledTiers = [...TIERS].sort(() => Math.random() - 0.5);
    const rows: any[] = [];
    let lastError: any = null;
    for (const [lo, hi] of shuffledTiers) {
      const offset = Math.floor(Math.random() * 400);
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

    const picked = pickDiverse20(pool);
    if (picked.length === 0) {
      toast.error("You've swiped every card we have — new ones drop daily!");
    }
    setCards(picked);
    setStage('swiping');
  }, []);

  const current = cards[index];
  const next = cards[index + 1];
  const after = cards[index + 2];

  const recordSwipe = async (rec: SwipeRecord, advanceDelay = 320) => {
    const newRecords = [...records, rec];
    setRecords(newRecords);
    bumpQuota();
    // Track today's swiped cards so the Earn page can prioritize them
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
        // Cap to avoid unbounded growth
        localStorage.setItem(seenKey, JSON.stringify(seenPrev.slice(-5000)));
      }
    } catch {}

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
      // After 20 lifetime swipes, nudge unauthed users to sign up
      if (!userId && next.lifetime === 20) {
        setShowSignupPrompt(true);
      }
      return next;
    });
  };

  const finalizeRound = async (allRecords: SwipeRecord[]) => {
    setStage('results');
    clearResume();
    if (!userId) return;
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
    triggerAnim('pass');
    setExitDir('left');
    recordSwipe({ card: current, decision: 'pass', tags: [] });
  };

  const handleLove = () => {
    if (!current) return;
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
        title="Pull or Pass — Train Your Taste Profile | PokeIQ"
        description="React to Pokémon cards on instinct. Pull or Pass quietly learns what your eye gravitates toward — your evolving Taste Profile."
      />
      <div className={`bg-background flex flex-col ${stage === 'results' ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>
        <GlobalNavBar />

        <main className={`flex-1 min-h-0 w-full mx-auto py-3 flex flex-col select-none ${stage === 'results' ? 'overflow-y-auto max-w-none px-0' : 'max-w-2xl px-4'}`}>
          <MatchOverlay card={matchCard} onDismiss={dismissMatch} />
          <MatchPulse event={matchPulse} />
          {stage === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Pulling 20 wildly different cards…</p>
            </div>
          )}

          {stage === 'swiping' && outOfSwipes && (
            <OutOfSwipesView
              limit={dailyLimit}
              hasBonus={quota.bonus > 0}
              isAuthed={!!userId}
              onSignUp={() => navigate('/auth')}
            />
          )}

          {stage === 'swiping' && !outOfSwipes && current && (
            <>
              {/* Progress + Matches link + quota */}
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  Card {index + 1} / {cards.length}
                </span>
                <div className="flex items-center gap-3">
                  <Link to="/matches" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-primary" /> Matches
                  </Link>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground tabular-nums">
                    {remaining} left today
                  </span>
                </div>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(index / cards.length) * 100}%` }}
                />
              </div>

              {/* Card stack */}
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 relative">
                <SwipeAnimationLayer anim={flyAnim} />
                <div
                  className="relative aspect-[2.5/3.5] w-auto"
                  style={{ touchAction: 'none', height: 'min(60vh, 420px)' }}
                >
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

                <div className="text-center">
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
                    className="text-center hover:text-primary transition-colors group"
                    aria-label="View card details"
                  >
                    <h2 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary inline-flex items-center gap-1">
                      {current.name}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-primary font-normal">· details</span>
                    </h2>
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {current.set_name ?? 'Unknown set'} · ${current.price.toFixed(2)}
                    {current.rarity && ` · ${current.rarity}`}
                  </p>
                </div>

                <>
                  <div className="flex items-center gap-4">
                      <Button
                        onClick={handlePass}
                        size="lg"
                        variant="outline"
                        className="rounded-full h-12 w-12 p-0 border-2"
                        aria-label="Pass"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={handleLove}
                        size="lg"
                        variant="outline"
                        className="rounded-full h-12 w-12 p-0 border-2 border-amber-400/60 text-amber-400 hover:text-amber-400 hover:bg-amber-400/10"
                        aria-label="Love"
                      >
                        <Star className="w-5 h-5 fill-current" />
                      </Button>
                      <Button
                        onClick={handlePull}
                        size="lg"
                        className="rounded-full h-12 w-12 p-0 bg-primary hover:bg-primary/90"
                        aria-label="Pull"
                      >
                        <Heart className="w-5 h-5 fill-current" />
                      </Button>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Swipe ← Pass · ↑ Love · Pull →
                  </p>
                </>
              </div>
            </>
          )}

          {stage === 'results' && (
            <ResultsView
              records={records}
              onPlayAgain={() => { if (!outOfSwipes) loadRound(); }}
              isAuthed={!!userId}
              onSignUp={() => navigate('/auth')}
              outOfSwipes={outOfSwipes}
            />
          )}
        </main>

        {/* Mid-session signup nudge after first 20 lifetime swipes */}
        <AnimatePresence>
          {showSignupPrompt && (
            <SignupNudge onClose={() => setShowSignupPrompt(false)} onSignUp={() => navigate('/auth')} />
          )}
        </AnimatePresence>
        <CardDetailModal open={!!detailSeed} seed={detailSeed} onClose={() => setDetailSeed(null)} />
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
  const passOpacity = useTransform(x, [-150, -30, 0], [1, 0.2, 0]);
  const passScale = useTransform(x, [-200, -30, 0], [1.4, 0.7, 0.5]);
  const pullOpacity = useTransform(x, [0, 30, 150], [0, 0.2, 1]);
  const pullScale = useTransform(x, [0, 30, 200], [0.5, 0.7, 1.4]);
  const loveOpacity = useTransform(y, [-150, -40, 0], [1, 0.4, 0]);

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

function ResultsView({
  records,
  onPlayAgain,
  isAuthed,
  onSignUp,
  outOfSwipes,
}: {
  records: SwipeRecord[];
  onPlayAgain: () => void;
  isAuthed: boolean;
  onSignUp: () => void;
  outOfSwipes?: boolean;
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
    : ['Vintage Nostalgia', 'Bold & Dynamic Art', 'Gen 1 Love', 'High Energy', 'Holo & Shine']
  ).slice(0, 5);
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
    <div className="flex-1 flex flex-col gap-10 py-8 w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
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
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Round Complete</p>
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          Your Taste Profile Is Taking Shape <span className="inline-block">✨</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Every swipe teaches PokeIQ what you naturally love — not just what's valuable.
        </p>

        <div className="grid grid-cols-3 gap-3 sm:gap-5 pt-4 max-w-5xl mx-auto">
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
        </div>
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
        />
        <LikedDislikedPanel
          tint="purple"
          label="Disliked"
          icon={<X className="w-4 h-4 text-purple-400" />}
          count={passed.length}
          records={passed}
        />
      </motion.section>

      {/* ── SECTION 3: Taste Profile (compact horizontal card) ─── */}
      <motion.section {...fadeUp}>
        <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-purple-500/10 p-6 sm:p-8 overflow-hidden lg:min-h-[260px] lg:max-h-[320px]">
          <div className="absolute -top-24 -right-24 w-[320px] h-[320px] bg-primary/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] bg-purple-500/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 lg:gap-10 items-center">
            {/* Left: emblem */}
            <div className="relative w-24 h-24 lg:w-28 lg:h-28 flex items-center justify-center mx-auto lg:mx-0">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-primary/35 blur-2xl"
              />
              <div className="absolute inset-2 rounded-full border-2 border-primary/40" />
              <Sparkles className="relative w-10 h-10 text-primary drop-shadow-[0_0_18px_hsl(var(--primary)/0.9)]" />
            </div>

            {/* Middle: name + desc + tags */}
            <div className="text-center lg:text-left space-y-3 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary font-semibold">Your Taste Profile</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-[1.1]">
                {displayArchetype}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">{archetypeDesc}</p>
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start pt-1">
                {tagList.map((t, i) => (
                  <span
                    key={t}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      i % 2 === 0
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-purple-400/40 bg-purple-500/10 text-purple-300'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: completion + soft CTA */}
            <div className="flex flex-col items-center gap-3 lg:min-w-[200px]">
              <CircularMeter value={completion} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profile Completion</p>
              <p className="text-[11px] text-muted-foreground text-center max-w-[200px] leading-snug">
                Recommendation accuracy sharpens with every swipe.
              </p>
              {!isAuthed && (
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onSignUp}
                  className="mt-1 h-10 px-6 rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-[0_0_24px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_36px_hsl(var(--primary)/0.7)] transition-shadow whitespace-nowrap"
                >
                  Create Free Account
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── SECTION 4: Binder hero (matches reference mockup) ─── */}
      <motion.section {...fadeUp}>
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
                A binder shaped by your taste
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                PokeIQ automatically organizes the cards you'll actually love.
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
      </motion.section>

      {/* ── SECTION 5: Hand-picked recommendations row ────────── */}
      <motion.section {...fadeUp} className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Recommended For You</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-1">Hand-picked for your taste</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Different cards from this round — chosen by matching the sets, artists, eras, and Pokémon you liked.
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

      {/* ── SECTION 6: Combined Progress + Why + SIGN UP NOW ───── */}
      <motion.section {...fadeUp}>
        <div className="relative rounded-2xl border border-primary/25 bg-[#0a1414] p-5 sm:p-7 lg:p-8 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[360px] h-[360px] bg-primary/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-[360px] h-[360px] bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 lg:gap-10 items-center">
            {/* Left: progress meter */}
            <div className="flex items-center gap-4 lg:gap-5">
              <CircularMeter value={completion} />
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">Your Progress</p>
                <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">Recommendation Accuracy</h3>
                <p className="text-xs text-muted-foreground max-w-[260px] leading-snug">
                  The more you train PokeIQ, the sharper your matches become.
                </p>
                <p className="text-xs text-foreground/70">
                  Most users see major improvements after <span className="text-primary font-semibold">100+</span> swipes.
                </p>
              </div>
            </div>

            {/* Middle: why sign up checklist (2 cols) */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-purple-300 font-semibold mb-3">Why Sign Up?</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  'Save & track your Taste Profile',
                  'Get personalized recommendations',
                  'Build your custom digital binder',
                  'Continue unlimited 20-card rounds',
                  'Unlock advanced insights & trends',
                  'Your data is safe and never shared',
                ].map((s) => (
                  <li key={s} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: primary CTA */}
            {!isAuthed ? (
              <div className="flex flex-col items-center lg:items-end gap-2 lg:min-w-[260px]">
                <p className="text-sm text-foreground/90 text-center lg:text-right">
                  Ready to continue your collector journey?
                </p>
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onSignUp}
                  className="w-full lg:w-auto h-12 px-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm tracking-wide inline-flex items-center justify-center gap-2 shadow-[0_0_28px_hsl(var(--primary)/0.55)] hover:shadow-[0_0_44px_hsl(var(--primary)/0.8)] transition-shadow whitespace-nowrap"
                >
                  SIGN UP NOW
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <p className="text-[11px] text-muted-foreground">It's free and only takes a moment.</p>
              </div>
            ) : null}
          </div>
        </div>
      </motion.section>


      {/* Authed-only replay (guests convert via the SIGN UP NOW widget above) */}
      {isAuthed && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            onClick={onPlayAgain}
            size="lg"
            className="gap-2 min-w-[280px]"
            disabled={outOfSwipes}
          >
            <RotateCw className="w-4 h-4" />
            {outOfSwipes ? 'Daily limit reached — come back tomorrow' : 'Play Another Round'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers for the redesigned results page ─────────────── */

function StatGlowCard({
  icon, value, label, sub, tint,
}: {
  icon: React.ReactNode; value: string; label: string; sub: string;
  tint: 'primary' | 'purple' | 'amber';
}) {
  const ring =
    tint === 'primary' ? 'border-primary/25 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--primary)/0.25)]'
    : tint === 'purple' ? 'border-purple-500/25 hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]'
    : 'border-amber-400/25 hover:border-amber-300/50 hover:shadow-[0_0_30px_rgba(251,191,36,0.22)]';
  const iconBg =
    tint === 'primary' ? 'bg-primary/10'
    : tint === 'purple' ? 'bg-purple-500/10'
    : 'bg-amber-400/10';
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
  label, icon, count, records, glow, tint,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  records: SwipeRecord[];
  glow?: boolean;
  tint: 'primary' | 'purple';
}) {
  const border = tint === 'primary' ? 'border-primary/20' : 'border-purple-500/20';
  const headColor = tint === 'primary' ? 'text-primary' : 'text-purple-300';
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
        {records.slice(0, 6).map((r) => (
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
              <img src={r.card.image_url} alt={r.card.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
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
            onClick={() => toast.success('PokeIQ Pro launches soon — you\'re on the early list.')}
          >
            <Trophy className="w-4 h-4" /> Upgrade to Pro
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

function SignupNudge({ onClose, onSignUp }: { onClose: () => void; onSignUp: () => void }) {
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
            <h3 className="text-lg font-bold text-foreground">You're 20 swipes in — nice taste.</h3>
            <p className="text-sm text-muted-foreground">
              Create a free account to start building your <strong className="text-foreground">Collector Profile</strong> —
              your vibes, your favorite sets, and the cards that actually feel like you.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={onSignUp} size="lg" className="gap-2">
                <LogIn className="w-4 h-4" /> Build my Collector Profile
              </Button>
              <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
                Keep swiping for now
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}