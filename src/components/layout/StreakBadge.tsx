import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchStreak, onStreakChange, isActiveToday, type StreakInfo } from '@/lib/streak';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function StreakBadge() {
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useEffect(() => {
    fetchStreak().then(setStreak);
    const off = onStreakChange(setStreak);
    const { data: sub } = supabase.auth.onAuthStateChange(() => fetchStreak().then(setStreak));
    return () => { off(); sub.subscription.unsubscribe(); };
  }, []);

  if (!streak) return null;
  const active = isActiveToday(streak);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Daily streak"
          className={cn(
            'flex items-center gap-1 h-8 px-2.5 rounded-full border text-sm font-semibold tabular-nums',
            active ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-muted/40 border-border text-muted-foreground',
          )}
        >
          <Flame className={cn('w-4 h-4', !active && 'opacity-60')} />
          {streak.current}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Flame className="w-4 h-4 text-accent" /> Daily Streak
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {streak.current} day{streak.current === 1 ? '' : 's'} · Best {streak.longest}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {active ? 'Done for today — see you tomorrow!' : 'Swipe or battle today to keep it going.'}
        </p>
      </PopoverContent>
    </Popover>
  );
}
