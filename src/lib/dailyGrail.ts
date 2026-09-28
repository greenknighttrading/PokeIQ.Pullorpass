import { supabase } from '@/integrations/supabase/client';
import type { SwipeCard } from '@/lib/pullorpass';

const KEY = 'pop_grail_day';
export const GRAIL_CARD_KEY = 'pop_grail_card_id';

function estDay() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Returns a grail card once per EST day (null otherwise). Scores by affinity to liked Pokémon/sets + price. */
export async function pickDailyGrail(pool: SwipeCard[], _picked: SwipeCard[]): Promise<SwipeCard | null> {
  if (localStorage.getItem(KEY) === estDay() || pool.length === 0) return null;

  const pokemon = new Map<string, number>();
  const sets = new Map<string, number>();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data } = await supabase
      .from('pokeiq_likes')
      .select('pokemon_name, set_name')
      .eq('user_id', session.user.id)
      .limit(300);
    (data ?? []).forEach((l) => {
      if (l.pokemon_name) pokemon.set(l.pokemon_name.toLowerCase(), (pokemon.get(l.pokemon_name.toLowerCase()) ?? 0) + 1);
      if (l.set_name) sets.set(l.set_name, (sets.get(l.set_name) ?? 0) + 1);
    });
  }

  const prices = pool.map((c) => c.price).sort((a, b) => a - b);
  const p75 = prices[Math.floor(prices.length * 0.75)] ?? 0;
  let best: SwipeCard | null = null;
  let bestScore = -1;
  for (const c of pool) {
    if (c.price < p75) continue;
    const lname = c.name.toLowerCase();
    let s = Math.log10(c.price + 1);
    for (const [p, n] of pokemon) if (lname.includes(p)) s += Math.min(n, 5) * 1.5;
    if (c.set_name && sets.has(c.set_name)) s += Math.min(sets.get(c.set_name)!, 5);
    s += Math.random() * 0.5;
    if (s > bestScore) { bestScore = s; best = c; }
  }
  if (!best) return null;
  localStorage.setItem(KEY, estDay());
  localStorage.setItem(GRAIL_CARD_KEY, best.card_id);
  return best;
}

export function isGrailCard(cardId: string | undefined) {
  return !!cardId && localStorage.getItem(GRAIL_CARD_KEY) === cardId;
}
