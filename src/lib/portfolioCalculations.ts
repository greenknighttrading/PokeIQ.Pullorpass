import {
  PortfolioItem,
  PortfolioSummary,
  AllocationBreakdown,
  AllocationTarget,
  ConcentrationRisk,
  ProfitMilestone,
  Insight,
  RebalanceSuggestion,
} from './types';

/**
 * Calculate portfolio summary metrics
 */
export function calculatePortfolioSummary(items: PortfolioItem[]): PortfolioSummary {
  const totalMarketValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const totalCostBasis = items.reduce((sum, item) => sum + item.totalCostBasis, 0);
  const unrealizedPL = totalMarketValue - totalCostBasis;
  const unrealizedPLPercent = totalCostBasis > 0 ? (unrealizedPL / totalCostBasis) * 100 : 0;

  const holdingsInProfit = items.filter(item => item.profitDollars > 0);
  const holdingsInProfitCount = holdingsInProfit.length;
  const holdingsInProfitPercent = items.length > 0 ? (holdingsInProfitCount / items.length) * 100 : 0;

  // Calculate health score (0-100)
  const healthScore = calculateHealthScore(items, holdingsInProfitPercent, unrealizedPLPercent);

  return {
    totalMarketValue,
    totalCostBasis,
    unrealizedPL,
    unrealizedPLPercent,
    holdingsInProfitCount,
    holdingsInProfitPercent,
    totalHoldings: items.length,
    healthScore,
  };
}

/**
 * Calculate portfolio health score (0-100)
 * Factors: profit %, concentration, allocation balance, position diversity
 */
function calculateHealthScore(
  items: PortfolioItem[],
  holdingsInProfitPercent: number,
  unrealizedPLPercent: number
): number {
  if (items.length === 0) return 0;

  let score = 50; // Start at neutral

  // Factor 1: Profit percentage (up to +20 points)
  if (unrealizedPLPercent > 0) {
    score += Math.min(20, unrealizedPLPercent / 5);
  } else {
    score += Math.max(-20, unrealizedPLPercent / 3);
  }

  // Factor 2: Holdings in profit ratio (up to +15 points)
  score += (holdingsInProfitPercent / 100) * 15;

  // Factor 3: Concentration penalty (up to -15 points)
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const sortedItems = [...items].sort((a, b) => b.totalMarketValue - a.totalMarketValue);
  const top1Percent = totalValue > 0 ? (sortedItems[0]?.totalMarketValue || 0) / totalValue * 100 : 0;
  if (top1Percent > 30) {
    score -= 15;
  } else if (top1Percent > 20) {
    score -= 10;
  } else if (top1Percent > 15) {
    score -= 5;
  }

  // Factor 4: Diversification bonus (up to +10 points)
  const uniqueCategories = new Set(items.map(item => item.category)).size;
  score += Math.min(10, uniqueCategories * 2);

  // Factor 5: Deep losses penalty (up to -10 points)
  const deepLosses = items.filter(item => item.gainPercent < -30).length;
  score -= Math.min(10, deepLosses * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate allocation breakdown by asset type
 */
export function calculateAllocationBreakdown(items: PortfolioItem[]): AllocationBreakdown {
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);

  const sealed = items.filter(item => item.assetType === 'Sealed');
  const slabs = items.filter(item => item.assetType === 'Slab');
  const rawCards = items.filter(item => item.assetType === 'Raw Card');

  const sealedValue = sealed.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const slabsValue = slabs.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const rawCardsValue = rawCards.reduce((sum, item) => sum + item.totalMarketValue, 0);

  return {
    sealed: {
      value: sealedValue,
      percent: totalValue > 0 ? (sealedValue / totalValue) * 100 : 0,
      count: sealed.length,
    },
    slabs: {
      value: slabsValue,
      percent: totalValue > 0 ? (slabsValue / totalValue) * 100 : 0,
      count: slabs.length,
    },
    rawCards: {
      value: rawCardsValue,
      percent: totalValue > 0 ? (rawCardsValue / totalValue) * 100 : 0,
      count: rawCards.length,
    },
  };
}

/**
 * Calculate concentration risk metrics
 */
export function calculateConcentrationRisk(items: PortfolioItem[]): ConcentrationRisk {
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  
  // Sort items by value descending
  const sortedItems = [...items].sort((a, b) => b.totalMarketValue - a.totalMarketValue);

  const top1 = sortedItems[0];
  const top3 = sortedItems.slice(0, 3);
  const top5 = sortedItems.slice(0, 5);

  const top1Value = top1?.totalMarketValue || 0;
  const top3Value = top3.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const top5Value = top5.reduce((sum, item) => sum + item.totalMarketValue, 0);

  // Calculate top set exposure
  const setValues: Record<string, number> = {};
  items.forEach(item => {
    const set = item.category || 'Unknown';
    setValues[set] = (setValues[set] || 0) + item.totalMarketValue;
  });

  const sortedSets = Object.entries(setValues).sort((a, b) => b[1] - a[1]);
  const topSet = sortedSets[0] || ['Unknown', 0];

  return {
    top1Percent: totalValue > 0 ? (top1Value / totalValue) * 100 : 0,
    top1Name: top1?.productName || 'N/A',
    top3Percent: totalValue > 0 ? (top3Value / totalValue) * 100 : 0,
    top3Names: top3.map(item => item.productName),
    top5Percent: totalValue > 0 ? (top5Value / totalValue) * 100 : 0,
    top5Names: top5.map(item => item.productName),
    topSetPercent: totalValue > 0 ? (topSet[1] / totalValue) * 100 : 0,
    topSetName: topSet[0],
  };
}

/**
 * Find holdings that have reached profit milestones
 */
export function findProfitMilestones(items: PortfolioItem[]): ProfitMilestone[] {
  const milestones: ProfitMilestone[] = [];

  items.forEach(item => {
    if (item.gainPercent >= 500) {
      milestones.push({
        item,
        milestone: 500,
        sellHalfProfit: (item.quantity / 2) * item.marketPrice - (item.quantity / 2) * item.averageCostPaid,
        sellHalfUnitsRemaining: Math.floor(item.quantity / 2),
      });
    } else if (item.gainPercent >= 300) {
      milestones.push({
        item,
        milestone: 300,
        sellHalfProfit: (item.quantity / 2) * item.marketPrice - (item.quantity / 2) * item.averageCostPaid,
        sellHalfUnitsRemaining: Math.floor(item.quantity / 2),
      });
    } else if (item.gainPercent >= 200) {
      milestones.push({
        item,
        milestone: 200,
        sellHalfProfit: (item.quantity / 2) * item.marketPrice - (item.quantity / 2) * item.averageCostPaid,
        sellHalfUnitsRemaining: Math.floor(item.quantity / 2),
      });
    }
  });

  return milestones.sort((a, b) => b.item.gainPercent - a.item.gainPercent);
}

/**
 * Calculate days since last action (using most recent date added)
 */
export function calculateDaysSinceLastAction(items: PortfolioItem[]): number {
  const validDates = items
    .filter(item => item.dateAdded)
    .map(item => {
      const date = item.dateAdded;
      // Handle both Date objects and string dates (from JSON)
      if (date instanceof Date) {
        return date.getTime();
      } else if (typeof date === 'string') {
        return new Date(date).getTime();
      }
      return null;
    })
    .filter((time): time is number => time !== null && !isNaN(time));

  if (validDates.length === 0) return -1;

  const mostRecent = Math.max(...validDates);
  const now = Date.now();
  return Math.floor((now - mostRecent) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate trading frequency signal
 */
export function calculateTradingFrequency(items: PortfolioItem[]): 'low' | 'medium' | 'high' {
  const validDates = items
    .filter(item => item.dateAdded)
    .map(item => item.dateAdded!.getTime())
    .sort((a, b) => a - b);

  if (validDates.length < 2) return 'low';

  const totalDays = (validDates[validDates.length - 1] - validDates[0]) / (1000 * 60 * 60 * 24);
  const transactionsPerMonth = (validDates.length / totalDays) * 30;

  if (transactionsPerMonth > 10) return 'high';
  if (transactionsPerMonth > 3) return 'medium';
  return 'low';
}

/**
 * Generate rebalancing suggestions
 */
export function generateRebalanceSuggestions(
  allocation: AllocationBreakdown,
  target: AllocationTarget,
  totalValue: number
): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];

  const categories: Array<{
    key: 'sealed' | 'slabs' | 'rawCards';
    label: string;
    current: number;
    target: number;
  }> = [
    { key: 'sealed', label: 'sealed products', current: allocation.sealed.percent, target: target.sealed },
    { key: 'slabs', label: 'graded cards', current: allocation.slabs.percent, target: target.slabs },
    { key: 'rawCards', label: 'raw cards', current: allocation.rawCards.percent, target: target.rawCards },
  ];

  categories.forEach(cat => {
    const diff = cat.current - cat.target;
    const amount = Math.abs(diff / 100) * totalValue;

    if (diff > 10) {
      suggestions.push({
        category: cat.key,
        action: 'sell',
        amount,
        reason: `Consider trimming ${cat.label} — currently ${Math.round(diff)}% above target allocation.`,
      });
    } else if (diff < -10) {
      suggestions.push({
        category: cat.key,
        action: 'redirect',
        amount,
        reason: `Consider redirecting capital into ${cat.label} — currently ${Math.round(Math.abs(diff))}% below target.`,
      });
    }
  });

  return suggestions;
}

/**
 * Generate insights based on portfolio analysis
 */
export function generateInsights(
  items: PortfolioItem[],
  summary: PortfolioSummary,
  concentration: ConcentrationRisk,
  milestones: ProfitMilestone[],
  allocation: AllocationBreakdown,
  target: AllocationTarget
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Deep loss insights (new)
  const deepLosses = items.filter(item => item.gainPercent <= -30);
  if (deepLosses.length > 0) {
    insights.push({
      id: `insight-${Date.now()}-loss`,
      type: 'loss',
      priority: 'high',
      message: `${deepLosses.length} holding${deepLosses.length > 1 ? 's are' : ' is'} down 30% or more — consider whether these still align with your thesis or if tax-loss harvesting makes sense.`,
      timestamp: now,
      dismissed: false,
      relatedItemIds: deepLosses.map(item => item.id),
    });
  }

  // Moderate loss insights
  const moderateLosses = items.filter(item => item.gainPercent <= -15 && item.gainPercent > -30);
  if (moderateLosses.length >= 3) {
    insights.push({
      id: `insight-${Date.now()}-modloss`,
      type: 'loss',
      priority: 'medium',
      message: `${moderateLosses.length} holdings are down 15-30% — monitor these positions for potential recovery or further decline.`,
      timestamp: now,
      dismissed: false,
      relatedItemIds: moderateLosses.map(item => item.id),
    });
  }

  // Profit milestone insights
  if (milestones.length > 0) {
    const milestone500 = milestones.filter(m => m.milestone === 500);
    const milestone300 = milestones.filter(m => m.milestone === 300);
    const milestone200 = milestones.filter(m => m.milestone === 200);

    if (milestone500.length > 0) {
      insights.push({
        id: `insight-${Date.now()}-500`,
        type: 'profit',
        priority: 'high',
        message: `${milestone500.length} holding${milestone500.length > 1 ? 's have' : ' has'} exceeded 500% gains — historically an excellent point to consider locking in profits.`,
        timestamp: now,
        dismissed: false,
        relatedItemIds: milestone500.map(m => m.item.id),
      });
    }

    if (milestone300.length > 0) {
      insights.push({
        id: `insight-${Date.now()}-300`,
        type: 'profit',
        priority: 'high',
        message: `${milestone300.length} holding${milestone300.length > 1 ? 's have' : ' has'} exceeded 300% gains — consider whether partial profit-taking aligns with your goals.`,
        timestamp: now,
        dismissed: false,
        relatedItemIds: milestone300.map(m => m.item.id),
      });
    }

    if (milestone200.length > 0) {
      insights.push({
        id: `insight-${Date.now()}-200`,
        type: 'profit',
        priority: 'medium',
        message: `${milestone200.length} holding${milestone200.length > 1 ? 's have' : ' has'} reached the 200% gain milestone — a good time to review your position.`,
        timestamp: now,
        dismissed: false,
        relatedItemIds: milestone200.map(m => m.item.id),
      });
    }
  }

  // Concentration insights
  if (concentration.top1Percent > 20) {
    const topItem = items.find(item => item.productName === concentration.top1Name);
    insights.push({
      id: `insight-${Date.now()}-conc1`,
      type: 'concentration',
      priority: 'high',
      message: `Your top position represents ${concentration.top1Percent.toFixed(1)}% of your portfolio — consider whether this concentration aligns with your risk tolerance.`,
      timestamp: now,
      dismissed: false,
      relatedItemIds: topItem ? [topItem.id] : [],
    });
  }

  if (concentration.top3Percent > 40) {
    const top3Items = items
      .filter(item => concentration.top3Names.includes(item.productName))
      .map(item => item.id);
    insights.push({
      id: `insight-${Date.now()}-conc3`,
      type: 'concentration',
      priority: 'medium',
      message: `Your top 3 holdings represent ${concentration.top3Percent.toFixed(1)}% of portfolio value — diversification could reduce position-specific risk.`,
      timestamp: now,
      dismissed: false,
      relatedItemIds: top3Items,
    });
  }

  // Allocation insights
  const allocationDiffs = [
    { name: 'sealed', diff: allocation.sealed.percent - target.sealed },
    { name: 'slabs', diff: allocation.slabs.percent - target.slabs },
    { name: 'rawCards', diff: allocation.rawCards.percent - target.rawCards },
  ];

  allocationDiffs.forEach(({ name, diff }) => {
    if (Math.abs(diff) > 15) {
      const label = name === 'rawCards' ? 'raw cards' : name === 'slabs' ? 'graded cards' : 'sealed products';
      insights.push({
        id: `insight-${Date.now()}-alloc-${name}`,
        type: 'allocation',
        priority: diff > 0 ? 'medium' : 'low',
        message: diff > 0
          ? `Your ${label} allocation is ${Math.round(diff)}% above target — redirecting new capital elsewhere could improve balance.`
          : `Your ${label} allocation is ${Math.round(Math.abs(diff))}% below target — consider directing your next purchase here.`,
        timestamp: now,
        dismissed: false,
      });
    }
  });

  // Patience insights
  const daysSince = calculateDaysSinceLastAction(items);
  if (daysSince > 60) {
    insights.push({
      id: `insight-${Date.now()}-patience`,
      type: 'patience',
      priority: 'low',
      message: `No additions in ${daysSince} days — long-term investors historically outperform frequent traders. Your patience is an edge.`,
      timestamp: now,
      dismissed: false,
    });
  }

  // Rebalancing insights
  const suggestions = generateRebalanceSuggestions(allocation, target, summary.totalMarketValue);
  if (suggestions.length > 0 && summary.totalMarketValue > 1000) {
    const redirectSuggestion = suggestions.find(s => s.action === 'redirect');
    if (redirectSuggestion) {
      const label = redirectSuggestion.category === 'rawCards' ? 'raw cards' : redirectSuggestion.category;
      insights.push({
        id: `insight-${Date.now()}-rebal`,
        type: 'rebalance',
        priority: 'medium',
        message: `Redirecting your next $${Math.min(1000, Math.round(redirectSuggestion.amount)).toLocaleString()} into ${label} would move you closer to your target allocation.`,
        timestamp: now,
        dismissed: false,
      });
    }
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
