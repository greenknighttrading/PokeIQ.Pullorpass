import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, ImageOff, Sparkles, RotateCw, Loader2, Trophy, Star, LogIn, Check, Lock } from 'lucide-react';
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
  const [quota, setQuota] = useState(() => readQuota());
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

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

    // Pool of value cards. image_url is empty in DB so we build TCGPlayer CDN URLs.
    // Exclude unwanted variants per project rules.
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('card_id, tcgplayer_id, name, set_name, price, rarity')
      .eq('game', 'Pokemon')
      .eq('product_type', 'card')
      .gt('price', 5)
      .not('tcgplayer_id', 'is', null)
      .order('price', { ascending: false })
      .limit(1500);

    if (error || !data || data.length === 0) {
      console.error('pullorpass load error', error);
      toast.error('Could not load cards for this round');
      setStage('swiping');
      return;
    }

    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    const pool: SwipeCard[] = data
      .filter((c) => c.tcgplayer_id && c.price && !EXCLUDE.test(c.name) && !seen.has(c.card_id))
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

  const recordSwipe = async (rec: SwipeRecord, advanceDelay = 650) => {
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
    setTimeout(() => setFlyAnim(null), 700);
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
      // Persist record immediately but DO NOT advance until user dismisses overlay.
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
      }
      window.setTimeout(() => setMatchCard(pulledCard), 450);
      // Queue the advance for dismissal
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
        title="Pull or Pass — Discover Your Collector DNA | PokeIQ"
        description="React to Pokémon cards on instinct. Pull or Pass builds your Collector DNA so you discover what cards actually feel like you."
      />
      <div className={`bg-background flex flex-col ${stage === 'results' ? 'min-h-screen' : 'h-screen overflow-hidden'}`}>
        <GlobalNavBar />

        <main className={`flex-1 min-h-0 max-w-2xl w-full mx-auto px-4 py-3 flex flex-col select-none ${stage === 'results' ? 'overflow-y-auto' : ''}`}>
          <MatchOverlay card={matchCard} onDismiss={dismissMatch} />
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
                  <h2 className="text-base font-semibold text-foreground leading-tight">{current.name}</h2>
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

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { x: dx, y: dy } = info.offset;
    const { x: vx, y: vy } = info.velocity;
    const fastUp = vy < -500 || dy < -SWIPE_THRESHOLD;
    const fastRight = vx > 500 || dx > SWIPE_THRESHOLD;
    const fastLeft = vx < -500 || dx < -SWIPE_THRESHOLD;

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

  // Build a keyframe animation: hold at the frozen release pose, then fly off.
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
        duration: 0.75,
        times: [0, 0.45, 1],
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
  const superLikes = records.filter((r) => r.tags.includes('Loved') || r.tags.includes('Match'));
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col gap-5 py-4"
    >
      <div className="text-center space-y-2">
        <Trophy className="w-10 h-10 mx-auto text-primary" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Round Complete</p>
        <h1 className="text-3xl font-bold text-foreground">
          {a.archetype?.name ?? 'Your Collector DNA'}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{a.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary tabular-nums">{a.pulls}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pulled</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">{a.passes}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Passed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">${a.avgPullPrice.toFixed(0)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Pull</p>
        </Card>
      </div>

      {/* Super Likes (loved + matches) */}
      <Card className="p-4 border-amber-400/30 bg-amber-400/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400" /> Super Likes
          </p>
          <Link to="/matches" className="text-xs text-primary hover:underline">View all matches →</Link>
        </div>
        {superLikes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No Super Likes this round. Tap ★ on cards you really love.
          </p>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {superLikes.map((r) => (
              <ResultThumb key={r.card.card_id} card={r.card} loved />
            ))}
          </div>
        )}
      </Card>

      {/* Liked vs Disliked side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-primary font-semibold flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 fill-primary" /> Liked
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">{pulled.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {pulled.length === 0 && (
              <p className="col-span-3 text-xs text-muted-foreground text-center py-4">No pulls</p>
            )}
            {pulled.map((r) => (
              <ResultThumb key={r.card.card_id} card={r.card} loved={r.tags.includes('Loved')} />
            ))}
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Disliked
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">{passed.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {passed.length === 0 && (
              <p className="col-span-3 text-xs text-muted-foreground text-center py-4">No passes</p>
            )}
            {passed.map((r) => (
              <ResultThumb key={r.card.card_id} card={r.card} />
            ))}
          </div>
        </Card>
      </div>

      {a.favoriteSets.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Sets you gravitate to</p>
          <div className="space-y-1.5">
            {a.favoriteSets.map((s) => (
              <div key={s.set} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate">{s.set}</span>
                <span className="text-muted-foreground tabular-nums">{s.count} pulls</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isAuthed && (
        <Card className="p-5 border-primary/40 bg-primary/5">
          <div className="text-center space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-primary" />
            <h3 className="text-lg font-bold text-foreground">Save your Collector DNA</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Sign up free to keep track of every card you've liked, sharpen your taste profile,
              and unlock a smarter PokeIQ portfolio tailored to you.
            </p>
            <Button onClick={onSignUp} size="lg" className="gap-2 w-full sm:w-auto">
              <LogIn className="w-4 h-4" />
              Sign up to save your results
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onPlayAgain} size="lg" className="gap-2" disabled={outOfSwipes}>
          <RotateCw className="w-4 h-4" />
          {outOfSwipes ? 'Daily limit reached — come back tomorrow' : 'New 20-Card Round'}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          {outOfSwipes
            ? 'Complete PokéYelp to unlock +20 more swipes today.'
            : 'Come back tomorrow to sharpen your Collector DNA.'}
        </p>
      </div>
    </motion.div>
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