import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchMyPicks, msUntilMidnightEST } from '@/lib/dailyBattle';

interface Props {
  variant?: 'default' | 'hero';
  className?: string;
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

export function DailyBattleEntryCard({ variant = 'default', className = '' }: Props) {
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [countdown, setCountdown] = useState(msUntilMidnightEST());

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user && !session.user.is_anonymous ? session.user.id : null;
      if (uid) {
        const picks = await fetchMyPicks();
        setCompletedCount(picks.length);
      }
      setLoaded(true);
    })();
    const t = window.setInterval(() => setCountdown(msUntilMidnightEST()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const done = completedCount >= 5;
  const cta = done ? 'View Results' : completedCount > 0 ? 'Continue Battle' : 'Start Battle';

  if (variant === 'hero') {
    return (
      <Link
        to="/daily-battle"
        className={`block group ${className}`}
        aria-label={done ? "View today's battle results" : "Play today's battle"}
      >
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.14] via-background to-background hover:from-primary/[0.2] transition-colors p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
              {done ? (
                <Check className="w-7 h-7 sm:w-9 sm:h-9 text-primary" strokeWidth={2.5} />
              ) : (
                <Swords className="w-7 h-7 sm:w-9 sm:h-9 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Free · Everyone Plays
                </span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Today's Battle
              </h2>
              {!done && loaded && (
                <div className="mt-1 text-sm font-semibold text-primary tabular-nums">
                  {completedCount}/5
                </div>
              )}
              {done && (
                <div className="mt-1 text-sm font-semibold text-primary uppercase tracking-wider">
                  Completed
                </div>
              )}
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg">
                {done
                  ? 'Compare your picks with the community now that you\'ve finished.'
                  : 'The same 5 matchups for every collector today. Compare your results with the community after you finish.'}
              </p>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3.5 text-base font-semibold shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-transform group-hover:translate-x-0.5">
                {cta} <ArrowRight className="w-5 h-5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/daily-battle"
      className={`block group ${className}`}
      aria-label={done ? "View today's battle results" : "Play today's battle"}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background to-background hover:from-primary/[0.12] transition-colors"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-4">
          <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            {done ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={2.5} />
            ) : (
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Today's Battle
              </span>
              {!done && loaded && (
                <span className="text-[10px] sm:text-[10px] text-muted-foreground tabular-nums">
                  {completedCount}/5
                </span>
              )}
              {done && (
                <span className="text-[10px] sm:text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Completed
                </span>
              )}
            </div>
            <div className="hidden sm:block text-sm sm:text-base font-semibold text-foreground truncate">
              {done ? "See how you compare to everyone" : 'Pick your favorite of two cards'}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1 text-primary text-sm font-semibold">
            <span className="hidden sm:inline">{cta}</span>
            <span className="sm:hidden">{done ? 'Results' : completedCount > 0 ? 'Continue' : 'Start'}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}