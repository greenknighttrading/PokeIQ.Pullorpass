import { supabase } from '@/integrations/supabase/client';

export interface DailyBattleCard {
  card_id: string;
  name: string;
  set_name: string | null;
  rarity: string | null;
  price: number;
  image_url: string | null;
}

export interface DailyBattlePair {
  a: DailyBattleCard;
  b: DailyBattleCard;
}

export interface DailyBattleResults {
  // matchup_index -> { card_id -> votes }
  [matchupIndex: number]: Record<string, number>;
}

export interface UserPick {
  matchup_index: number;
  winner_card_id: string;
}

/** Today's date in America/New_York (EST/EDT). */
export function estToday(): string {
  const nowNY = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const d = new Date(nowNY);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function msUntilMidnightEST(): number {
  const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const tomorrow = new Date(nowNY);
  tomorrow.setHours(24, 0, 0, 0);
  return Math.max(1000, tomorrow.getTime() - nowNY.getTime());
}

export async function fetchDailyBattles(): Promise<DailyBattlePair[]> {
  const { data, error } = await supabase.rpc('ensure_daily_battles' as any);
  if (error) throw error;
  return (data as DailyBattlePair[]) ?? [];
}

export async function fetchMyPicks(): Promise<UserPick[]> {
  const { data, error } = await supabase.rpc('get_my_daily_battle_picks' as any);
  if (error) return [];
  return (data as UserPick[]) ?? [];
}

export async function fetchCommunityResults(): Promise<DailyBattleResults> {
  const { data, error } = await supabase.rpc('get_daily_battle_results' as any);
  if (error || !data) return {};
  const out: DailyBattleResults = {};
  for (const row of data as Array<{ matchup_index: number; winner_card_id: string; votes: number }>) {
    if (!out[row.matchup_index]) out[row.matchup_index] = {};
    out[row.matchup_index][row.winner_card_id] = Number(row.votes);
  }
  return out;
}

export async function submitDailyVote(params: {
  matchupIndex: number;
  pair: DailyBattlePair;
  winner: DailyBattleCard;
  loser: DailyBattleCard;
  userId: string;
}): Promise<void> {
  const { matchupIndex, pair, winner, loser, userId } = params;
  const { error } = await supabase.from('this_or_that_matchups').insert([{
    user_id: userId,
    card_a_id: pair.a.card_id,
    card_b_id: pair.b.card_id,
    winner_card_id: winner.card_id,
    loser_card_id: loser.card_id,
    winner_name: winner.name,
    winner_set: winner.set_name,
    winner_rarity: winner.rarity,
    winner_price: winner.price,
    battle_date: estToday(),
    matchup_index: matchupIndex,
  }]);
  // Ignore unique violations (double submits)
  if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
    console.warn('daily vote insert failed', error);
  }
}

export function agreementScore(myPicks: UserPick[], results: DailyBattleResults): number {
  if (!myPicks.length) return 0;
  let matches = 0;
  for (const p of myPicks) {
    const tally = results[p.matchup_index] || {};
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (top && top[0] === p.winner_card_id) matches++;
  }
  return Math.round((matches / myPicks.length) * 100);
}