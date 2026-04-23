/**
 * Approximate Expected Value (EV) calculator for sealed booster packs.
 *
 * NOTE: We don't have official pull rates per set. These are conservative,
 * community-accepted approximations for modern Scarlet & Violet / SwSh era packs.
 * Vintage/older packs use a simpler formula based on rare-slot averages.
 *
 * Modern SV/SwSh booster (10 cards):
 *   - 4 commons, 3 uncommons (negligible value)
 *   - 1 reverse holo (~uncommon/rare avg)
 *   - 1 rare slot: ~67% Rare, ~20% Double Rare, ~9% Ultra Rare,
 *                  ~3% Illustration Rare, ~0.8% Special Illustration Rare,
 *                  ~0.3% Hyper Rare
 *   - Energy / code card
 *
 * This is an APPROXIMATION — actual pull rates vary per set.
 */

export interface RarityPrice {
  rarity: string;
  avg_price: number;
  count: number;
}

// Approx rare-slot pull probabilities for modern SV / SwSh era
const MODERN_PULL_RATES: Record<string, number> = {
  'Rare': 0.67,
  'Double Rare': 0.20,
  'Ultra Rare': 0.09,
  'Illustration Rare': 0.03,
  'Special Illustration Rare': 0.008,
  'Hyper Rare': 0.003,
  'ACE SPEC Rare': 0.005,
};

// Older eras (XY, SM): simpler — rare slot avg + chance of holo upgrade
const LEGACY_PULL_RATES: Record<string, number> = {
  'Rare': 0.65,
  'Rare Holo': 0.25,
  'Rare Holo GX': 0.05,
  'Rare Holo EX': 0.05,
  'Rare Ultra': 0.04,
  'Rare Secret': 0.005,
  'Rare Rainbow': 0.005,
};

const REVERSE_HOLO_AVG = 0.5; // approx reverse-holo avg market value

export function calculatePackEV(rarityPrices: RarityPrice[], era: 'modern' | 'legacy' | 'vintage' = 'modern'): number {
  if (rarityPrices.length === 0) return 0;

  const priceMap: Record<string, number> = {};
  rarityPrices.forEach(r => { priceMap[r.rarity] = r.avg_price; });

  let ev = REVERSE_HOLO_AVG; // baseline reverse holo slot

  const rates = era === 'legacy' ? LEGACY_PULL_RATES : MODERN_PULL_RATES;

  for (const [rarity, prob] of Object.entries(rates)) {
    const price = priceMap[rarity] ?? 0;
    ev += price * prob;
  }

  // For vintage, fallback to top-rarity weighted approach
  if (era === 'vintage') {
    const sorted = [...rarityPrices].sort((a, b) => b.avg_price - a.avg_price);
    const topRare = sorted[0]?.avg_price ?? 0;
    ev = topRare * 0.05 + (sorted[1]?.avg_price ?? 0) * 0.2 + 1;
  }

  return Math.round(ev * 100) / 100;
}

export function classifyPackEra(setName: string): 'modern' | 'legacy' | 'vintage' {
  const s = setName.toLowerCase();
  if (/sv\d|scarlet|paldea|151|paradox|temporal|twilight|stellar|surging|prismatic|journey|destined|black bolt|white flare|mega/i.test(s)) return 'modern';
  if (/swsh|sword|shield|brilliant|astral|lost origin|silver tempest|crown zenith|fusion|evolving|chilling|battle styles|vivid|darkness ablaze|rebel/i.test(s)) return 'modern';
  if (/wotc|base set|jungle|fossil|rocket|gym|neo|expedition|aquapolis|skyridge|legendary collection/i.test(s)) return 'vintage';
  return 'legacy';
}

export function tcgPlayerUrl(tcgplayerId: string | null | undefined, name: string): string {
  if (tcgplayerId) {
    return `https://www.tcgplayer.com/product/${tcgplayerId}?utm_campaign=affiliate&utm_medium=PokeIQ&utm_source=PokeIQ`;
  }
  return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(name)}`;
}
