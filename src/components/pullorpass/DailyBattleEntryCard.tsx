import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchMyPicks, msUntilMidnightEST } from '@/lib/dailyBattle';

interface Props {
  variant?: 'default' | 'compact';
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
  const cta = done ? 'View Results' : completedCount > 0 ? 'Continue' : 'Start';

  return (
    <Link
      to="/daily-battle"
      className={`block group ${className}`}
      aria-label={done ? "View today's battle results" : "Play today's battle"}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-background to-background hover:from-primary/[0.12] transition-colors"
      >
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            {done ? (
              <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
            ) : (
              <Swords className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                Today's Battle
              </span>
              {!done && loaded && (
                <span className="text-[9px] sm:text-[10px] text-muted-foreground tabular-nums">
                  {completedCount}/5
                </span>
              )}
              {done && (
                <span className="text-[9px] sm:text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Completed
                </span>
              )}
            </div>
            <div className="text-sm sm:text-base font-semibold text-foreground truncate">
              {done ? "See how you compare to everyone" : 'Pick your favorite of two cards'}
            </div>
            {variant === 'default' && (
              <div className="hidden sm:flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i < completedCount ? 'bg-primary' : 'bg-muted'}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Resets in {formatCountdown(countdown)}
                </span>
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1 text-primary text-sm font-semibold">
            {cta}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}