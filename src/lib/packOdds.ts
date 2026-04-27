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
  /** If set, skip price lookup and use this fixed value (e.g. $0.40 for a basic Rare "no-hit"). */
  fixedValue?: number;
}

export interface PackOddsConfig {
  setName: string;         // canonical set_name in market_snapshots
  displayName: string;     // pretty label
  setCode: string;         // short tag, e.g. ASC
  cardsPerPack: number;
  rarities: RarityOdd[];
  /** Optional override for the JustTCG `set` query parameter. Defaults to setName. */
  justTcgSetName?: string;
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
  justTcgSetName: 'me-ascended-heroes-pokemon',
  rarities: [
    { rarity: 'Special Illustration Rare', shortLabel: 'SIR', oneIn: 70 },
    { rarity: 'Illustration Rare',         shortLabel: 'IR',  oneIn: 9  },
    { rarity: 'Ultra Rare',                shortLabel: 'UR',  oneIn: 21 },
    { rarity: 'Double Rare',               shortLabel: 'DR',  oneIn: 5  },
    { rarity: 'Mega Attack Rare',          shortLabel: 'MAR', oneIn: 29 },
    { rarity: 'Mega Hyper Rare',           shortLabel: 'MHR', oneIn: 540 },
    // No-hit baseline: rare slot lands on a basic Rare (~$0.40). Fills remaining ~59% of packs.
    { rarity: 'No Hit (Basic Rare)',       shortLabel: 'NH',  oneIn: 1.69, fixedValue: 0.40 },
  ],
};

/**
 * SV: Prismatic Evolutions (PRE) — community-reported pull rates.
 * Source: data compiled by @yprize from 2700+ packs.
 */
export const PRISMATIC_EVOLUTIONS: PackOddsConfig = {
  setName: 'SV: Prismatic Evolutions',
  displayName: 'Pokémon Prismatic Evolutions',
  setCode: 'PRE',
  cardsPerPack: 10,
  justTcgSetName: 'sv-prismatic-evolutions-pokemon',
  // Pull rates from community data (2700+ packs, compiled by @yprize).
  // Note: "Full Art Trainer" and "Master Ball Holo" are visual variants — JustTCG
  // categorizes them under "Special Illustration Rare" / "Ultra Rare" buckets.
  rarities: [
    { rarity: 'Special Illustration Rare', shortLabel: 'SIR',     oneIn: 53 },  // Alt Art SIR — 1/53
    { rarity: 'Ultra Rare',                shortLabel: 'UR',      oneIn: 16 },  // Full Art Trainer — 1/16
    { rarity: 'ACE SPEC Rare',             shortLabel: 'ACE',     oneIn: 29 },
    { rarity: 'Hyper Rare',                shortLabel: 'HR Gold', oneIn: 152 },
    { rarity: 'Double Rare',               shortLabel: 'DR ex',   oneIn: 5  },
    // No-hit baseline: rare slot lands on a basic Rare (~$0.40). Fills remaining ~68% of packs.
    { rarity: 'No Hit (Basic Rare)',       shortLabel: 'NH',      oneIn: 1.48, fixedValue: 0.40 },
  ],
};

/**
 * ME01: Mega Evolution (MEV) — official pull rates per pack.
 * Source: Pull rate sheet shipped with the set.
 * "Any" rates are used to compute per-pack expected hits.
 * Secret Rare hit rate (any MHR/SIR/IR/UR) ≈ 19% per pack.
 */
export const MEGA_EVOLUTION: PackOddsConfig = {
  setName: 'ME01: Mega Evolution',
  displayName: 'Pokémon Mega Evolution',
  setCode: 'MEV',
  cardsPerPack: 10,
  justTcgSetName: 'me01-mega-evolution-pokemon',
  rarities: [
    { rarity: 'Mega Hyper Rare',           shortLabel: 'MHR', oneIn: 1260 },
    { rarity: 'Special Illustration Rare', shortLabel: 'SIR', oneIn: 101  },
    { rarity: 'Illustration Rare',         shortLabel: 'IR',  oneIn: 9    },
    { rarity: 'Ultra Rare',                shortLabel: 'UR',  oneIn: 12   },
    { rarity: 'Double Rare',               shortLabel: 'DR',  oneIn: 5    },
    // No-hit baseline: rare slot lands on a basic Rare (~$0.40). Fills remaining packs (~81% no secret hit).
    { rarity: 'No Hit (Basic Rare)',       shortLabel: 'NH',  oneIn: 1.23, fixedValue: 0.40 },
  ],
};

export const PACK_ODDS_REGISTRY: PackOddsConfig[] = [
  ASCENDED_HEROES,
  PRISMATIC_EVOLUTIONS,
  MEGA_EVOLUTION,
];

export function getPackOddsBySetName(setName: string): PackOddsConfig | undefined {
  return PACK_ODDS_REGISTRY.find(p => p.setName === setName);
}
