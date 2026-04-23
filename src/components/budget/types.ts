export interface CategoryAllocation {
  id: string;
  name: string;
  value: number;
  description?: string;
  color: string;
}

export interface GradedTier {
  id: 'entry' | 'core' | 'highConviction' | 'grail';
  name: string;
  range: string;
  description: string;
  value: number;
  color: string;
}

export interface RawIntent {
  id: 'grading' | 'holding' | 'flipping' | 'personal';
  name: string;
  description: string;
  value: number;
  color: string;
}

export interface SealedType {
  id: string;
  name: string;
  description: string;
  value: number;
  color: string;
}

export interface BudgetState {
  monthlyBudget: number;
  topLevel: {
    sealed: number;
    graded: number;
    raw: number;
  };
  graded: {
    entry: number;
    core: number;
    highConviction: number;
    grail: number;
  };
  raw: {
    grading: number;
    holding: number;
    flipping: number;
    personal: number;
  };
  sealed: {
    boosterBoxes: number;
    etbs: number;
    bundles: number;
    collectionBoxes: number;
    upcs: number;
    tins: number;
    specialSets: number;
    japanese: number;
    pokemonCenter: number;
    sleevedPacks: number;
    other: number;
  };
}

export const GRADED_TIERS: Omit<GradedTier, 'value'>[] = [
  { id: 'entry', name: 'Entry Value', range: '$0–$150', description: 'Low-end slabs, PSA 9 modern, PSA 10 commons. High liquidity, low risk.', color: 'hsl(142, 71%, 45%)' },
  { id: 'core', name: 'Mid-Value', range: '$150–$500', description: 'PSA 10 modern hits, PSA 8–9 vintage. Best balance of liquidity and upside.', color: 'hsl(221, 83%, 53%)' },
  { id: 'highConviction', name: 'High-Value', range: '$500–$1,000', description: 'PSA 10 key cards, lower-pop slabs. Concentrated positions.', color: 'hsl(38, 92%, 50%)' },
  { id: 'grail', name: 'Grail', range: '$1,000+', description: 'Trophy cards, ultra-low pop slabs. Capital preservation pieces.', color: 'hsl(340, 82%, 52%)' },
];

export const RAW_INTENTS: Omit<RawIntent, 'value'>[] = [
  { id: 'grading', name: 'Raw for Grading', description: 'Cards intended to be graded. Clean modern or vintage.', color: 'hsl(262, 83%, 58%)' },
  { id: 'holding', name: 'Raw for Holding', description: 'Long-term belief cards. Not immediately grading.', color: 'hsl(221, 83%, 53%)' },
  { id: 'flipping', name: 'Raw for Flipping', description: 'Short-term trades. Market-driven moves.', color: 'hsl(38, 92%, 50%)' },
  { id: 'personal', name: 'Personal / Binder', description: 'Collected for enjoyment. Not optimized financially.', color: 'hsl(340, 82%, 52%)' },
];

export const SEALED_TYPES: Omit<SealedType, 'value'>[] = [
  { id: 'boosterBoxes', name: 'Booster Boxes', description: 'Core sealed investment. Highest liquidity and performance.', color: 'hsl(262, 83%, 58%)' },
  { id: 'etbs', name: 'Elite Trainer Boxes', description: 'Standard and Pokémon Center exclusives.', color: 'hsl(221, 83%, 53%)' },
  { id: 'bundles', name: 'Booster Bundles', description: 'Lower-cost stacking option for scaling positions.', color: 'hsl(142, 71%, 45%)' },
  { id: 'collectionBoxes', name: 'Collection / Premium Boxes', description: 'Character-driven, promo-heavy products.', color: 'hsl(38, 92%, 50%)' },
  { id: 'upcs', name: 'Ultra-Premium Collections', description: 'High-end sealed. Display and scarcity driven.', color: 'hsl(340, 82%, 52%)' },
  { id: 'tins', name: 'Tins', description: 'Regular, mini, and specialty tins.', color: 'hsl(200, 70%, 50%)' },
  { id: 'specialSets', name: 'Special Sets', description: 'Hidden Fates, Crown Zenith, 151. No booster boxes.', color: 'hsl(280, 70%, 50%)' },
  { id: 'japanese', name: 'Japanese Products', description: 'Japanese booster boxes and exclusives. Higher volatility.', color: 'hsl(0, 70%, 50%)' },
  { id: 'pokemonCenter', name: 'Pokémon Center Exclusives', description: 'Limited distribution, premium perception.', color: 'hsl(320, 70%, 50%)' },
  { id: 'sleevedPacks', name: 'Sleeved Booster Packs', description: 'Retail sleeved packs. Nostalgia and liquidity.', color: 'hsl(160, 70%, 45%)' },
  { id: 'other', name: 'Other', description: 'Blisters, theme decks, case-sealed, event exclusives.', color: 'hsl(60, 50%, 50%)' },
];

export const TOP_LEVEL_COLORS = {
  sealed: 'hsl(262, 83%, 58%)',
  graded: 'hsl(38, 92%, 50%)',
  raw: 'hsl(142, 71%, 45%)',
};
