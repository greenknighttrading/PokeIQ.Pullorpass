export interface RawPortfolioItem {
  productName: string;
  category: string;
  quantity: string | number;
  marketPrice: string | number;
  averageCostPaid: string | number;
  grade: string;
  cardNumber: string;
  dateAdded: string;
}

export interface PortfolioItem {
  id: string;
  productName: string;
  category: string;
  setName?: string;
  quantity: number;
  marketPrice: number;
  averageCostPaid: number;
  grade: string;
  cardNumber: string;
  dateAdded: Date | null;
  // Collectr extended fields (additive — optional for backward compat)
  printing?: string;
  language?: string;
  condition?: string;
  // Computed fields
  totalMarketValue: number;
  totalCostBasis: number;
  profitDollars: number;
  gainPercent: number;
  portfolioWeightPercent: number;
  // Classification
  assetType: 'Slab' | 'Raw Card' | 'Sealed';
  liquidityTier: 'High' | 'Medium' | 'Low';
  manuallyAdded?: boolean;
}

export interface PortfolioSummary {
  totalMarketValue: number;
  totalCostBasis: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  holdingsInProfitCount: number;
  holdingsInProfitPercent: number;
  totalHoldings: number;
  healthScore: number; // 0-100 score
}

export interface AllocationBreakdown {
  sealed: { value: number; percent: number; count: number };
  slabs: { value: number; percent: number; count: number };
  rawCards: { value: number; percent: number; count: number };
}

export interface AllocationTarget {
  sealed: number;
  slabs: number;
  rawCards: number;
}

export interface ConcentrationRisk {
  top1Percent: number;
  top1Name: string;
  top3Percent: number;
  top3Names: string[];
  top5Percent: number;
  top5Names: string[];
  topSetPercent: number;
  topSetName: string;
}

export interface ProfitMilestone {
  item: PortfolioItem;
  milestone: 200 | 300 | 500;
  sellHalfProfit: number;
  sellHalfUnitsRemaining: number;
}

export interface Insight {
  id: string;
  type: 'profit' | 'concentration' | 'rebalance' | 'patience' | 'allocation' | 'loss';
  priority: 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  dismissed: boolean;
  relatedItemIds?: string[]; // IDs of items that triggered this insight
}

export interface RebalanceSuggestion {
  category: 'sealed' | 'slabs' | 'rawCards';
  action: 'sell' | 'buy' | 'redirect';
  amount: number;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type AllocationPreset = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export const ALLOCATION_PRESETS: Record<AllocationPreset, AllocationTarget> = {
  conservative: { sealed: 70, slabs: 20, rawCards: 10 },  // 🟢 The Investor
  balanced: { sealed: 50, slabs: 30, rawCards: 20 },      // 🟡 The Hybrid
  aggressive: { sealed: 25, slabs: 30, rawCards: 45 },    // 🔴 The Purist
  custom: { sealed: 33, slabs: 34, rawCards: 33 },
};

export const ALLOCATION_PRESET_INFO: Record<AllocationPreset, { title: string; description: string }> = {
  conservative: { title: 'The Investor', description: '70/20/10' },
  balanced: { title: 'The Hybrid Collector-Investor', description: '50/30/20' },
  aggressive: { title: 'The Purist', description: '25/30/45' },
  custom: { title: 'Custom', description: 'Your mix' },
};

// ============================================
// ERA CLASSIFICATION SYSTEM
// ============================================

export type PokemonEra = 'vintage' | 'classic' | 'modern' | 'ultraModern' | 'current';

export interface EraAllocationTarget {
  vintage: number;
  classic: number;
  modern: number;
  ultraModern: number;
  current: number;
}

export interface EraAllocationBreakdown {
  vintage: { value: number; percent: number; count: number };
  classic: { value: number; percent: number; count: number };
  modern: { value: number; percent: number; count: number };
  ultraModern: { value: number; percent: number; count: number };
  current: { value: number; percent: number; count: number };
}

export type EraAllocationPreset = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export const ERA_ALLOCATION_PRESETS: Record<EraAllocationPreset, EraAllocationTarget> = {
  balanced: { current: 10, ultraModern: 30, modern: 20, classic: 20, vintage: 20 },
  conservative: { current: 5, ultraModern: 20, modern: 20, classic: 30, vintage: 25 },
  aggressive: { current: 10, ultraModern: 40, modern: 20, classic: 20, vintage: 10 },
  custom: { current: 10, ultraModern: 30, modern: 20, classic: 20, vintage: 20 },
};

export const ERA_ALLOCATION_PRESET_INFO: Record<EraAllocationPreset, { title: string; description: string }> = {
  balanced: { title: 'Balanced', description: '10/30/20/20/20' },
  conservative: { title: 'Conservative', description: '5/20/20/30/25' },
  aggressive: { title: 'Aggressive', description: '10/40/20/20/10' },
  custom: { title: 'Custom', description: 'Your mix' },
};

export const ERA_INFO: Record<PokemonEra, { name: string; years: string; description: string }> = {
  vintage: { name: 'Vintage', years: '1996–2006', description: 'Foundational scarcity' },
  classic: { name: 'Classic Era', years: '2007–2013', description: 'Transitional, under-reprinted' },
  modern: { name: 'Modern', years: '2014–2019', description: 'Mass print, pre-boom' },
  ultraModern: { name: 'Ultra Modern', years: '2020–2023', description: 'Post-boom normalization' },
  current: { name: 'Current', years: 'Last 12 months', description: 'Active print / price discovery' },
};

// Set classification by era
export const ERA_SETS: Record<Exclude<PokemonEra, 'current'>, string[]> = {
  vintage: [
    "Base Set", "Jungle", "Fossil", "Base Set 2", "Team Rocket",
    "Gym Heroes", "Gym Challenge",
    "Neo Genesis", "Neo Discovery", "Neo Revelation", "Neo Destiny",
    "Expedition", "Aquapolis", "Skyridge",
    "Ruby & Sapphire", "Sandstorm", "Dragon", "Team Magma vs Team Aqua",
    "Hidden Legends", "FireRed & LeafGreen", "Team Rocket Returns",
    "Deoxys", "Emerald", "Unseen Forces", "Delta Species", "Legend Maker",
    "Holon Phantoms", "Crystal Guardians", "Dragon Frontiers", "Power Keepers",
    "Nintendo Black Star Promos", "POP Series 1", "POP Series 2", "POP Series 3", "POP Series 4", "POP Series 5"
  ],
  classic: [
    "Diamond & Pearl", "Mysterious Treasures", "Secret Wonders", "Great Encounters",
    "Majestic Dawn", "Legends Awakened", "Stormfront",
    "Platinum", "Rising Rivals", "Supreme Victors", "Arceus", "Rumble",
    "HeartGold & SoulSilver", "Unleashed", "Undaunted", "Triumphant", "Call of Legends",
    "Black & White", "Emerging Powers", "Noble Victories", "Next Destinies",
    "Dark Explorers", "Dragons Exalted", "Dragon Vault", "Boundaries Crossed",
    "Plasma Storm", "Plasma Freeze", "Plasma Blast", "Legendary Treasures",
    "POP Series 6", "POP Series 7", "POP Series 8", "POP Series 9",
    "McDonald's Collection 2011", "McDonald's Collection 2012"
  ],
  modern: [
    "XY", "Flashfire", "Furious Fists", "Phantom Forces", "Primal Clash",
    "Double Crisis", "Roaring Skies", "Ancient Origins",
    "BREAKthrough", "BREAKpoint", "Generations", "Fates Collide", "Steam Siege", "Evolutions",
    "Sun & Moon", "Guardians Rising", "Burning Shadows", "Crimson Invasion",
    "Ultra Prism", "Forbidden Light", "Celestial Storm", "Dragon Majesty",
    "Lost Thunder", "Team Up", "Detective Pikachu",
    "Unbroken Bonds", "Unified Minds", "Hidden Fates", "Cosmic Eclipse",
    "Shining Legends",
    "McDonald's Collection 2016", "McDonald's Collection 2019"
  ],
  ultraModern: [
    "Sword & Shield", "Rebel Clash", "Darkness Ablaze", "Champion's Path", "Vivid Voltage",
    "Shining Fates", "Battle Styles", "Chilling Reign", "Evolving Skies", "Celebrations",
    "Fusion Strike", "Brilliant Stars", "Astral Radiance", "Pokémon GO",
    "Lost Origin", "Silver Tempest", "Crown Zenith",
    "Scarlet & Violet", "Paldea Evolved", "Obsidian Flames", "Paradox Rift",
    "Paldean Fates", "Temporal Forces", "Twilight Masquerade", "Shrouded Fable",
    "Stellar Crown", "Surging Sparks", "Prismatic Evolutions", "Journey Together",
    "Destined Rivals", "Black Bolt", "White Flare", "151",
    "Mega Evolution", "Mega Evolution Energy", "Mega Evolution Promos", "Phantasmal Flames",
    "McDonald's Match Battle 2023", "McDonald's Collection 2022",
    "Pokémon Futsal Promos 2020"
  ],
};
