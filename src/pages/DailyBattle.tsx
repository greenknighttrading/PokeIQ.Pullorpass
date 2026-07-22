import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ImageOff, Loader2, Sparkles, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import {
  agreementScore,
  DailyBattleCard,
  DailyBattlePair,
  DailyBattleResults,
  estToday,
  fetchCommunityResults,
  fetchDailyBattles,
  fetchMyPicks,
  msUntilMidnightEST,
  submitDailyVote,
  UserPick,
} from '@/lib/dailyBattle';

const GUEST_PICKS_KEY_PREFIX = 'pop_daily_battle_guest_';
function guestKey() { return `${GUEST_PICKS_KEY_PREFIX}${estToday()}`; }
function readGuestPicks(): Array<UserPick & { pair: DailyBattlePair; winner: DailyBattleCard; loser: DailyBattleCard }> {
  try {
    const raw = localStorage.getItem(guestKey());
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeGuestPicks(picks: Array<UserPick & { pair: DailyBattlePair; winner: DailyBattleCard; loser: DailyBattleCard }>) {
  try { localStorage.setItem(guestKey(), JSON.stringify(picks)); } catch {}
}
function clearGuestPicks() { try { localStorage.removeItem(guestKey()); } catch {} }

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function CardFace({
  card,
  state,
  pct,
  showPct,
  onPick,
}: {
  card: DailyBattleCard;
  state: 'idle' | 'winner' | 'loser';
  pct: number | null;
  showPct: boolean;
  onPick: () => void;
}) {
  const [err, setErr] = useState(false);
  return (
    <motion.div
      className="flex-1 flex flex-col items-center w-full"
      animate={{
        scale: state === 'winner' ? 1.05 : state === 'loser' ? 0.95 : 1,
        opacity: state === 'loser' && !showPct ? 0.6 : 1,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <button
        type="button"
        onClick={state === 'idle' ? onPick : undefined}
        className="relative h-[36vh] max-h-[340px] w-auto aspect-[2.5/3.5] md:h-auto md:max-h-[480px] md:w-full md:max-w-[300px] rounded-2xl overflow-hidden bg-muted/30 border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.99] transition-transform"
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
          {state === 'winner' && !showPct && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
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

        {showPct && pct != null && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/80 to-transparent pt-6 pb-2 px-2 text-center">
            <div className={`text-2xl sm:text-3xl font-black tabular-nums ${state === 'winner' ? 'text-primary' : 'text-foreground'}`}>
              {pct}%
            </div>
          </div>
        )}
      </button>
    </motion.div>
  );
}

export default function DailyBattle() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [pairs, setPairs] = useState<DailyBattlePair[]>([]);
  const [picks, setPicks] = useState<UserPick[]>([]);
  const [results, setResults] = useState<DailyBattleResults>({});
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState<{ winnerId: string; loserId: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user && !session.user.is_anonymous ? session.user.id : null;
      setUserId(uid);

      try {
        const [dailyPairs, myPicks, comm] = await Promise.all([
          fetchDailyBattles(),
          uid ? fetchMyPicks() : Promise.resolve([]),
          fetchCommunityResults(),
        ]);
        setPairs(dailyPairs);
        setResults(comm);

        // If user just signed in and had guest picks queued, flush them now.
        if (uid) {
          const pending = readGuestPicks();
          const existingIdx = new Set(myPicks.map((p) => p.matchup_index));
          const toSubmit = pending.filter((p) => !existingIdx.has(p.matchup_index));
          if (toSubmit.length) {
            await Promise.all(
              toSubmit.map((p) =>
                submitDailyVote({
                  matchupIndex: p.matchup_index,
                  pair: p.pair,
                  winner: p.winner,
                  loser: p.loser,
                  userId: uid,
                }),
              ),
            );
            clearGuestPicks();
            const merged = [...myPicks, ...toSubmit.map((p) => ({ matchup_index: p.matchup_index, winner_card_id: p.winner_card_id }))];
            setPicks(merged);
            setIndex(Math.min(merged.length, dailyPairs.length));
            const fresh = await fetchCommunityResults();
            setResults(fresh);
          } else {
            setPicks(myPicks);
            setIndex(Math.min(myPicks.length, dailyPairs.length));
          }
        } else {
          // Guest — hydrate from localStorage so they can resume today's picks.
          const guest = readGuestPicks();
          const guestPicks: UserPick[] = guest.map((g) => ({ matchup_index: g.matchup_index, winner_card_id: g.winner_card_id }));
          setPicks(guestPicks);
          setIndex(Math.min(guestPicks.length, dailyPairs.length));
        }
      } catch (e) {
        console.warn('daily battle load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = picks.length >= 5 && pairs.length === 5;
  const currentPair = !completed && index < pairs.length ? pairs[index] : null;

  const refreshResults = useCallback(async () => {
    const r = await fetchCommunityResults();
    setResults(r);
  }, []);

  const onPick = useCallback(
    async (winner: DailyBattleCard, loser: DailyBattleCard) => {
      if (!currentPair || locked) return;

      setLocked({ winnerId: winner.card_id, loserId: loser.card_id });
      if (userId) {
        await submitDailyVote({
          matchupIndex: index,
          pair: currentPair,
          winner,
          loser,
          userId,
        });
      } else {
        // Guest — save pick locally so we can submit after sign-in.
        const prev = readGuestPicks();
        writeGuestPicks([
          ...prev,
          {
            matchup_index: index,
            winner_card_id: winner.card_id,
            pair: currentPair,
            winner,
            loser,
          },
        ]);
      }
      // Immediately reflect the vote so agreement math is stable
      setPicks((prev) => [...prev, { matchup_index: index, winner_card_id: winner.card_id }]);
      // Optimistic community bump
      setResults((prev) => {
        const next: DailyBattleResults = { ...prev };
        const tally = { ...(next[index] || {}) };
        tally[winner.card_id] = (tally[winner.card_id] || 0) + 1;
        next[index] = tally;
        return next;
      });
      // Then re-fetch fresh totals (skip for guests — RPC may require auth)
      if (userId) await refreshResults();

      // Show results for ~2.2s then advance
      window.setTimeout(() => {
        setLocked(null);
        setIndex((i) => i + 1);
      }, 2200);
    },
    [currentPair, locked, userId, index, navigate, refreshResults],
  );

  const currentTally = results[index] || {};
  const totalVotes = Object.values(currentTally).reduce((s, n) => s + n, 0);
  const pctFor = (id: string): number | null => {
    if (!totalVotes) return null;
    return Math.round(((currentTally[id] || 0) / totalVotes) * 100);
  };

  const countdownMs = useMemo(() => msUntilMidnightEST(), [now]);

  // ── Results / completed view ─────────────────────────────
  if (!loading && completed) {
    if (!userId) {
      return <SignInGate onSignIn={() => navigate('/auth', { state: { from: '/daily-battle' } })} onBack={() => navigate(-1)} />;
    }
    return <ResultsScreen pairs={pairs} picks={picks} results={results} countdown={countdownMs} onBack={() => navigate(-1)} />;
  }

  return (
    <>
      <Seo
        title="Today's Battle — Daily This or That | PokeIQ"
        description="Vote on today's 5 shared card matchups. See live community results after every pick."
      />
      <main className="min-h-screen flex flex-col bg-background">
        <div className="max-w-4xl mx-auto w-full px-4 pt-4 pb-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">Today's Battle</h1>
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-primary font-semibold bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                  Daily
                </span>
              </div>
              <p className="text-[11px] sm:text-sm text-muted-foreground truncate">
                Everyone on PokeIQ is voting on the same 5 matchups today.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Resets in</div>
              <div className="tabular-nums text-sm font-semibold">{formatCountdown(countdownMs)}</div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="mb-4 sm:mb-6 flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const done = i < picks.length;
              const active = i === index && !completed;
              return (
                <div
                  key={i}
                  className={`h-2.5 rounded-full transition-all ${done ? 'w-8 bg-primary' : active ? 'w-8 bg-primary/40' : 'w-2.5 bg-muted'}`}
                />
              );
            })}
            <span className="ml-2 text-xs text-muted-foreground tabular-nums">
              {Math.min(picks.length, 5)} of 5
            </span>
          </div>

          {/* Cards */}
          {loading || !currentPair ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative flex flex-col md:flex-row items-center justify-center gap-1 md:gap-12 w-full">
                  <CardFace
                    card={currentPair.a}
                    state={
                      locked == null
                        ? 'idle'
                        : locked.winnerId === currentPair.a.card_id
                          ? 'winner'
                          : 'loser'
                    }
                    pct={pctFor(currentPair.a.card_id)}
                    showPct={false}
                    onPick={() => onPick(currentPair.a, currentPair.b)}
                  />

                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 select-none"
                  >
                    <div
                      className="relative flex items-center justify-center rounded-full px-4 py-1.5 sm:px-6 sm:py-2.5 border-2 border-primary/70 bg-background/85 backdrop-blur-md"
                      style={{ boxShadow: '0 0 0 4px hsl(var(--background) / 0.5), 0 10px 40px hsl(var(--primary) / 0.45)' }}
                    >
                      <span
                        className="font-black italic tracking-tighter text-3xl sm:text-5xl bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent"
                      >
                        VS
                      </span>
                    </div>
                  </div>

                  <CardFace
                    card={currentPair.b}
                    state={
                      locked == null
                        ? 'idle'
                        : locked.winnerId === currentPair.b.card_id
                          ? 'winner'
                          : 'loser'
                    }
                    pct={pctFor(currentPair.b.card_id)}
                    showPct={false}
                    onPick={() => onPick(currentPair.b, currentPair.a)}
                  />
                </div>
              </div>

              <div className="mt-4 text-center min-h-[24px]">
                {locked ? (
                  <p className="text-xs sm:text-sm text-muted-foreground inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-primary" />
                    Locked in — results at the end
                  </p>
                ) : (
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Tap the card you like more
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function ResultsScreen({
  pairs,
  picks,
  results,
  countdown,
  onBack,
}: {
  pairs: DailyBattlePair[];
  picks: UserPick[];
  results: DailyBattleResults;
  countdown: number;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const score = agreementScore(picks, results);
  const totalVoters = Object.values(results).reduce<number>((max, tally) => {
    const t = Object.values(tally).reduce<number>((s, n) => s + (n as number), 0);
    return t > max ? t : max;
  }, 0);

  return (
    <>
      <Seo title={`Today's Battle Results — ${score}% agreement | PokeIQ`} description="See how your picks compare to the community." />
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto w-full px-4 pt-4 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">Today's Results</h1>
              <p className="text-[11px] sm:text-sm text-muted-foreground">
                {estToday()} • Next battle in {formatCountdown(countdown)}
              </p>
            </div>
          </div>

          {/* Agreement hero */}
          <Card className="p-6 mb-5 text-center bg-primary/[0.06] border-primary/25">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 mb-2">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="text-5xl font-black tabular-nums text-primary">{score}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              You agreed with the community on {Math.round((score / 100) * picks.length)} of {picks.length} battles
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalVoters.toLocaleString()} collector{totalVoters === 1 ? '' : 's'} voted today
            </p>
          </Card>

          {/* Pro upsell */}
          <ProUpsell />

          {/* Per-matchup breakdown */}
          <div className="space-y-3 mt-5">
            {pairs.map((pair, i) => {
              const tally = results[i] || {};
              const total = Object.values(tally).reduce<number>((s, n) => s + (n as number), 0) || 1;
              const myPick = picks.find((p) => p.matchup_index === i)?.winner_card_id;
              const pctA = Math.round(((tally[pair.a.card_id] || 0) / total) * 100);
              const pctB = 100 - pctA;
              const winner = pctA >= pctB ? pair.a : pair.b;
              const myWinner = myPick === winner.card_id;
              return (
                <Card key={i} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] font-semibold text-muted-foreground w-6 text-center">#{i + 1}</div>
                    <MiniCard card={pair.a} pct={pctA} isMine={myPick === pair.a.card_id} isWinner={pctA >= pctB} />
                    <div className="text-[10px] uppercase text-muted-foreground">vs</div>
                    <MiniCard card={pair.b} pct={pctB} isMine={myPick === pair.b.card_id} isWinner={pctB > pctA} />
                    <div className="w-16 text-right text-[11px] text-muted-foreground">
                      {myWinner ? <span className="text-primary font-semibold">Match</span> : <span>Miss</span>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/matches')}>
              Back to matches
            </Button>
            <Button onClick={() => navigate('/swipe')}>Keep swiping</Button>
          </div>
        </div>
      </main>
    </>
  );
}

function MiniCard({
  card,
  pct,
  isMine,
  isWinner,
}: {
  card: DailyBattleCard;
  pct: number;
  isMine: boolean;
  isWinner: boolean;
}) {
  const [err, setErr] = useState(false);
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <div
        className={`relative w-10 h-14 rounded-md overflow-hidden border ${isMine ? 'border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.35)]' : 'border-border'} bg-muted/30 shrink-0`}
      >
        {card.image_url && !err ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{card.name}</div>
        <div className={`text-sm font-bold tabular-nums ${isWinner ? 'text-primary' : 'text-muted-foreground'}`}>{pct}%</div>
      </div>
    </div>
  );
}

function SignInGate({ onSignIn, onBack }: { onSignIn: () => void; onBack: () => void }) {
  return (
    <>
      <Seo title="Sign in to see your results — Daily Battle | PokeIQ" description="Create a free account to unlock today's community results and unlock Pro perks." />
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto w-full px-4 pt-4 pb-16">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">All 5 battles locked in</h1>
          </div>

          <Card className="p-6 text-center bg-primary/[0.06] border-primary/25 mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Sign in to see your results</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Create a free account to reveal how you stacked up against the community — and save today's picks to your Collector DNA.
            </p>
            <Button size="lg" className="mt-5 w-full sm:w-auto px-8" onClick={onSignIn}>
              Sign in to reveal results
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">Free forever. No credit card.</p>
          </Card>

          <ProUpsell />
        </div>
      </main>
    </>
  );
}

function ProUpsell() {
  return (
    <Card className="p-4 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-transparent">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Keep battling with PokeIQ Pro</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            +200 personalized battles every month to train your Collector DNA and sharpen your recommendations.
          </p>
        </div>
        <Link to="/premium">
          <Button size="sm" className="shrink-0">Go Pro</Button>
        </Link>
      </div>
    </Card>
  );
}