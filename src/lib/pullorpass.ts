// Collector DNA trait system for PULLorPASS

export type Decision = 'pull' | 'pass';

export interface SwipeCard {
  card_id: string;
  name: string;
  set_name: string | null;
  image_url: string | null;
  price: number;
  rarity: string | null;
}

export interface SwipeRecord {
  card: SwipeCard;
  decision: Decision;
  tags: string[];
}

// Emotional tag groups shown after a Pull
export const TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: 'Cozy / Comfort', tags: ['Cozy', 'Peaceful', 'Relaxing', 'Warm', 'Safe'] },
  { label: 'Joy / Humor', tags: ['Cute', 'Funny', 'Wholesome', 'Silly', 'Joyful'] },
  { label: 'Power / Energy', tags: ['Aggressive', 'Powerful', 'Chaotic', 'Competitive', 'Intense'] },
  { label: 'Wonder / Adventure', tags: ['Adventurous', 'Magical', 'Dreamlike', 'Mysterious', 'Epic'] },
  { label: 'Nostalgia / Emotion', tags: ['Nostalgic', 'Emotional', 'Lonely', 'Hopeful', 'Encouraging'] },
  { label: 'Internet / Meme', tags: ['Main Character', 'Gremlin Energy', 'Goblin Mode', 'Sleepy', 'Hungry'] },
];

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

// Map each tag to a higher-level trait dimension
const TAG_TO_TRAIT: Record<string, string> = {
  Cozy: 'cozy', Peaceful: 'cozy', Relaxing: 'cozy', Warm: 'cozy', Safe: 'cozy',
  Cute: 'joyful', Funny: 'joyful', Wholesome: 'joyful', Silly: 'joyful', Joyful: 'joyful',
  Aggressive: 'chaotic', Powerful: 'chaotic', Chaotic: 'chaotic', Competitive: 'chaotic', Intense: 'chaotic',
  Adventurous: 'adventurous', Magical: 'adventurous', Dreamlike: 'adventurous', Mysterious: 'adventurous', Epic: 'adventurous',
  Nostalgic: 'nostalgic', Emotional: 'nostalgic', Lonely: 'nostalgic', Hopeful: 'nostalgic', Encouraging: 'nostalgic',
  'Main Character': 'meme', 'Gremlin Energy': 'meme', 'Goblin Mode': 'meme', Sleepy: 'meme', Hungry: 'meme',
};

export const ARCHETYPES: Record<string, { name: string; tagline: string }> = {
  cozy: { name: 'The Cozy Collector', tagline: 'You gravitate toward warm, peaceful cards with comforting scenery and emotional storytelling.' },
  joyful: { name: 'The Joyful Optimist', tagline: 'You love bright, cute, wholesome cards that make you smile.' },
  chaotic: { name: 'The Chaos Goblin', tagline: 'You\'re drawn to loud, expressive, energetic cards full of personality.' },
  adventurous: { name: 'The Adventure Hunter', tagline: 'You love movement, exploration, wonder, and cinematic artwork.' },
  nostalgic: { name: 'The Nostalgia Keeper', tagline: 'You emotionally connect with timeless Pokémon imagery and familiar aesthetics.' },
  meme: { name: 'The Vibe Curator', tagline: 'You speak fluent internet — your collection has personality and humor.' },
};

export interface RoundAnalysis {
  pulls: number;
  passes: number;
  topTags: { tag: string; count: number }[];
  topTrait: string;
  archetype: { name: string; tagline: string } | null;
  favoriteSets: { set: string; count: number }[];
  avgPullPrice: number;
  summary: string;
}

export function analyzeRound(records: SwipeRecord[]): RoundAnalysis {
  const pulls = records.filter((r) => r.decision === 'pull');
  const passes = records.filter((r) => r.decision === 'pass');

  const tagCounts = new Map<string, number>();
  const traitCounts = new Map<string, number>();
  pulls.forEach((r) => {
    r.tags.forEach((t) => {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      const trait = TAG_TO_TRAIT[t];
      if (trait) traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + 1);
    });
  });

  const topTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTrait = Array.from(traitCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const archetype = topTrait ? ARCHETYPES[topTrait] : null;

  const setCounts = new Map<string, number>();
  pulls.forEach((r) => {
    const s = r.card.set_name;
    if (s) setCounts.set(s, (setCounts.get(s) ?? 0) + 1);
  });
  const favoriteSets = Array.from(setCounts.entries())
    .map(([set, count]) => ({ set, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const avgPullPrice = pulls.length
    ? pulls.reduce((s, r) => s + (r.card.price || 0), 0) / pulls.length
    : 0;

  const summary = archetype
    ? archetype.tagline
    : pulls.length === 0
    ? 'You passed on everything this round — try another for a clearer signal.'
    : 'Your taste is still taking shape. Run another round to sharpen your Collector DNA.';

  return { pulls: pulls.length, passes: passes.length, topTags, topTrait, archetype, favoriteSets, avgPullPrice, summary };
}

// Deterministic diverse N-card sampler from a candidate pool (defaults to 20).
// Pass `rand` (a seeded PRNG returning [0,1)) to make the selection stable
// per user/day — so reloading shows the same cards.
export function pickDiverse20(
  pool: SwipeCard[],
  count: number = 20,
  rand: () => number = Math.random,
): SwipeCard[] {
  // Bucket by price tier x set, then take round-robin
  const tier = (p: number) => (p < 15 ? 'low' : p < 50 ? 'mid' : p < 200 ? 'high' : 'chase');
  const buckets = new Map<string, SwipeCard[]>();
  const shuffled = [...pool].sort(() => rand() - 0.5);
  for (const c of shuffled) {
    const key = `${tier(c.price)}::${c.set_name ?? '?'}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }
  const keys = Array.from(buckets.keys()).sort(() => rand() - 0.5);
  const out: SwipeCard[] = [];
  let i = 0;
  while (out.length < count && keys.length > 0) {
    const k = keys[i % keys.length];
    const arr = buckets.get(k)!;
    if (arr.length) out.push(arr.shift()!);
    else { keys.splice(i % keys.length, 1); continue; }
    i++;
  }
  return out.slice(0, count);
}

// Tiny seeded PRNG (mulberry32) — same seed always produces the same stream.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}