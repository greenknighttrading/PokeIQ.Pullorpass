// Taste Profile builder — PokeIQ
//
// PHILOSOPHY:
//   Collector Personality (the quiz) = "How you collect."
//   Taste Profile (this file)        = "What your eye naturally gravitates toward."
//
// We deliberately do NOT output an archetype name here. Output is layered,
// descriptive, behavior-driven — Spotify-Wrapped-style observations that
// evolve with every swipe.

export interface TasteInputs {
  vibes: { tag: string; count: number }[]; // user's adjective tag totals
  topSets: [string, number][];              // [setName, count]
  avgPrice: number;                         // avg match price
  swipesCount: number;
  matchesCount: number;
  likesCount: number;
  matchRarities?: string[];                 // optional — rarities of matched cards
  personalityType?: string | null;          // e.g. "Investor", "Gambler"
}

export interface TasteProfile {
  headline: string;                 // descriptive sentence (NOT an archetype name)
  descriptors: string[];            // layered taste descriptors
  priceTier: { label: string; avg: number };
  setLean: string[];                // 1-2 sets the eye keeps landing on
  selectivityNote: string;
  paragraphs: string[];             // observational, evolving prose
  insights: string[];               // contradictions / sharp observations
}

// ───────────────────────────────────────────────────────────
// Approved descriptor pool (no archetype names allowed).
// ───────────────────────────────────────────────────────────
const DESCRIPTORS = {
  Mysterious: 'Mysterious',
  Warm: 'Warm',
  Relaxing: 'Relaxing',
  Colorful: 'Colorful',
  Atmospheric: 'Atmospheric',
  GrailOriented: 'Grail-Oriented',
  Minimalist: 'Minimalist',
  Cute: 'Cute',
  Powerful: 'Powerful',
  Nostalgic: 'Nostalgic',
  VintageLeaning: 'Vintage-Leaning',
  AltArtFocused: 'Alt-Art Focused',
} as const;

// Map raw emotional tags → descriptor(s).
const TAG_TO_DESCRIPTORS: Record<string, string[]> = {
  Cozy: ['Warm', 'Relaxing'],
  Peaceful: ['Relaxing', 'Atmospheric'],
  Relaxing: ['Relaxing'],
  Warm: ['Warm'],
  Safe: ['Warm'],
  Cute: ['Cute'],
  Funny: ['Colorful', 'Cute'],
  Wholesome: ['Warm', 'Cute'],
  Silly: ['Colorful', 'Cute'],
  Joyful: ['Colorful'],
  Aggressive: ['Powerful'],
  Powerful: ['Powerful'],
  Chaotic: ['Powerful', 'Colorful'],
  Competitive: ['Powerful'],
  Intense: ['Powerful', 'Atmospheric'],
  Adventurous: ['Atmospheric'],
  Magical: ['Atmospheric', 'Mysterious'],
  Dreamlike: ['Mysterious', 'Atmospheric'],
  Mysterious: ['Mysterious'],
  Epic: ['Powerful', 'Atmospheric'],
  Nostalgic: ['Nostalgic'],
  Emotional: ['Nostalgic', 'Warm'],
  Lonely: ['Mysterious', 'Atmospheric'],
  Hopeful: ['Warm'],
  Encouraging: ['Warm'],
  'Main Character': ['Powerful', 'Colorful'],
  'Gremlin Energy': ['Colorful', 'Cute'],
  'Goblin Mode': ['Colorful', 'Cute'],
  Sleepy: ['Cute', 'Relaxing'],
  Hungry: ['Cute'],
};

const VINTAGE_SET_HINTS = [
  'Base Set', 'Jungle', 'Fossil', 'Team Rocket', 'Gym ',
  'Neo ', 'Expedition', 'Aquapolis', 'Skyridge',
  'Ruby & Sapphire', 'EX ', 'Crystal',
];

const ALT_ART_HINTS = [
  'illustration rare', 'special illustration', 'hyper rare',
  'alt art', 'alternate art', 'art rare', 'secret rare',
];

function isVintageSet(set: string): boolean {
  return VINTAGE_SET_HINTS.some((h) => set.toLowerCase().includes(h.toLowerCase()));
}

function priceTierLabel(avg: number): string {
  if (avg <= 0) return 'still learning';
  if (avg < 15) return 'hidden-gem territory';
  if (avg < 50) return 'mid-tier sweet spot';
  if (avg < 150) return 'premium pulls';
  return 'grail territory';
}

// Light-touch personality grouping for contradiction lines.
function personalityFlavor(t?: string | null) {
  if (!t) return null;
  const conservative = ['Investor', 'Analyst', 'Minimalist'];
  const emotional    = ['Dreamer', 'Curator', 'Showman'];
  const fast         = ['Flipper', 'Gambler', 'Hunter', 'Explorer'];
  if (conservative.includes(t)) return 'conservative';
  if (emotional.includes(t))    return 'emotional';
  if (fast.includes(t))         return 'fast';
  return 'balanced';
}

export function buildTasteProfile(input: TasteInputs): TasteProfile {
  const {
    vibes, topSets, avgPrice, swipesCount, matchesCount, likesCount,
    matchRarities = [], personalityType,
  } = input;

  // 1. Descriptor scoring from tag votes.
  const score: Record<string, number> = {};
  vibes.forEach((v) => {
    const ds = TAG_TO_DESCRIPTORS[v.tag];
    if (!ds) return;
    ds.forEach((d) => { score[d] = (score[d] ?? 0) + v.count; });
  });

  // 2. Behavioral descriptors layered on top.
  if (avgPrice >= 150) score[DESCRIPTORS.GrailOriented] = (score[DESCRIPTORS.GrailOriented] ?? 0) + 5;
  const pullRate = swipesCount > 0 ? (matchesCount + likesCount) / swipesCount : 0;
  if (pullRate > 0 && pullRate <= 0.3) score[DESCRIPTORS.Minimalist] = (score[DESCRIPTORS.Minimalist] ?? 0) + 4;
  if (topSets.some(([s]) => isVintageSet(s))) score[DESCRIPTORS.VintageLeaning] = (score[DESCRIPTORS.VintageLeaning] ?? 0) + 4;
  if (matchRarities.some((r) => ALT_ART_HINTS.some((h) => (r || '').toLowerCase().includes(h)))) {
    score[DESCRIPTORS.AltArtFocused] = (score[DESCRIPTORS.AltArtFocused] ?? 0) + 5;
  }

  const descriptors = Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([d]) => d);

  // 3. Headline — descriptive sentence, not a label.
  const top2 = descriptors.slice(0, 2).map((d) => d.toLowerCase());
  const headline =
    descriptors.length === 0
      ? 'PokeIQ is still learning your eye.'
      : top2.length === 1
      ? `Your eye leans ${top2[0]}.`
      : `Your eye leans ${top2[0]} and ${top2[1]}.`;

  // 4. Selectivity tone.
  let selectivityNote = 'balanced — you reward cards that earn it';
  if (pullRate >= 0.7) selectivityNote = 'open-hearted — you find something to love in most pulls';
  else if (pullRate > 0 && pullRate <= 0.3) selectivityNote = 'highly selective — you wait for the card that really hits';

  // 5. Paragraphs — Spotify Wrapped voice, evolving.
  const paragraphs: string[] = [];
  const topSet = topSets[0]?.[0];
  const secondSet = topSets[1]?.[0];
  if (descriptors.length > 0) {
    const adj = descriptors.slice(0, 3).join(', ').toLowerCase();
    paragraphs.push(
      `So far your taste reads as ${adj}${descriptors[3] ? `, with quieter notes of ${descriptors.slice(3).join(', ').toLowerCase()}` : ''}.`
    );
  }
  if (topSet) {
    paragraphs.push(
      `Your eye keeps landing on ${topSet}${secondSet ? ` and ${secondSet}` : ''} — that's where the pull is strongest.`
    );
  }
  if (avgPrice > 0) {
    paragraphs.push(
      `You live in ${priceTierLabel(avgPrice)} (around $${avgPrice.toFixed(0)} per match), and you're ${selectivityNote}.`
    );
  }
  paragraphs.push('This profile is alive — every swipe nudges it.');

  // 6. Insights — contradictions vs personality, sharp observations.
  const insights: string[] = [];
  const flavor = personalityFlavor(personalityType);

  if (flavor === 'conservative' && (avgPrice >= 150 || descriptors.includes(DESCRIPTORS.GrailOriented))) {
    insights.push(`You collect conservatively as ${personalityType}, but your swipes lean hard into grails and chase cards.`);
  }
  if (flavor === 'conservative' && (descriptors.includes(DESCRIPTORS.Nostalgic) || descriptors.includes(DESCRIPTORS.Warm))) {
    insights.push(`Your personality is analytical, but your eye keeps drifting toward calming, nostalgic artwork.`);
  }
  if (flavor === 'fast' && descriptors.includes(DESCRIPTORS.Minimalist)) {
    insights.push(`You read as a fast, opportunistic ${personalityType}, yet your taste is unusually restrained — you pass on more than most.`);
  }
  if (flavor === 'emotional' && descriptors.includes(DESCRIPTORS.Powerful) && !descriptors.includes(DESCRIPTORS.Warm)) {
    insights.push(`You skew emotional in how you collect, but visually you gravitate toward bold and powerful — not soft.`);
  }
  if (descriptors.includes(DESCRIPTORS.VintageLeaning) && descriptors.includes(DESCRIPTORS.AltArtFocused)) {
    insights.push(`Vintage warmth meets modern alt-art — an unusual taste split most collectors don't share.`);
  }
  if (descriptors.includes(DESCRIPTORS.GrailOriented) && descriptors.includes(DESCRIPTORS.Minimalist)) {
    insights.push(`You're picky and expensive — you don't pull often, but when you do, it's a big one.`);
  }
  if (insights.length === 0 && descriptors.length >= 3) {
    insights.push(`Your taste is consistent — the more you swipe, the more confident PokeIQ gets at recommending for you.`);
  }

  return {
    headline,
    descriptors,
    priceTier: { label: priceTierLabel(avgPrice), avg: avgPrice },
    setLean: [topSet, secondSet].filter(Boolean) as string[],
    selectivityNote,
    paragraphs,
    insights,
  };
}