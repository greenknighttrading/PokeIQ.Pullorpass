import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BudgetState, GRADED_TIERS, RAW_INTENTS, SEALED_TYPES } from '@/components/budget/types';
import { PersonalityResult } from '@/lib/personalityEngine';
import { calculateEraHealthScore, calculateAssetHealthScore } from '@/lib/eraClassification';

export type TimeHorizon = 12 | 24 | 36;
export type Preset = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export interface EraAllocation {
  vintage: number;
  classic: number;
  modern: number;
  ultraModern: number;
  current: number;
}

// Set allocation within each era
export interface SetAllocation {
  [setName: string]: number;
}

export interface EraSetAllocations {
  vintage: SetAllocation;
  classic: SetAllocation;
  modern: SetAllocation;
  ultraModern: SetAllocation;
  current: SetAllocation;
}

// Complete set lists for each era
export const ERA_SETS: Record<keyof EraAllocation, string[]> = {
  vintage: [
    'Base Set', 'Jungle', 'Fossil', 'Base Set 2', 'Team Rocket',
    'Gym Heroes', 'Gym Challenge', 'Neo Genesis', 'Neo Discovery',
    'Neo Revelation', 'Neo Destiny', 'Legendary Collection'
  ],
  classic: [
    // EX Era (2003–2007)
    'Ruby & Sapphire', 'Sandstorm', 'Dragon', 'Team Magma vs Team Aqua',
    'Hidden Legends', 'FireRed & LeafGreen', 'Team Rocket Returns', 'Deoxys',
    'Emerald', 'Unseen Forces', 'Delta Species', 'Legend Maker',
    'Holon Phantoms', 'Crystal Guardians', 'Dragon Frontiers', 'Power Keepers',
    // Diamond & Pearl Era (2007–2009)
    'Diamond & Pearl', 'Mysterious Treasures', 'Secret Wonders', 'Great Encounters',
    'Majestic Dawn', 'Legends Awakened',
    // Platinum Era (2009–2010)
    'Platinum', 'Rising Rivals', 'Supreme Victors', 'Arceus',
    // HeartGold & SoulSilver Era (2010–2011)
    'HeartGold & SoulSilver', 'Unleashed', 'Undaunted', 'Triumphant', 'Call of Legends'
  ],
  modern: [
    // Black & White Era (2011–2013)
    'Black & White', 'Emerging Powers', 'Noble Victories', 'Next Destinies',
    'Dark Explorers', 'Dragons Exalted', 'Boundaries Crossed', 'Plasma Storm',
    'Plasma Freeze', 'Plasma Blast', 'Legendary Treasures',
    // XY Era (2014–2017)
    'XY', 'Flashfire', 'Furious Fists', 'Phantom Forces', 'Primal Clash',
    'Roaring Skies', 'Ancient Origins', 'BREAKthrough', 'BREAKpoint',
    'Generations', 'Fates Collide', 'Steam Siege', 'Evolutions'
  ],
  ultraModern: [
    // Sun & Moon Era (2017–2020)
    'Sun & Moon', 'Guardians Rising', 'Burning Shadows', 'Crimson Invasion',
    'Ultra Prism', 'Forbidden Light', 'Celestial Storm', 'Dragon Majesty',
    'Lost Thunder', 'Team Up', 'Detective Pikachu', 'Unbroken Bonds',
    'Unified Minds', 'Hidden Fates', 'Cosmic Eclipse',
    // Sword & Shield Era (2020–2023)
    'Sword & Shield', 'Rebel Clash', 'Darkness Ablaze', "Champion's Path",
    'Vivid Voltage', 'Shining Fates', 'Battle Styles', 'Chilling Reign',
    'Evolving Skies', 'Celebrations', 'Fusion Strike', 'Brilliant Stars',
    'Astral Radiance', 'Pokémon GO', 'Lost Origin', 'Silver Tempest', 'Crown Zenith'
  ],
  current: [
    // Scarlet & Violet Era (2023–Present)
    'Scarlet & Violet', 'Paldea Evolved', 'Obsidian Flames', '151',
    'Paradox Rift', 'Temporal Forces', 'Twilight Masquerade',
    'Shrouded Fable', 'Stellar Crown'
  ]
};

// Helper to create default equal allocation for sets within an era
const createDefaultSetAllocation = (era: keyof EraAllocation): SetAllocation => {
  const sets = ERA_SETS[era];
  const equalShare = Math.floor(100 / sets.length);
  const remainder = 100 - (equalShare * sets.length);
  const result: SetAllocation = {};
  sets.forEach((set, i) => {
    result[set] = i === 0 ? equalShare + remainder : equalShare;
  });
  return result;
};

export const createDefaultEraSetAllocations = (): EraSetAllocations => ({
  vintage: createDefaultSetAllocation('vintage'),
  classic: createDefaultSetAllocation('classic'),
  modern: createDefaultSetAllocation('modern'),
  ultraModern: createDefaultSetAllocation('ultraModern'),
  current: createDefaultSetAllocation('current'),
});

export interface SimulatorState {
  monthlyBudget: number;
  timeHorizon: TimeHorizon;
  preset: Preset;
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
  sealed: Record<string, number>;
  era: EraAllocation;
  eraSets: EraSetAllocations;
  savedPlans: SavedPlan[];
}

export interface SavedPlan {
  id: string;
  name: string;
  createdAt: Date;
  state: Omit<SimulatorState, 'savedPlans'>;
}

export interface SimulatorHealthScore {
  overall: number;
  era: number;
  asset: number;
  concentration: number;
}

export interface StatusTag {
  label: string;
  type: 'warning' | 'info' | 'success';
}

interface SimulatorContextType {
  state: SimulatorState;
  setState: React.Dispatch<React.SetStateAction<SimulatorState>>;
  healthScore: SimulatorHealthScore;
  statusTags: StatusTag[];
  totalInvested: number;
  yearlySpend: number;
  topLevelValid: boolean;
  gradedValid: boolean;
  rawValid: boolean;
  sealedValid: boolean;
  eraValid: boolean;
  savePlan: (name: string) => void;
  loadPlan: (id: string) => void;
  deletePlan: (id: string) => void;
  applyPreset: (preset: Preset) => void;
  updateSetAllocation: (era: keyof EraAllocation, setName: string, value: number) => void;
  normalizeSetAllocation: (era: keyof EraAllocation) => void;
  getSetAllocationTotal: (era: keyof EraAllocation) => number;
}

const SimulatorContext = createContext<SimulatorContextType | null>(null);

const defaultSealed = (): Record<string, number> => {
  const types = SEALED_TYPES;
  const base = Math.floor(100 / types.length);
  const remainder = 100 - base * types.length;
  const result: Record<string, number> = {};
  types.forEach((t, i) => {
    result[t.id] = i === 0 ? base + remainder : base;
  });
  return result;
};

const PRESETS: Record<Preset, { topLevel: { sealed: number; graded: number; raw: number }; era: EraAllocation }> = {
  conservative: {
    topLevel: { sealed: 60, graded: 30, raw: 10 },
    era: { vintage: 30, classic: 25, modern: 20, ultraModern: 20, current: 5 },
  },
  balanced: {
    topLevel: { sealed: 45, graded: 35, raw: 20 },
    era: { vintage: 20, classic: 20, modern: 20, ultraModern: 30, current: 10 },
  },
  aggressive: {
    topLevel: { sealed: 30, graded: 40, raw: 30 },
    era: { vintage: 10, classic: 15, modern: 20, ultraModern: 40, current: 15 },
  },
  custom: {
    topLevel: { sealed: 34, graded: 33, raw: 33 },
    era: { vintage: 20, classic: 20, modern: 20, ultraModern: 20, current: 20 },
  },
};

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulatorState>(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem('simulatorState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure eraSets exists (migration for old data)
        if (!parsed.eraSets) {
          parsed.eraSets = createDefaultEraSetAllocations();
        }
        return parsed;
      } catch {}
    }
    
    // Check for personality result
    const personalityStr = localStorage.getItem('personalityResult');
    let personality: PersonalityResult | null = null;
    if (personalityStr) {
      try {
        personality = JSON.parse(personalityStr);
      } catch {}
    }

    return {
      monthlyBudget: 500,
      timeHorizon: 12 as TimeHorizon,
      preset: 'balanced' as Preset,
      topLevel: personality?.productAllocation 
        ? { 
            sealed: personality.productAllocation.sealedPct,
            graded: personality.productAllocation.gradedPct,
            raw: personality.productAllocation.rawPct,
          }
        : PRESETS.balanced.topLevel,
      graded: { entry: 25, core: 35, highConviction: 25, grail: 15 },
      raw: { grading: 40, holding: 30, flipping: 20, personal: 10 },
      sealed: defaultSealed(),
      era: personality?.eraAllocation
        ? {
            vintage: personality.eraAllocation.vintage,
            classic: personality.eraAllocation.classic,
            modern: personality.eraAllocation.modern,
            ultraModern: personality.eraAllocation.ultraModern,
            current: personality.eraAllocation.current,
          }
        : PRESETS.balanced.era,
      eraSets: createDefaultEraSetAllocations(),
      savedPlans: [],
    };
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('simulatorState', JSON.stringify(state));
  }, [state]);

  // Validation
  const topLevelTotal = state.topLevel.sealed + state.topLevel.graded + state.topLevel.raw;
  const topLevelValid = topLevelTotal === 100;
  const gradedTotal = Object.values(state.graded).reduce((s, v) => s + v, 0);
  const gradedValid = gradedTotal === 100;
  const rawTotal = Object.values(state.raw).reduce((s, v) => s + v, 0);
  const rawValid = rawTotal === 100;
  const sealedTotal = Object.values(state.sealed).reduce((s, v) => s + v, 0);
  const sealedValid = sealedTotal === 100;
  const eraTotal = Object.values(state.era).reduce((s, v) => s + v, 0);
  const eraValid = eraTotal === 100;

  // Calculations
  const yearlySpend = state.monthlyBudget * 12;
  const totalInvested = state.monthlyBudget * state.timeHorizon;

  // Health score calculation
  // Custom rule: older era >= 40% guarantees health score >= 75
  const healthScore: SimulatorHealthScore = React.useMemo(() => {
    if (!topLevelValid || !eraValid) {
      return { overall: 0, era: 0, asset: 0, concentration: 0 };
    }

    const eraScore = calculateEraHealthScore({
      vintage: { percent: state.era.vintage, value: 0, count: 0 },
      classic: { percent: state.era.classic, value: 0, count: 0 },
      modern: { percent: state.era.modern, value: 0, count: 0 },
      ultraModern: { percent: state.era.ultraModern, value: 0, count: 0 },
      current: { percent: state.era.current, value: 0, count: 0 },
    });

    const assetScore = calculateAssetHealthScore(
      state.topLevel.sealed,
      state.topLevel.graded,
      state.topLevel.raw
    );

    // Concentration score based on how spread allocations are
    const allValid = gradedValid && rawValid && sealedValid;
    const concentrationScore = allValid ? 80 : 60;

    // Health score weights: Asset 45%, Era 35%, Concentration 20%
    let overall = Math.round((assetScore * 0.45) + (eraScore * 0.35) + (concentrationScore * 0.20));

    // Custom rule: if older era (vintage + classic) >= 40%, guarantee score >= 75
    const olderEra = state.era.vintage + state.era.classic;
    if (olderEra >= 40) {
      overall = Math.max(75, overall);
    }

    return {
      overall: Math.max(50, Math.min(100, overall)),
      era: eraScore,
      asset: assetScore,
      concentration: concentrationScore,
    };
  }, [state, topLevelValid, eraValid, gradedValid, rawValid, sealedValid]);

  // Status tags
  const statusTags: StatusTag[] = React.useMemo(() => {
    if (!topLevelValid || !eraValid) return [];
    
    const tags: StatusTag[] = [];
    
    // Asset allocation tags
    if (state.topLevel.sealed >= 60) {
      tags.push({ label: 'Sealed-Heavy', type: 'info' });
    } else if (state.topLevel.sealed <= 25) {
      tags.push({ label: 'Low Sealed', type: 'warning' });
    }

    if (state.topLevel.graded >= 50) {
      tags.push({ label: 'Graded-Focused', type: 'info' });
    }

    if (state.topLevel.raw >= 40) {
      tags.push({ label: 'High Raw Exposure', type: 'warning' });
    }

    // Era tags
    if (state.era.vintage < 10) {
      tags.push({ label: 'Low Vintage Exposure', type: 'warning' });
    } else if (state.era.vintage >= 25) {
      tags.push({ label: 'Vintage-Heavy', type: 'success' });
    }

    if (state.era.current >= 20) {
      tags.push({ label: 'High New-Era Risk', type: 'warning' });
    }

    const newerEra = state.era.modern + state.era.ultraModern + state.era.current;
    if (newerEra >= 70) {
      tags.push({ label: 'Newer-Era Heavy', type: 'warning' });
    }

    return tags;
  }, [state, topLevelValid, eraValid]);

  const applyPreset = (preset: Preset) => {
    setState(prev => ({
      ...prev,
      preset,
      topLevel: PRESETS[preset].topLevel,
      era: PRESETS[preset].era,
    }));
  };

  const savePlan = (name: string) => {
    const { savedPlans, ...planState } = state;
    const newPlan: SavedPlan = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
      state: planState,
    };
    setState(prev => ({
      ...prev,
      savedPlans: [...prev.savedPlans, newPlan],
    }));
  };

  const loadPlan = (id: string) => {
    const plan = state.savedPlans.find(p => p.id === id);
    if (plan) {
      setState(prev => ({
        ...plan.state,
        savedPlans: prev.savedPlans,
      }));
    }
  };

  const deletePlan = (id: string) => {
    setState(prev => ({
      ...prev,
      savedPlans: prev.savedPlans.filter(p => p.id !== id),
    }));
  };

  const updateSetAllocation = (era: keyof EraAllocation, setName: string, value: number) => {
    setState(prev => ({
      ...prev,
      eraSets: {
        ...prev.eraSets,
        [era]: {
          ...prev.eraSets[era],
          [setName]: value,
        },
      },
    }));
  };

  const normalizeSetAllocation = (era: keyof EraAllocation) => {
    const currentSets = state.eraSets[era];
    const total = Object.values(currentSets).reduce((s, v) => s + v, 0);
    if (total === 0) {
      setState(prev => ({
        ...prev,
        eraSets: {
          ...prev.eraSets,
          [era]: createDefaultEraSetAllocations()[era],
        },
      }));
      return;
    }
    const ratio = 100 / total;
    const setNames = Object.keys(currentSets);
    let assigned = 0;
    const result: SetAllocation = {};
    setNames.forEach((name, i) => {
      if (i === setNames.length - 1) {
        result[name] = 100 - assigned;
      } else {
        result[name] = Math.round(currentSets[name] * ratio);
        assigned += result[name];
      }
    });
    setState(prev => ({
      ...prev,
      eraSets: {
        ...prev.eraSets,
        [era]: result,
      },
    }));
  };

  const getSetAllocationTotal = (era: keyof EraAllocation): number => {
    return Object.values(state.eraSets[era]).reduce((s, v) => s + v, 0);
  };

  return (
    <SimulatorContext.Provider value={{
      state,
      setState,
      healthScore,
      statusTags,
      totalInvested,
      yearlySpend,
      topLevelValid,
      gradedValid,
      rawValid,
      sealedValid,
      eraValid,
      savePlan,
      loadPlan,
      deletePlan,
      applyPreset,
      updateSetAllocation,
      normalizeSetAllocation,
      getSetAllocationTotal,
    }}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within SimulatorProvider');
  }
  return context;
}
