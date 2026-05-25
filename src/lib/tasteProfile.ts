// Taste Profile — MVP hard-attribute engine.
//
// Only objective metadata from the user's liked cards. No vibes, no
// archetype names, no AI inference. Insights are emitted only when a
// pattern crosses a confidence threshold so the profile feels grounded.

import { LikedCard, ERA_LABELS, PRICE_TIER_LABEL } from './likesService';

export interface AttrCount {
  key: string;
  label: string;
  count: number;
  pct: number; // 0..100
}

export type TasteStage = 'seedling' | 'sprouting' | 'established' | 'expert';

export interface TasteProfile {
  totalLikes: number;
  stage: TasteStage;
  nextThreshold: number | null;
  topArtists: AttrCount[];
  topSets: AttrCount[];
  topEras: AttrCount[];
  topPokemonTypes: AttrCount[];
  topRarities: AttrCount[];
  topPokemon: AttrCount[];
  priceDistribution: AttrCount[];
  languageMix: AttrCount[];
  productMix: AttrCount[];
  avgPrice: number;
  insights: string[];
}

const STAGE_THRESHOLDS: { stage: TasteStage; min: number; next: number | null }[] = [
  { stage: 'seedling',    min: 0,   next: 20 },
  { stage: 'sprouting',   min: 20,  next: 50 },
  { stage: 'established', min: 50,  next: 100 },
  { stage: 'expert',      min: 100, next: null },
];

function stageFor(n: number): { stage: TasteStage; next: number | null } {
  let cur = STAGE_THRESHOLDS[0];
  for (const s of STAGE_THRESHOLDS) if (n >= s.min) cur = s;
  return { stage: cur.stage, next: cur.next };
}

function tally(
  cards: LikedCard[],
  pick: (c: LikedCard) => string | null | undefined,
  labelMap?: Record<string, string>,
  limit = 6
): AttrCount[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const c of cards) {
    const v = pick(c);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
    total++;
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: labelMap?.[key] ?? key,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildTasteProfile(likes: LikedCard[]): TasteProfile {
  const total = likes.length;
  const { stage, next } = stageFor(total);

  const topArtists      = tally(likes, (c) => c.artist?.trim() || null);
  const topSets         = tally(likes, (c) => c.set_name?.trim() || null);
  const topEras         = tally(likes, (c) => c.era || null, ERA_LABELS);
  const topPokemonTypes = tally(likes, (c) => c.pokemon_type || null);
  const topRarities     = tally(likes, (c) => c.rarity || null);
  const topPokemon      = tally(likes, (c) => c.pokemon_name || null);
  const priceDistribution = tally(
    likes,
    (c) => c.price_tier || null,
    PRICE_TIER_LABEL,
    5
  );
  const languageMix = tally(likes, (c) => c.language || null);
  const productMix  = tally(likes, (c) => c.product_category || null, {
    single: 'Singles',
    sealed: 'Sealed',
    graded: 'Graded',
  });

  const priced = likes.filter((c) => c.price && c.price > 0);
  const avgPrice = priced.length
    ? priced.reduce((s, c) => s + Number(c.price), 0) / priced.length
    : 0;

  // Insights — only emit when a pattern is statistically meaningful.
  const insights: string[] = [];
  const MIN_OCCURRENCES = 3;
  const STRONG_PCT = 30;

  const a = topArtists[0];
  if (a && a.count >= MIN_OCCURRENCES && a.pct >= STRONG_PCT) {
    insights.push(`You frequently like cards illustrated by ${a.label}.`);
  }
  const e = topEras[0];
  if (e && e.count >= MIN_OCCURRENCES && e.pct >= STRONG_PCT) {
    insights.push(`You tend to prefer ${e.label} cards.`);
  }
  const t = topPokemonTypes[0];
  if (t && t.count >= MIN_OCCURRENCES && t.pct >= STRONG_PCT) {
    insights.push(`You often like ${t.label}-type Pokémon.`);
  }
  const r = topRarities[0];
  if (r && r.count >= MIN_OCCURRENCES && r.pct >= STRONG_PCT) {
    insights.push(`You consistently like ${r.label.toLowerCase()} cards.`);
  }
  const p = topPokemon[0];
  if (p && p.count >= MIN_OCCURRENCES) {
    insights.push(`${p.label} shows up the most in your likes (${p.count} cards).`);
  }
  const s = topSets[0];
  if (s && s.count >= MIN_OCCURRENCES && s.pct >= 20) {
    insights.push(`Your eye keeps landing on ${s.label}.`);
  }
  const lang = languageMix[0];
  if (lang && lang.key === 'Japanese' && lang.pct >= 40) {
    insights.push(`You lean toward Japanese cards (${lang.pct}% of your likes).`);
  }
  const tier = priceDistribution[0];
  if (tier && tier.pct >= 40 && tier.key !== 'unknown') {
    insights.push(`Your likes skew toward ${tier.label.toLowerCase()}.`);
  }

  return {
    totalLikes: total,
    stage,
    nextThreshold: next,
    topArtists,
    topSets,
    topEras,
    topPokemonTypes,
    topRarities,
    topPokemon,
    priceDistribution,
    languageMix,
    productMix,
    avgPrice,
    insights,
  };
}