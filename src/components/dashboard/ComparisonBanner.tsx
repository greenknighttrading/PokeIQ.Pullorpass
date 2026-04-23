import React from 'react';
import { usePortfolio, PortfolioComparison } from '@/contexts/PortfolioContext';
import { GitCompare, TrendingUp, TrendingDown, Minus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ComparisonBanner() {
  const { comparison, clearComparison } = usePortfolio();

  if (!comparison?.hasComparison) return null;

  const formatChange = (value: number, suffix = '') => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}${suffix}`;
  };

  const formatDollarChange = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="glass-card p-4 mb-6 border-l-4 border-l-primary animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <GitCompare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Portfolio Comparison Active</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Comparing your new upload to your previous portfolio data
            </p>

            {/* Key Changes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Value Change */}
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-0.5">Value</p>
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  comparison.valueChange >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatDollarChange(comparison.valueChange)}
                </p>
                <p className={cn(
                  "text-xs tabular-nums",
                  comparison.valueChangePercent >= 0 ? "text-success/70" : "text-destructive/70"
                )}>
                  {formatChange(comparison.valueChangePercent, '%')}
                </p>
              </div>

              {/* Health Score Change */}
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-0.5">Health Score</p>
                <div className="flex items-center gap-1">
                  <p className={cn(
                    "text-sm font-semibold tabular-nums",
                    comparison.healthScoreChange > 0 ? "text-success" : 
                    comparison.healthScoreChange < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {comparison.healthScoreChange > 0 ? '+' : ''}{comparison.healthScoreChange}
                  </p>
                  {comparison.healthScoreChange > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                  ) : comparison.healthScoreChange < 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Items Change */}
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-0.5">Items</p>
                <p className={cn(
                  "text-sm font-semibold tabular-nums",
                  comparison.itemCountChange > 0 ? "text-success" : 
                  comparison.itemCountChange < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {comparison.itemCountChange > 0 ? '+' : ''}{comparison.itemCountChange}
                </p>
                <p className="text-xs text-muted-foreground">
                  {comparison.newItems.length} new, {comparison.removedItems.length} removed
                </p>
              </div>

              {/* Allocation Shifts */}
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground mb-0.5">Allocation</p>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className={cn(
                    comparison.sealedChange >= 0 ? "text-success" : "text-destructive"
                  )}>
                    Sealed: {formatChange(comparison.sealedChange, '%')}
                  </span>
                  <span className={cn(
                    comparison.slabsChange >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    Slabs: {formatChange(comparison.slabsChange, '%')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0 h-8 w-8"
          onClick={clearComparison}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
