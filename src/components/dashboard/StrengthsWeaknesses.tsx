import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';

interface StrengthWeakness {
  text: string;
  type: 'strength' | 'weakness';
}

export function StrengthsWeaknesses() {
  const { items, summary, concentration, allocation, allocationTarget } = usePortfolio();

  const analysis = useMemo((): StrengthWeakness[] => {
    if (!summary || !concentration || !allocation) return [];

    const results: StrengthWeakness[] = [];

    // Strengths
    if (summary.unrealizedPLPercent > 20) {
      results.push({ text: `Strong overall returns (+${summary.unrealizedPLPercent.toFixed(1)}%)`, type: 'strength' });
    } else if (summary.unrealizedPLPercent > 0) {
      results.push({ text: `Positive portfolio performance (+${summary.unrealizedPLPercent.toFixed(1)}%)`, type: 'strength' });
    }

    if (summary.holdingsInProfitPercent >= 70) {
      results.push({ text: `High win rate (${summary.holdingsInProfitPercent.toFixed(0)}% of holdings profitable)`, type: 'strength' });
    }

    if (concentration.top1Percent < 15) {
      results.push({ text: 'Well-diversified holdings', type: 'strength' });
    }

    const uniqueCategories = new Set(items.map(item => item.category)).size;
    if (uniqueCategories >= 5) {
      results.push({ text: `Good category diversity (${uniqueCategories} sets)`, type: 'strength' });
    }

    const milestone500 = items.filter(item => item.gainPercent >= 500).length;
    const milestone300 = items.filter(item => item.gainPercent >= 300).length;
    if (milestone500 > 0) {
      results.push({ text: `${milestone500} holding${milestone500 > 1 ? 's' : ''} at 500%+ gains`, type: 'strength' });
    } else if (milestone300 > 0) {
      results.push({ text: `${milestone300} holding${milestone300 > 1 ? 's' : ''} at 300%+ gains`, type: 'strength' });
    }

    // Weaknesses
    if (summary.unrealizedPLPercent < -10) {
      results.push({ text: `Portfolio down ${Math.abs(summary.unrealizedPLPercent).toFixed(1)}%`, type: 'weakness' });
    }

    if (concentration.top1Percent > 25) {
      results.push({ text: `High concentration risk (${concentration.top1Percent.toFixed(1)}% in single position)`, type: 'weakness' });
    } else if (concentration.top1Percent > 20) {
      results.push({ text: `Moderate concentration (${concentration.top1Percent.toFixed(1)}% in top holding)`, type: 'weakness' });
    }

    const deepLosses = items.filter(item => item.gainPercent <= -30).length;
    if (deepLosses > 0) {
      results.push({ text: `${deepLosses} position${deepLosses > 1 ? 's' : ''} down 30%+`, type: 'weakness' });
    }

    if (summary.holdingsInProfitPercent < 50) {
      results.push({ text: `Low win rate (${summary.holdingsInProfitPercent.toFixed(0)}% profitable)`, type: 'weakness' });
    }

    // Allocation imbalance
    const allocationDiffs = [
      { name: 'Sealed', diff: Math.abs(allocation.sealed.percent - allocationTarget.sealed) },
      { name: 'Slabs', diff: Math.abs(allocation.slabs.percent - allocationTarget.slabs) },
      { name: 'Raw', diff: Math.abs(allocation.rawCards.percent - allocationTarget.rawCards) },
    ];
    const maxDiff = Math.max(...allocationDiffs.map(a => a.diff));
    if (maxDiff > 20) {
      results.push({ text: 'Allocation significantly off-target', type: 'weakness' });
    }

    return results;
  }, [items, summary, concentration, allocation, allocationTarget]);

  const strengths = analysis.filter(a => a.type === 'strength');
  const weaknesses = analysis.filter(a => a.type === 'weakness');

  if (strengths.length === 0 && weaknesses.length === 0) return null;

  return (
    <div className="glass-card p-6 animate-fade-in">
      <h3 className="text-lg font-semibold text-foreground mb-4">Portfolio Analysis</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div>
            <p className="text-sm font-medium text-success flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" />
              Strengths
            </p>
            <ul className="space-y-2">
              {strengths.map((item, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div>
            <p className="text-sm font-medium text-warning flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" />
              Areas to Watch
            </p>
            <ul className="space-y-2">
              {weaknesses.map((item, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 flex-shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
