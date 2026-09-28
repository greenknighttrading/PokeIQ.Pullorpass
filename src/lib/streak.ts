import { supabase } from '@/integrations/supabase/client';

export interface StreakInfo { current: number; longest: number; last_active_date: string | null }

const EVT = 'pokeiq:streak';
let lastRecordedDay: string | null = null;

function todayEST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Records today's activity (swipe or battle). Cheap: runs at most once per day per tab. */
export async function recordDailyActivity(): Promise<void> {
  const day = todayEST();
  if (lastRecordedDay === day) return;
  lastRecordedDay = day;
  const { data, error } = await supabase.rpc('record_daily_activity');
  if (error) { lastRecordedDay = null; return; }
  if (data) window.dispatchEvent(new CustomEvent(EVT, { detail: data }));
}

export async function fetchStreak(): Promise<StreakInfo | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_active_date')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!data) return { current: 0, longest: 0, last_active_date: null };
  // Streak is broken if last activity was before yesterday (EST)
  const today = todayEST();
  const y = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const alive = data.last_active_date === today || data.last_active_date === y;
  return { current: alive ? data.current_streak : 0, longest: data.longest_streak, last_active_date: data.last_active_date };
}

export function onStreakChange(cb: (s: StreakInfo) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}

export function isActiveToday(s: StreakInfo | null) {
  return !!s && s.last_active_date === todayEST();
}
