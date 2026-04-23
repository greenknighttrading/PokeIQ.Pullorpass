import { PortfolioItem, PokemonEra, ERA_SETS, EraAllocationBreakdown, EraAllocationTarget } from './types';

/**
 * Classify a portfolio item into an era based on its category/set name
 * Uses the Set/category column for matching, with dateAdded fallback for Current status
 */
export function classifyItemEra(item: PortfolioItem): PokemonEra {
  const category = item.category?.toLowerCase().trim() || '';
  const productName = item.productName?.toLowerCase().trim() || '';
  const searchText = `${category} ${productName}`;
  
  // First, try to match by set name in category (the Set column from CSV)
  // This takes priority over dateAdded
  let matchedEra: PokemonEra | null = null;
  
  // Check each era's sets - looking for exact or partial matches
  for (const [era, sets] of Object.entries(ERA_SETS) as [Exclude<PokemonEra, 'current'>, string[]][]) {
    for (const set of sets) {
      const setLower = set.toLowerCase();
      // Check if category matches the set name (primary match)
      if (category.includes(setLower) || setLower.includes(category)) {
        matchedEra = era;
        break;
      }
      // Also check product name for set references
      if (productName.includes(setLower)) {
        matchedEra = era;
        break;
      }
    }
    if (matchedEra) break;
  }
  
  // Fallback heuristics if no direct match found
  if (!matchedEra) {
    // Check for common patterns in category/product name
    if (searchText.includes('base set') || searchText.includes('jungle') || searchText.includes('fossil') ||
        searchText.includes('neo') || searchText.includes('expedition') || searchText.includes('skyridge') ||
        searchText.includes('aquapolis') || searchText.includes('1st edition') || searchText.includes('shadowless') ||
        searchText.includes('gym heroes') || searchText.includes('gym challenge') || searchText.includes('team rocket')) {
      matchedEra = 'vintage';
    } else if (searchText.includes('diamond') || searchText.includes('pearl') || searchText.includes('platinum') || 
               searchText.includes('heartgold') || searchText.includes('soulsilver') || 
               searchText.includes('black & white') || searchText.includes('plasma') ||
               searchText.includes('hgss') || searchText.includes('call of legends') ||
               searchText.includes('legendary treasures')) {
      matchedEra = 'classic';
    } else if (searchText.includes('xy') || searchText.includes('sun & moon') || searchText.includes('sun and moon') ||
               searchText.includes('hidden fates') || searchText.includes('evolutions') || 
               searchText.includes('generations') || searchText.includes('shining legends') ||
               searchText.includes('detective pikachu') || searchText.includes('cosmic eclipse') ||
               searchText.includes('burning shadows') || searchText.includes('guardians rising')) {
      matchedEra = 'modern';
    } else if (searchText.includes('sword') || searchText.includes('shield') || 
               searchText.includes('scarlet') || searchText.includes('violet') ||
               searchText.includes('celebrations') || searchText.includes('evolving skies') || 
               searchText.includes('151') || searchText.includes('crown zenith') || 
               searchText.includes('paldea') || searchText.includes('prismatic') ||
               searchText.includes('brilliant stars') || searchText.includes('shining fates') ||
               searchText.includes('fusion strike') || searchText.includes('astral radiance') ||
               searchText.includes('lost origin') || searchText.includes('silver tempest') ||
               searchText.includes('paradox rift') || searchText.includes('temporal forces') ||
               searchText.includes('surging sparks') || searchText.includes('obsidian flames') ||
               searchText.includes('stellar crown') || searchText.includes('journey together') ||
               searchText.includes('twilight masquerade') || searchText.includes('shrouded fable') ||
               searchText.includes('paldean fates') || searchText.includes('destined rivals')) {
      matchedEra = 'ultraModern';
    }
  }
  
  // If still no match, check dateAdded for very recent items (current window)
  // But only assign 'current' if the item was added very recently AND no era match
  if (!matchedEra && item.dateAdded) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    if (item.dateAdded >= twelveMonthsAgo) {
      return 'current';
    }
  }
  
  // Default to the matched era, or ultraModern as fallback
  return matchedEra || 'ultraModern';
}

/**
 * Calculate era allocation breakdown for portfolio items
 */
export function calculateEraAllocationBreakdown(items: PortfolioItem[]): EraAllocationBreakdown {
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  
  const eraGroups: Record<PokemonEra, PortfolioItem[]> = {
    vintage: [],
    classic: [],
    modern: [],
    ultraModern: [],
    current: [],
  };
  
  items.forEach(item => {
    const era = classifyItemEra(item);
    eraGroups[era].push(item);
  });
  
  const calculateGroup = (era: PokemonEra) => {
    const group = eraGroups[era];
    const value = group.reduce((sum, item) => sum + item.totalMarketValue, 0);
    return {
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
      count: group.length,
    };
  };
  
  return {
    vintage: calculateGroup('vintage'),
    classic: calculateGroup('classic'),
    modern: calculateGroup('modern'),
    ultraModern: calculateGroup('ultraModern'),
    current: calculateGroup('current'),
  };
}

/**
 * Generate era-based health warnings
 */
export interface EraHealthWarning {
  type: 'current_high' | 'newer_era_high' | 'newer_era_low' | 'older_era_low';
  message: string;
  severity: 'warning' | 'info';
}

export function generateEraHealthWarnings(
  eraAllocation: EraAllocationBreakdown,
  target: EraAllocationTarget
): EraHealthWarning[] {
  const warnings: EraHealthWarning[] = [];
  
  // Check Current exposure
  if (eraAllocation.current.percent > 10) {
    warnings.push({
      type: 'current_high',
      message: 'Current exposure is above 10% — portfolio is more speculative.',
      severity: 'warning',
    });
  }
  
  // Check newer-era group (Modern + Ultra Modern + Current)
  const newerEraPercent = eraAllocation.modern.percent + eraAllocation.ultraModern.percent + eraAllocation.current.percent;
  if (newerEraPercent > 55) {
    warnings.push({
      type: 'newer_era_high',
      message: 'Newer-era exposure: High risk',
      severity: 'warning',
    });
  } else if (newerEraPercent < 45) {
    warnings.push({
      type: 'newer_era_low',
      message: 'Newer-era exposure: Lower growth / more conservative',
      severity: 'info',
    });
  }
  
  // Check older-era group (Vintage + Classic)
  const olderEraPercent = eraAllocation.vintage.percent + eraAllocation.classic.percent;
  if (olderEraPercent < 30) {
    warnings.push({
      type: 'older_era_low',
      message: 'Older-era exposure is low — portfolio may be less durable.',
      severity: 'warning',
    });
  }
  
  return warnings;
}

/**
 * Get newer-era status text
 */
export function getNewerEraStatus(eraAllocation: EraAllocationBreakdown): { text: string; status: 'healthy' | 'high' | 'low' } {
  const newerEraPercent = eraAllocation.modern.percent + eraAllocation.ultraModern.percent + eraAllocation.current.percent;
  
  if (newerEraPercent >= 45 && newerEraPercent <= 55) {
    return { text: 'Newer-era exposure: Healthy', status: 'healthy' };
  } else if (newerEraPercent > 55) {
    return { text: 'Newer-era exposure: High risk', status: 'high' };
  } else {
    return { text: 'Newer-era exposure: Lower growth / more conservative', status: 'low' };
  }
}

/**
 * Calculate era health score (0-100)
 * Uses a hard floor of 50 with bonuses for vintage/era coverage
 */
export function calculateEraHealthScore(
  eraAllocation: EraAllocationBreakdown
): number {
  const vintagePercent = eraAllocation.vintage.percent;
  const classicPercent = eraAllocation.classic.percent;
  const modernPercent = eraAllocation.modern.percent;
  const ultraModernPercent = eraAllocation.ultraModern.percent;
  const currentPercent = eraAllocation.current.percent;
  
  const allPercents = [vintagePercent, classicPercent, modernPercent, ultraModernPercent, currentPercent];
  
  // Check if 100% in one era - minimum score
  const maxPercent = Math.max(...allPercents);
  if (maxPercent === 100) {
    return 50; // Minimum score for complete concentration
  }
  
  // Count eras with at least 10% allocation
  const erasWithMinAllocation = allPercents.filter(p => p >= 10).length;
  
  // If all 5 eras have at least 10%, guarantee at least 70
  if (erasWithMinAllocation === 5) {
    let score = 70;
    
    // Bonus for Classic & Vintage allocation (older eras = lower risk = higher score)
    const olderEraPercent = vintagePercent + classicPercent;
    if (olderEraPercent >= 50) {
      score += 20; // Heavy older era = excellent
    } else if (olderEraPercent >= 40) {
      score += 15;
    } else if (olderEraPercent >= 30) {
      score += 10;
    } else if (olderEraPercent >= 20) {
      score += 5;
    }
    
    // Extra bonus for vintage specifically
    if (vintagePercent >= 25) {
      score += 5;
    }
    
    return Math.min(100, score);
  }
  
  // Base score starts lower when not all eras have 10%+
  let score = 50;
  
  // Add points for diversity
  score += erasWithMinAllocation * 5;
  
  // Bonus for Classic & Vintage (older eras = safer = higher score)
  const olderEraPercent = vintagePercent + classicPercent;
  if (olderEraPercent >= 50) {
    score += 15;
  } else if (olderEraPercent >= 40) {
    score += 12;
  } else if (olderEraPercent >= 30) {
    score += 8;
  } else if (olderEraPercent >= 20) {
    score += 4;
  }
  
  // Penalty for over-concentration in any single era (lack of diversity)
  if (maxPercent >= 80) {
    score -= 15; // Severely over-leveraged
  } else if (maxPercent >= 60) {
    score -= 10; // Moderately over-leveraged
  } else if (maxPercent >= 50) {
    score -= 5; // Slightly concentrated
  }
  
  // Extra bonus for vintage
  if (vintagePercent >= 20) {
    score += 5;
  } else if (vintagePercent >= 10) {
    score += 3;
  }
  
  return Math.max(50, Math.min(100, Math.round(score)));
}

/**
 * Calculate position concentration score (0-100)
 * Based on individual positions (unique cards/products), not sets
 */
export interface PositionConcentration {
  top1Percent: number;
  top1Name: string;
  top3Percent: number;
  top3Names: string[];
  top5Percent: number;
  top5Names: string[];
  positionBreakdown: { name: string; value: number; percent: number; quantity: number }[];
}

export function calculatePositionConcentration(items: PortfolioItem[]): PositionConcentration {
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  
  // Group by unique position (product name is the position identifier)
  // Aggregate multiple units of same product into single position
  const positionValues: Record<string, { value: number; quantity: number }> = {};
  
  items.forEach(item => {
    const positionKey = item.productName || 'Unknown';
    if (!positionValues[positionKey]) {
      positionValues[positionKey] = { value: 0, quantity: 0 };
    }
    positionValues[positionKey].value += item.totalMarketValue;
    positionValues[positionKey].quantity += item.quantity || 1;
  });
  
  // Sort by value descending
  const sortedPositions = Object.entries(positionValues)
    .map(([name, data]) => ({
      name,
      value: data.value,
      percent: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      quantity: data.quantity,
    }))
    .sort((a, b) => b.value - a.value);
  
  const top3 = sortedPositions.slice(0, 3);
  const top5 = sortedPositions.slice(0, 5);
  const top3Value = top3.reduce((sum, p) => sum + p.value, 0);
  const top5Value = top5.reduce((sum, p) => sum + p.value, 0);
  
  return {
    top1Percent: sortedPositions[0]?.percent || 0,
    top1Name: sortedPositions[0]?.name || 'N/A',
    top3Percent: totalValue > 0 ? (top3Value / totalValue) * 100 : 0,
    top3Names: top3.map(p => p.name),
    top5Percent: totalValue > 0 ? (top5Value / totalValue) * 100 : 0,
    top5Names: top5.map(p => p.name),
    positionBreakdown: sortedPositions,
  };
}

/**
 * Calculate concentration health score (0-100) based on position concentration
 * Uses weighted scoring across top 1, 3, and 5 positions
 */
export function calculateConcentrationHealthScore(
  top1Percent: number,
  top3Percent: number,
  top5Percent: number
): number {
  // Top 1 Position scoring (40% weight)
  let top1Score: number;
  if (top1Percent <= 10) {
    top1Score = 90 + (10 - top1Percent) * 0.5; // 90-95
  } else if (top1Percent <= 20) {
    top1Score = 85 - (top1Percent - 10); // 75-85
  } else if (top1Percent <= 30) {
    top1Score = 75 - (top1Percent - 20); // 65-75
  } else {
    top1Score = 60 - Math.min(10, (top1Percent - 30) * 0.5); // 50-60
  }
  
  // Top 3 Positions scoring (35% weight)
  let top3Score: number;
  if (top3Percent <= 20) {
    top3Score = 90 + (20 - top3Percent) * 0.25; // 90-95
  } else if (top3Percent <= 35) {
    top3Score = 85 - (top3Percent - 20) * 0.67; // 75-85
  } else if (top3Percent <= 50) {
    top3Score = 75 - (top3Percent - 35) * 0.67; // 65-75
  } else {
    top3Score = 60 - Math.min(10, (top3Percent - 50) * 0.2); // 50-60
  }
  
  // Top 5 Positions scoring (25% weight)
  let top5Score: number;
  if (top5Percent <= 30) {
    top5Score = 90 + (30 - top5Percent) * 0.17; // 90-95
  } else if (top5Percent <= 50) {
    top5Score = 85 - (top5Percent - 30) * 0.5; // 75-85
  } else if (top5Percent <= 70) {
    top5Score = 75 - (top5Percent - 50) * 0.5; // 65-75
  } else {
    top5Score = 60 - Math.min(10, (top5Percent - 70) * 0.33); // 50-60
  }
  
  // Weighted average
  const finalScore = (top1Score * 0.40) + (top3Score * 0.35) + (top5Score * 0.25);
  
  // Floor at 50
  return Math.max(50, Math.min(100, Math.round(finalScore)));
}

/**
 * Calculate asset allocation health score (0-100)
 * Sealed-dominant scoring with hard rules
 */
export function calculateAssetHealthScore(
  sealedPercent: number,
  slabsPercent: number,
  rawPercent: number
): number {
  // Hard rule: If Sealed >= 40%, minimum score is 80
  let score = 60; // Base score
  
  if (sealedPercent >= 70) {
    score = 95;
  } else if (sealedPercent >= 55) {
    score = 90;
  } else if (sealedPercent >= 40) {
    score = 80;
  } else if (sealedPercent >= 25) {
    score = 70;
  }
  
  // Penalty for extreme raw exposure
  if (rawPercent > 60 && sealedPercent < 40) {
    score = Math.min(score, 60);
  }
  
  // Penalty for extreme slabs without sealed
  if (slabsPercent > 70 && sealedPercent < 25) {
    score = Math.min(score, 65);
  }
  
  return Math.max(50, Math.min(100, Math.round(score)));
}

/**
 * Calculate set concentration metrics (legacy, kept for reference)
 */
export function calculateSetConcentration(items: PortfolioItem[]): {
  topSetPercent: number;
  topSetName: string;
  top3SetsPercent: number;
  top3SetsNames: string[];
  setBreakdown: { name: string; value: number; percent: number; count: number }[];
} {
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  
  // Group by set (category)
  const setValues: Record<string, { value: number; count: number }> = {};
  items.forEach(item => {
    const set = item.category || 'Unknown';
    if (!setValues[set]) {
      setValues[set] = { value: 0, count: 0 };
    }
    setValues[set].value += item.totalMarketValue;
    setValues[set].count += 1;
  });
  
  // Sort by value descending
  const sortedSets = Object.entries(setValues)
    .map(([name, data]) => ({
      name,
      value: data.value,
      percent: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.value - a.value);
  
  const top3 = sortedSets.slice(0, 3);
  const top3Value = top3.reduce((sum, s) => sum + s.value, 0);
  
  return {
    topSetPercent: sortedSets[0]?.percent || 0,
    topSetName: sortedSets[0]?.name || 'N/A',
    top3SetsPercent: totalValue > 0 ? (top3Value / totalValue) * 100 : 0,
    top3SetsNames: top3.map(s => s.name),
    setBreakdown: sortedSets,
  };
}
