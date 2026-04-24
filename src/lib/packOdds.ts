/**
 * Pack odds registry for the Pack Gains Calculator.
 *
 * Each set defines:
 *  - cardsPerPack: number of cards in a single booster pack
 *  - rarityOdds: probability of pulling at least one card of each rarity per pack
 *    (expressed as 1-in-N; we convert to per-pack expected count downstream).
 *
 * Rarity keys must match the canonical `rarity` strings stored in
 * `market_snapshots` for the set so we can join price data automatically.
 */

export interface RarityOdd {
  rarity: string;          // canonical rarity label (matches DB)
  shortLabel: string;      // compact label for UI (SIR, IR, UR…)
  oneIn: number;           // pull rate: 1 card in N
}

export interface PackOddsConfig {
  setName: string;         // canonical set_name in market_snapshots
  displayName: string;     // pretty label
  setCode: string;         // short tag, e.g. ASC
  cardsPerPack: number;
  rarities: RarityOdd[];
}

/**
 * ME: Ascended Heroes (ASC) — community-reported pull rates.
 * Source: matches the reference calculator the user shared.
 */
export const ASCENDED_HEROES: PackOddsConfig = {
  setName: 'ME: Ascended Heroes',
  displayName: 'Pokémon Ascended Heroes',
  setCode: 'ASC',
  cardsPerPack: 10,
  rarities: [
    { rarity: 'Special Illustration Rare', shortLabel: 'SIR', oneIn: 70 },
    { rarity: 'Illustration Rare',         shortLabel: 'IR',  oneIn: 9  },
    { rarity: 'Ultra Rare',                shortLabel: 'UR',  oneIn: 21 },
    { rarity: 'Double Rare',               shortLabel: 'DR',  oneIn: 5  },
    { rarity: 'Mega Attack Rare',          shortLabel: 'MAR', oneIn: 29 },
    { rarity: 'Mega Hyper Rare',           shortLabel: 'MHR', oneIn: 540 },
  ],
};

export const PACK_ODDS_REGISTRY: PackOddsConfig[] = [
  ASCENDED_HEROES,
];

export function getPackOddsBySetName(setName: string): PackOddsConfig | undefined {
  return PACK_ODDS_REGISTRY.find(p => p.setName === setName);
}
