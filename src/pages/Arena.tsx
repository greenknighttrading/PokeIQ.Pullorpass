import { Link, useNavigate } from 'react-router-dom';
import { Crown, Trophy, Swords, Sparkles, ArrowRight, Lock } from 'lucide-react';
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
        title="Arena — Daily Battle, This or That, Leaderboard"
        description="Compete with every PokeIQ collector. Play the free Daily Battle, unlock This or That with Pro, and climb the Leaderboard."
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
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
              A shared daily playground for every collector. Battle other trainers, sharpen your taste, and see where you rank.
            </p>
          </header>

          {/* Daily Battle hero — free for everyone */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">Daily Battle</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Free · Everyone plays
              </span>
            </div>
            <DailyBattleEntryCard />
            <p className="text-xs text-muted-foreground pl-1">
              Same 5 matchups for every collector today. Resets at midnight EST.
            </p>
          </section>

          {/* This or That — premium */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-300" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">This or That</h2>
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
                    200 personalized battles
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Pick your favorite of two cards, over and over — train your taste and get sharper recommendations.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isPremium ? (
                    <Button
                      onClick={() => navigate('/this-or-that')}
                      className="gap-2 bg-violet-500 hover:bg-violet-500/90 text-white"
                    >
                      Play <ArrowRight className="w-4 h-4" />
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
                        <Lock className="w-3.5 h-3.5" /> Unlock with Pro
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Leaderboard */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Leaderboard</h2>
            </div>
            <Link
              to="/leaderboard"
              className="block group rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] via-background to-background hover:from-amber-500/[0.1] transition-colors p-4 sm:p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-foreground">
                    See how you rank
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Top collectors, ranked by swipes and tags. Climb the tiers from Rising to Expert.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </div>
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}