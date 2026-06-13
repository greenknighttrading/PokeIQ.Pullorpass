import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, ImageOff, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { toast } from 'sonner';

const ROUND_SIZE = 20;

interface TotCard {
  card_id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  price: number;
  rarity: string | null;
  artist?: string | null;
}

function tcgImage(id: string | null): string | null {
  if (!id) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`;
}

function classifyEra(setName: string | null): string | null {
  if (!setName) return null;
  const s = setName.toLowerCase();
  if (/scarlet|paldea|151|obsidian|paradox|temporal|twilight|shrouded|stellar|surging|prismatic|journey together|destined/.test(s)) return 'sv';
  if (/sword|rebel|darkness ablaze|vivid voltage|battle styles|chilling|evolving skies|fusion strike|brilliant stars|astral|lost origin|silver tempest|crown zenith|shining fates|celebrations/.test(s)) return 'swsh';
  if (/sun & moon|sun and moon|guardians rising|burning shadows|crimson|ultra prism|forbidden light|celestial|lost thunder|team up|unbroken|unified|cosmic eclipse|hidden fates|shining legends/.test(s)) return 'sm';
  if (/xy|flashfire|furious fists|phantom|primal|roaring|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations/.test(s)) return 'xy';
  if (/black & white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries|plasma|legendary treasures/.test(s)) return 'bw';
  if (/diamond|pearl|platinum|mysterious treasures|secret wonders|stormfront|legends awakened|rising rivals|arceus|heartgold|soulsilver|hgss/.test(s)) return 'dp';
  if (/ ex |ruby|sapphire|emerald|deoxys|holon|crystal guardians|dragon frontiers/.test(s)) return 'ex';
  if (/base set|jungle|fossil|team rocket|gym|neo |expedition|aquapolis|skyridge|legendary collection/.test(s)) return 'vintage';
  return null;
}

function priceBucket(p: number): string {
  if (p < 10) return 'under-10';
  if (p < 50) return '10-50';
  if (p < 150) return '50-150';
  if (p < 500) return '150-500';
  return '500-plus';
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CardFace({
  card,
  state,
  onPick,
}: {
  card: TotCard;
  state: 'idle' | 'winner' | 'loser';
  onPick: () => void;
}) {
  const [err, setErr] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <motion.div
      className="flex-1 flex flex-col items-center w-full"
      animate={{
        scale: state === 'winner' ? 1.05 : state === 'loser' ? 0.95 : 1,
        opacity: state === 'loser' ? 0.55 : 1,
      }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <button
        type="button"
        onClick={state === 'idle' ? onPick : undefined}
        className="relative h-[38vh] max-h-[360px] w-auto aspect-[2.5/3.5] md:h-auto md:w-full md:max-w-[320px] rounded-2xl overflow-hidden bg-muted/30 border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] transition-transform"
        style={{
          boxShadow:
            state === 'winner'
              ? '0 0 0 2px hsl(var(--primary)), 0 0 40px hsl(var(--primary) / 0.55)'
              : '0 6px 24px hsl(var(--background) / 0.6)',
        }}
      >
        {card.image_url && !err ? (
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setErr(true)}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-muted-foreground" />
          </div>
        )}

        <AnimatePresence>
          {state === 'winner' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl"
                style={{
                  width: '24%',
                  aspectRatio: '1 / 1',
                  boxShadow: '0 0 30px hsl(var(--primary) / 0.8), 0 0 0 4px hsl(var(--background) / 0.6)',
                }}
              >
                <Check className="w-1/2 h-1/2" strokeWidth={3.5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails((v) => !v);
        }}
        className="mt-1.5 text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </button>
      {showDetails && (
        <div className="mt-1 text-center text-xs text-muted-foreground max-w-[300px]">
          <div className="text-foreground font-medium truncate">{card.name}</div>
          {card.set_name && <div className="truncate">{card.set_name}</div>}
          <div className="tabular-nums">${card.price.toFixed(2)}</div>
        </div>
      )}
    </motion.div>
  );
}

export default function ThisOrThat() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<TotCard[]>([]);
  const [pair, setPair] = useState<[TotCard, TotCard] | null>(null);
  const [matchupIndex, setMatchupIndex] = useState(0); // 0..ROUND_SIZE-1 within current round
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [pickState, setPickState] = useState<{ winnerId: string | null }>({ winnerId: null });
  const [roundDone, setRoundDone] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, number>>({});

  // Auth + total count
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user && !session.user.is_anonymous ? session.user.id : null;
      setUserId(uid);
      if (uid) {
        const { count } = await supabase
          .from('this_or_that_matchups')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', uid);
        setTotalCompleted(count ?? 0);

        // Aggregate preferences (winning side only) for the result screen
        const { data: rows } = await supabase
          .from('this_or_that_matchups')
          .select('winner_set, winner_rarity, winner_artist, winner_era, winner_type, winner_price')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(500);
        if (rows) {
          const acc: Record<string, number> = {};
          for (const r of rows as any[]) {
            if (r.winner_set) acc['set:' + r.winner_set] = (acc['set:' + r.winner_set] ?? 0) + 1;
            if (r.winner_rarity) acc['rarity:' + r.winner_rarity] = (acc['rarity:' + r.winner_rarity] ?? 0) + 1;
            if (r.winner_artist) acc['artist:' + r.winner_artist] = (acc['artist:' + r.winner_artist] ?? 0) + 1;
            if (r.winner_era) acc['era:' + r.winner_era] = (acc['era:' + r.winner_era] ?? 0) + 1;
            if (r.winner_type) acc['type:' + r.winner_type] = (acc['type:' + r.winner_type] ?? 0) + 1;
            if (r.winner_price != null) acc['price:' + priceBucket(Number(r.winner_price))] =
              (acc['price:' + priceBucket(Number(r.winner_price))] ?? 0) + 1;
          }
          setPreferences(acc);
        }
      }
    })();
  }, []);

  // Load card pool
  const loadPool = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('card_id, tcgplayer_id, name, set_name, price, rarity')
      .eq('game', 'Pokemon')
      .eq('product_type', 'card')
      .gt('price', 3)
      .not('tcgplayer_id', 'is', null)
      .limit(600);

    if (error || !data) {
      toast.error('Could not load cards');
      setLoading(false);
      return;
    }

    const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;
    const items: TotCard[] = data
      .filter((c: any) => c.tcgplayer_id && c.price && !EXCLUDE.test(c.name))
      .map((c: any) => ({
        card_id: c.card_id,
        name: c.name,
        set_name: c.set_name,
        image_url: tcgImage(c.tcgplayer_id),
        price: Number(c.price),
        rarity: c.rarity,
      }));

    setPool(shuffle(items));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  // Seed first pair when pool loads
  useEffect(() => {
    if (!pair && pool.length >= 2 && !roundDone) {
      const [a, b] = pickPair(pool, null);
      setPair([a, b]);
    }
  }, [pool, pair, roundDone]);

  function pickPair(p: TotCard[], excludeIds: Set<string> | null): [TotCard, TotCard] {
    const filtered = excludeIds ? p.filter((c) => !excludeIds.has(c.card_id)) : p;
    const base = filtered.length >= 2 ? filtered : p;
    const a = base[Math.floor(Math.random() * base.length)];
    let b = base[Math.floor(Math.random() * base.length)];
    let tries = 0;
    while (b.card_id === a.card_id && tries < 20) {
      b = base[Math.floor(Math.random() * base.length)];
      tries++;
    }
    return [a, b];
  }

  const onPick = useCallback(
    async (winner: TotCard, loser: TotCard) => {
      if (pickState.winnerId) return;
      setPickState({ winnerId: winner.card_id });

      // Persist (best-effort, signed-in only)
      if (userId) {
        const era = classifyEra(winner.set_name);
        supabase
          .from('this_or_that_matchups')
          .insert({
            user_id: userId,
            card_a_id: pair![0].card_id,
            card_b_id: pair![1].card_id,
            winner_card_id: winner.card_id,
            loser_card_id: loser.card_id,
            winner_name: winner.name,
            winner_set: winner.set_name,
            winner_rarity: winner.rarity,
            winner_price: winner.price,
            winner_era: era,
          })
          .then(({ error }) => {
            if (error) console.warn('matchup insert failed', error);
          });

        // Update in-memory preferences for the result screen
        setPreferences((prev) => {
          const next = { ...prev };
          const bump = (k: string) => (next[k] = (next[k] ?? 0) + 1);
          if (winner.set_name) bump('set:' + winner.set_name);
          if (winner.rarity) bump('rarity:' + winner.rarity);
          if (era) bump('era:' + era);
          bump('price:' + priceBucket(winner.price));
          return next;
        });
      }

      setTotalCompleted((n) => n + 1);

      // Advance after the animation
      setTimeout(() => {
        const nextIndex = matchupIndex + 1;
        if (nextIndex >= ROUND_SIZE) {
          setRoundDone(true);
          setPair(null);
          setPickState({ winnerId: null });
          return;
        }
        const exclude = new Set([pair![0].card_id, pair![1].card_id]);
        const [a, b] = pickPair(pool, exclude);
        setPair([a, b]);
        setMatchupIndex(nextIndex);
        setPickState({ winnerId: null });
      }, 420);
    },
    [pickState, userId, pair, matchupIndex, pool],
  );

  const startNewRound = () => {
    setRoundDone(false);
    setMatchupIndex(0);
    setPair(null);
    setPickState({ winnerId: null });
  };

  const topPreferences = useMemo(() => {
    return Object.entries(preferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => {
        const [cat, ...rest] = k.split(':');
        const value = rest.join(':');
        const labelByCat: Record<string, string> = {
          set: 'Set',
          rarity: 'Rarity',
          artist: 'Artist',
          era: 'Era',
          type: 'Type',
          price: 'Price range',
        };
        const priceLabel: Record<string, string> = {
          'under-10': 'Under $10',
          '10-50': '$10–$50',
          '50-150': '$50–$150',
          '150-500': '$150–$500',
          '500-plus': '$500+',
        };
        const eraLabel: Record<string, string> = {
          sv: 'Scarlet & Violet',
          swsh: 'Sword & Shield',
          sm: 'Sun & Moon',
          xy: 'XY',
          bw: 'Black & White',
          dp: 'Diamond & Pearl',
          ex: 'EX Era',
          vintage: 'Vintage',
        };
        const display =
          cat === 'price' ? priceLabel[value] ?? value : cat === 'era' ? eraLabel[value] ?? value : value;
        return { category: labelByCat[cat] ?? cat, value: display, count: v };
      });
  }, [preferences]);

  // ── Result screen ───────────────────────────────────────
  if (roundDone) {
    const showEarly = totalCompleted >= 40 && totalCompleted < 100;
    const showDeveloping = totalCompleted >= 100;
    return (
      <>
        <Seo title="Training Complete — This or That | PokeIQ" description="Training Lab round complete." />
        <main className="min-h-screen flex items-center justify-center px-4 py-10">
          <Card className="max-w-md w-full p-8 text-center space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mx-auto">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>

            {showDeveloping ? (
              <>
                <h1 className="text-2xl font-bold">Developing Preferences</h1>
                <p className="text-muted-foreground text-sm">You're showing a strong preference for:</p>
                <ul className="text-left space-y-1.5 max-w-xs mx-auto">
                  {topPreferences.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{p.category}</span>
                      <span className="font-medium truncate ml-3">{p.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : showEarly ? (
              <>
                <h1 className="text-2xl font-bold">Early Taste Signals</h1>
                <p className="text-muted-foreground text-sm">You're showing a slight preference for:</p>
                <ul className="text-left space-y-1.5 max-w-xs mx-auto">
                  {topPreferences.slice(0, 3).map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{p.category}</span>
                      <span className="font-medium truncate ml-3">{p.value}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">Training Complete</h1>
                <p className="text-muted-foreground text-sm">
                  You've completed 20 comparisons.<br />
                  PokeIQ is still learning your collecting preferences.<br />
                  Keep playing to unlock deeper taste insights.
                </p>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={startNewRound} className="flex-1">Continue Training</Button>
              <Button variant="outline" onClick={() => navigate('/pokeyelp')} className="flex-1">
                Back to Training Lab
              </Button>
            </div>
          </Card>
        </main>
      </>
    );
  }

  // ── Main play screen ────────────────────────────────────
  const pct = (matchupIndex / ROUND_SIZE) * 100;

  return (
    <>
      <Seo
        title="This or That — Training Lab | PokeIQ"
        description="Choose between two Pokémon cards and help PokeIQ learn your collecting taste."
      />
      <main className="min-h-screen flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-4 pt-4 pb-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/pokeyelp')} className="px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">This or That</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Don't think too hard, just choose the card you like more!
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3 sm:mb-5 max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              <span>Matchup <span className="text-foreground font-semibold tabular-nums">{matchupIndex + 1}</span> / {ROUND_SIZE}</span>
              <span className="tabular-nums">{totalCompleted} total</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-accent rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ boxShadow: '0 0 12px hsl(var(--primary) / 0.5)' }}
              />
            </div>
          </div>

          {/* Cards */}
          {loading || !pair ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-12 w-full">
                <CardFace
                  card={pair[0]}
                  state={
                    pickState.winnerId == null
                      ? 'idle'
                      : pickState.winnerId === pair[0].card_id
                        ? 'winner'
                        : 'loser'
                  }
                  onPick={() => onPick(pair[0], pair[1])}
                />

                {/* Stylish VS — overlaps both cards, centered */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 select-none"
                >
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                    className="relative"
                  >
                    {/* Glow ring */}
                    <div
                      className="absolute inset-0 rounded-full blur-2xl"
                      style={{ background: 'radial-gradient(circle, hsl(var(--primary)/0.55), transparent 70%)' }}
                    />
                    <div
                      className="relative flex items-center justify-center rounded-full px-5 py-2 sm:px-7 sm:py-3 border-2 border-primary/70 bg-background/85 backdrop-blur-md"
                      style={{
                        boxShadow:
                          '0 0 0 4px hsl(var(--background) / 0.5), 0 10px 40px hsl(var(--primary) / 0.45)',
                      }}
                    >
                      <span
                        className="font-black italic tracking-tighter text-4xl sm:text-5xl md:text-6xl bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent"
                        style={{
                          textShadow: '0 2px 20px hsl(var(--primary) / 0.4)',
                          WebkitTextStroke: '1px hsl(var(--primary) / 0.3)',
                        }}
                      >
                        VS
                      </span>
                    </div>
                  </motion.div>
                </div>

                <CardFace
                  card={pair[1]}
                  state={
                    pickState.winnerId == null
                      ? 'idle'
                      : pickState.winnerId === pair[1].card_id
                        ? 'winner'
                        : 'loser'
                  }
                  onPick={() => onPick(pair[1], pair[0])}
                />
              </div>
            </div>
          )}

          {!userId && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              <button onClick={() => navigate('/auth')} className="underline hover:text-foreground">
                Sign in
              </button>{' '}
              to save your taste signals.
            </p>
          )}
        </div>
      </main>
    </>
  );
}