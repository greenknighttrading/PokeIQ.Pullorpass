import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, X, ImageOff, Sparkles, RotateCw, Loader2, Trophy, Star, LogIn, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { useNavigate } from 'react-router-dom';
import {
  SwipeCard, SwipeRecord, analyzeRound, pickDiverse20,
} from '@/lib/pullorpass';
import { toast } from 'sonner';

type Stage = 'loading' | 'swiping' | 'results';
type SwipeDir = 'left' | 'right' | 'up';

const SWIPE_THRESHOLD = 110;

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

  // Auth check (optional — anyone can play, sign-in saves results)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) setUserId(session.user.id);
    });
    loadRound();
  }, []);

  const loadRound = useCallback(async () => {
    setStage('loading');
    setIndex(0);
    setRecords([]);
    setImgError(false);
    setRoundId(crypto.randomUUID());

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
      .filter((c) => c.tcgplayer_id && c.price && !EXCLUDE.test(c.name))
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
      toast.error('No cards available right now');
    }
    setCards(picked);
    setStage('swiping');
  }, []);

  const current = cards[index];
  const next = cards[index + 1];
  const after = cards[index + 2];

  const recordSwipe = async (rec: SwipeRecord) => {
    const newRecords = [...records, rec];
    setRecords(newRecords);

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

    if (index + 1 >= cards.length) {
      finalizeRound(newRecords);
    } else {
      setIndex(index + 1);
      setImgError(false);
      setExitDir(null);
    }
  };

  const finalizeRound = async (allRecords: SwipeRecord[]) => {
    setStage('results');
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

  const handlePull = () => {
    if (!current) return;
    triggerAnim('pull');
    setExitDir('right');
    recordSwipe({ card: current, decision: 'pull', tags: [] });
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
        title="PULLorPASS — Discover Your Collector DNA | PokeIQ"
        description="React to Pokémon cards on instinct. PULLorPASS builds your Collector DNA so you discover what cards actually feel like you."
      />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col select-none">
          {stage === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Pulling 20 wildly different cards…</p>
            </div>
          )}

          {stage === 'swiping' && current && (
            <>
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  Card {index + 1} / {cards.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {records.filter((r) => r.decision === 'pull').length} pulled
                </span>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(index / cards.length) * 100}%` }}
                />
              </div>

              {/* Card stack */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
                <SwipeAnimationLayer anim={flyAnim} />
                <div className="relative w-full max-w-xs aspect-[2.5/3.5]" style={{ touchAction: 'none' }}>
                  {/* +2 card */}
                  {after && (
                    <StackCardShell offset={2}>
                      <CardArt card={after} />
                    </StackCardShell>
                  )}
                  {/* +1 card (visible shadow behind) */}
                  {next && (
                    <StackCardShell offset={1}>
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
                  <h2 className="text-lg font-semibold text-foreground">{current.name}</h2>
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
                        className="rounded-full h-14 w-14 p-0 border-2"
                        aria-label="Pass"
                      >
                        <X className="w-6 h-6" />
                      </Button>
                      <Button
                        onClick={handleLove}
                        size="lg"
                        variant="outline"
                        className="rounded-full h-14 w-14 p-0 border-2 border-amber-400/60 text-amber-400 hover:text-amber-400 hover:bg-amber-400/10"
                        aria-label="Love"
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </Button>
                      <Button
                        onClick={handlePull}
                        size="lg"
                        className="rounded-full h-14 w-14 p-0 bg-primary hover:bg-primary/90"
                        aria-label="Pull"
                      >
                        <Heart className="w-6 h-6 fill-current" />
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
            <ResultsView records={records} onPlayAgain={loadRound} isAuthed={!!userId} onSignUp={() => navigate('/auth')} />
          )}
        </main>
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
              <Heart className="w-32 h-32 text-primary fill-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.6)]" />
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
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.85 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <X className="w-20 h-20 text-muted-foreground" strokeWidth={2.5} />
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
  // Behind cards: scaled down, pushed down, dimmed
  const scale = 1 - offset * 0.05;
  const y = offset * 14;
  const opacity = offset === 1 ? 0.85 : 0.55;
  return (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-muted/30 shadow-xl"
      style={{
        transform: `translateY(${y}px) scale(${scale})`,
        opacity,
        zIndex: 10 - offset,
      }}
    >
      {children}
    </div>
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

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { x: dx, y: dy } = info.offset;
    const { x: vx, y: vy } = info.velocity;
    const fastUp = vy < -500 || dy < -SWIPE_THRESHOLD;
    const fastRight = vx > 500 || dx > SWIPE_THRESHOLD;
    const fastLeft = vx < -500 || dx < -SWIPE_THRESHOLD;

    // Prioritize vertical only if vertical motion dominates
    if (fastUp && Math.abs(dy) > Math.abs(dx)) {
      onSwipe('up');
    } else if (fastRight) {
      onSwipe('right');
    } else if (fastLeft) {
      onSwipe('left');
    }
    // else snap back (framer handles it)
  };

  const exitX = exitDir === 'right' ? 600 : exitDir === 'left' ? -600 : 0;
  const exitY = exitDir === 'up' ? -700 : 0;

  return (
    <motion.div
      className="absolute inset-0 rounded-2xl overflow-hidden bg-muted/30 shadow-2xl cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate, zIndex: 20, touchAction: 'none' }}
      drag={disabled || exitDir ? false : true}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={
        exitDir
          ? { x: exitX, y: exitY, opacity: 0, rotate: exitDir === 'right' ? 25 : exitDir === 'left' ? -25 : 0, transition: { duration: 0.45, ease: 'easeIn', delay: 0.25 } }
          : { opacity: 1, scale: 1 }
      }
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
}: {
  records: SwipeRecord[];
  onPlayAgain: () => void;
  isAuthed: boolean;
  onSignUp: () => void;
}) {
  const a = analyzeRound(records);
  const pulled = records.filter((r) => r.decision === 'pull');
  const passed = records.filter((r) => r.decision === 'pass');
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
        <Button onClick={onPlayAgain} size="lg" className="gap-2">
          <RotateCw className="w-4 h-4" />
          New 20-Card Round
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">
          Come back tomorrow to sharpen your Collector DNA.
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