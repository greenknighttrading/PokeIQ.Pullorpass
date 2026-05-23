import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, ImageOff, Sparkles, RotateCw, Loader2, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { useNavigate } from 'react-router-dom';
import {
  SwipeCard, SwipeRecord, TAG_GROUPS, analyzeRound, pickDiverse20,
} from '@/lib/pullorpass';
import { toast } from 'sonner';

type Stage = 'loading' | 'swiping' | 'tagging' | 'results' | 'auth';

export default function PullOrPass() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<SwipeCard[]>([]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<SwipeRecord[]>([]);
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [roundId, setRoundId] = useState<string>('');
  const [imgError, setImgError] = useState(false);

  // Auth + initial load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || session.user.is_anonymous) {
        setStage('auth');
      } else {
        setUserId(session.user.id);
        loadRound();
      }
    });
  }, []);

  const loadRound = useCallback(async () => {
    setStage('loading');
    setIndex(0);
    setRecords([]);
    setPendingTags([]);
    setImgError(false);
    setRoundId(crypto.randomUUID());

    // Pull a pool of price>$5 cards with images, then diversify to 20
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('card_id, name, set_name, image_url, price, rarity')
      .eq('game', 'Pokemon')
      .eq('product_type', 'card')
      .gt('price', 5)
      .not('image_url', 'is', null)
      .order('synced_at', { ascending: false })
      .limit(800);

    if (error || !data || data.length === 0) {
      toast.error('Could not load cards for this round');
      setStage('swiping');
      return;
    }

    const pool: SwipeCard[] = data
      .filter((c) => c.image_url && c.price)
      .map((c) => ({
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name,
        image_url: c.image_url,
        price: Number(c.price),
        rarity: c.rarity,
      }));

    const picked = pickDiverse20(pool);
    setCards(picked);
    setStage('swiping');
  }, []);

  const current = cards[index];

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
      // End of round
      finalizeRound(newRecords);
    } else {
      setIndex(index + 1);
      setImgError(false);
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

  const handlePull = () => {
    setStage('tagging');
    setPendingTags([]);
  };

  const handlePass = () => {
    if (!current) return;
    recordSwipe({ card: current, decision: 'pass', tags: [] });
  };

  const confirmTags = () => {
    if (!current) return;
    recordSwipe({ card: current, decision: 'pull', tags: pendingTags });
    setStage('swiping');
  };

  const skipTags = () => {
    if (!current) return;
    recordSwipe({ card: current, decision: 'pull', tags: [] });
    setStage('swiping');
  };

  const toggleTag = (t: string) => {
    setPendingTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 3 ? prev : [...prev, t]
    );
  };

  return (
    <>
      <Seo
        title="PULLorPASS — Discover Your Collector DNA | PokeIQ"
        description="React to Pokémon cards on instinct. PULLorPASS builds your Collector DNA so you discover what cards actually feel like you."
      />
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalNavBar />

        <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col">
          {stage === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Pulling 20 wildly different cards…</p>
            </div>
          )}

          {stage === 'auth' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <Heart className="w-12 h-12 text-primary" />
              <h1 className="text-3xl font-bold">PULLorPASS</h1>
              <p className="text-muted-foreground max-w-md">
                Sign in to start a round. We'll build your Collector DNA from your swipes.
              </p>
              <Button onClick={() => navigate('/auth')}>Sign in to play</Button>
            </div>
          )}

          {(stage === 'swiping' || stage === 'tagging') && current && (
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

              {/* Card */}
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.card_id + '-' + index}
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25 }}
                    className="relative w-full max-w-xs aspect-[2.5/3.5] rounded-2xl overflow-hidden bg-muted/30 shadow-2xl"
                  >
                    {current.image_url && !imgError ? (
                      <img
                        src={current.image_url}
                        alt={current.name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <ImageOff className="w-10 h-10" />
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="text-center">
                  <h2 className="text-lg font-semibold text-foreground">{current.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {current.set_name ?? 'Unknown set'} · ${current.price.toFixed(2)}
                    {current.rarity && ` · ${current.rarity}`}
                  </p>
                </div>

                {stage === 'swiping' && (
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handlePass}
                      size="lg"
                      variant="outline"
                      className="rounded-full h-16 w-16 p-0 border-2"
                      aria-label="Pass"
                    >
                      <X className="w-7 h-7" />
                    </Button>
                    <Button
                      onClick={handlePull}
                      size="lg"
                      className="rounded-full h-16 w-16 p-0 bg-primary hover:bg-primary/90"
                      aria-label="Pull"
                    >
                      <Heart className="w-7 h-7 fill-current" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Tag overlay */}
              {stage === 'tagging' && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-2xl border border-border bg-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">
                      What does this card feel like? <span className="text-xs text-muted-foreground font-normal">(pick up to 3)</span>
                    </p>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {TAG_GROUPS.map((g) => (
                      <div key={g.label}>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">{g.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.tags.map((t) => {
                            const on = pendingTags.includes(t);
                            return (
                              <button
                                key={t}
                                onClick={() => toggleTag(t)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                                  on
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-border hover:bg-muted'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="ghost" onClick={skipTags} className="flex-1">Skip</Button>
                    <Button onClick={confirmTags} className="flex-1" disabled={pendingTags.length === 0}>
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {stage === 'results' && (
            <ResultsView records={records} onPlayAgain={loadRound} />
          )}
        </main>
      </div>
    </>
  );
}

function ResultsView({ records, onPlayAgain }: { records: SwipeRecord[]; onPlayAgain: () => void }) {
  const a = analyzeRound(records);
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

      {a.topTags.length > 0 && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Your top vibes</p>
          <div className="flex flex-wrap gap-2">
            {a.topTags.map((t) => (
              <Badge key={t.tag} variant="secondary" className="gap-1">
                <Sparkles className="w-3 h-3" />
                {t.tag} <span className="opacity-60">×{t.count}</span>
              </Badge>
            ))}
          </div>
        </Card>
      )}

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