import { Link, useNavigate } from 'react-router-dom';
import { Crown, Trophy, Swords, Infinity as InfinityIcon, ArrowRight, Lock } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import { DailyBattleEntryCard } from '@/components/pullorpass/DailyBattleEntryCard';
import { useIsPremium } from '@/hooks/useIsPremium';

export default function Arena() {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();

  return (
    <>
      <Seo
        title="Arena — Daily Battle, Leaderboard, Unlimited Arena"
        description="Play the free Daily Battle, climb the Leaderboard, and unlock Unlimited Arena with Pro — over 1 billion possible matchups."
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
          {/* Header */}
          <header className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <Trophy className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Arena</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Play, compete, climb.
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Three game modes. One arena. Play today's shared battle, see where you rank, then go unlimited.
            </p>
          </header>

          {/* Section 1 — Daily Battle hero (featured) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Daily Battle</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Free · Everyone plays
              </span>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.14] via-primary/[0.04] to-background p-5 sm:p-8">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <div className="relative space-y-4 sm:space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Swords className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight">Today's Battle</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Resets at midnight EST</div>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground max-w-lg">
                  The same 5 matchups for every collector today. Compare your results with the community after you finish.
                </p>
                <DailyBattleEntryCard />
              </div>
            </div>
          </section>

          {/* Section 2 — Leaderboard */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Leaderboard</h2>
            </div>
            <Link
              to="/leaderboard"
              className="block group rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-background to-background hover:from-amber-500/[0.12] transition-colors p-5 sm:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold text-foreground">See where you rank</div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Compete with collectors around the world. Earn points from Daily Battles, swipes, and community participation to climb from Rising to Legend.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-400">
                    View Leaderboard <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          </section>

          {/* Section 3 — Unlimited Arena (premium) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <InfinityIcon className="w-4 h-4 text-violet-300" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Unlimited Arena</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
            </div>
            <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.10] via-background to-background p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <InfinityIcon className="w-6 h-6 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <div className="text-lg sm:text-xl font-semibold text-foreground">Over 1 billion possible battles</div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Create your perfect Pokémon card rankings through unlimited personalized matchups. Every battle teaches PokeIQ your taste and delivers increasingly accurate recommendations.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isPremium ? (
                      <Button
                        onClick={() => navigate('/this-or-that')}
                        className="gap-2 bg-violet-500 hover:bg-violet-500/90 text-white"
                      >
                        Enter Unlimited Arena <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => navigate('/premium')}
                          className="gap-2 bg-violet-500 hover:bg-violet-500/90 text-white"
                        >
                          <Lock className="w-3.5 h-3.5" /> Enter Unlimited Arena
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => navigate('/this-or-that')}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Preview
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80">
                    Unlimited battles · Personalized matchups · Premium
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}