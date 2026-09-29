import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Infinity as InfinityIcon, ChevronRight, Lock } from 'lucide-react';
import { Seo } from '@/components/seo/Seo';
import { DailyBattleEntryCard } from '@/components/pullorpass/DailyBattleEntryCard';
import { useIsPremium } from '@/hooks/useIsPremium';

export default function Arena() {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();

  return (
    <>
      <Seo
        title="Arena — Daily Battle, Leaderboard, Unlimited Arena"
        description="Play the free Daily Battle, climb the Leaderboard, and unlock Unlimited Arena with Pro."
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight">Arena</h1>
            <p className="text-sm text-muted-foreground">Today's battle resets at midnight EST.</p>
          </header>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <DailyBattleEntryCard />
          </section>

          <section className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            <Link to="/leaderboard" className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
              <Trophy className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">Leaderboard</div>
                <div className="text-xs text-muted-foreground">See where you rank</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <button
              type="button"
              onClick={() => navigate(isPremium ? '/this-or-that' : '/premium')}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
            >
              <InfinityIcon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  Unlimited Arena
                  {!isPremium && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground">Endless personalized battles · Pro</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </section>
        </main>
      </div>
    </>
  );
}
