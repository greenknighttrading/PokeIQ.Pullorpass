import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchStreak, onStreakChange, isActiveToday, type StreakInfo } from '@/lib/streak';
import { supabase } from '@/integrations/supabase/client';

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
    <div
      title={active ? `${streak.current}-day streak — see you tomorrow!` : 'Swipe or battle today to keep your streak'}
      className={cn(
        'flex items-center gap-1 h-8 px-2.5 rounded-full border text-sm font-semibold tabular-nums',
        active ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-muted/40 border-border text-muted-foreground',
      )}
    >
      <Flame className={cn('w-4 h-4', !active && 'opacity-60')} />
      {streak.current}
    </div>
  );
}
