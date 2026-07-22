import { useNavigate } from 'react-router-dom';
import { Trophy, Sparkles, ArrowRight, Lock, Crown } from 'lucide-react';
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
        description="Compete with every PokeIQ collector. Play the free Daily Battle, climb the Leaderboard, and unlock the Unlimited Arena with Pro."
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Arena</span>
          </div>

          {/* Section 1: Daily Battle — hero, free for everyone */}
          <section>
            <DailyBattleEntryCard variant="hero" />
          </section>

          {/* Section 2: Leaderboard — the social destination */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Leaderboard</h2>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-background to-background p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-foreground">
                    See where you rank
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Compete with collectors around the world. Earn points from Daily Battles, swipes, and community participation to climb from Rising to Expert.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/leaderboard')}
                  variant="outline"
                  className="gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 shrink-0"
                >
                  View Leaderboard <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* Section 3: Unlimited Arena — the endless premium mode */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-300" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Unlimited Arena</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Premium
              </span>
            </div>
            <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.08] via-background to-background p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-foreground">
                    Over 1 billion possible battles
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Create your perfect Pokémon card rankings through unlimited personalized matchups. Every battle teaches PokeIQ your taste and delivers increasingly accurate recommendations.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                        variant="ghost"
                        onClick={() => navigate('/this-or-that')}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Preview
                      </Button>
                      <Button
                        onClick={() => navigate('/premium')}
                        className="gap-2 bg-violet-500 hover:bg-violet-500/90 text-white"
                      >
                        <Lock className="w-3.5 h-3.5" /> Enter Unlimited Arena
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground/80 uppercase tracking-wider">
                Unlimited battles · Personalized matchups · Premium
              </p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
