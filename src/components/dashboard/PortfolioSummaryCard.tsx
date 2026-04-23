import React from 'react';
import { TrendingUp, TrendingDown, HeartPulse, DollarSign, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortfolio } from '@/contexts/PortfolioContext';

export function PortfolioSummaryCard() {
  const { summary, healthScoreBreakdown } = usePortfolio();

  if (!summary) return null;

  const isProfit = summary.unrealizedPL >= 0;
  const healthScore = healthScoreBreakdown?.overall ?? summary.healthScore;

  const getHealthColor = (score: number) => {
    if (score >= 65) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthBg = (score: number) => {
    if (score >= 65) return 'bg-success/10';
    if (score >= 50) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const getHealthDescription = (score: number) => {
    if (score >= 75) return 'Well balanced';
    if (score >= 65) return 'Moderate risk';
    return 'High concentration';
  };

  return (
    <div className="glass-card p-3 sm:p-4 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-0 sm:divide-x divide-border">
        {/* Total Value */}
        <div className="flex flex-col items-center justify-start px-2 sm:px-4 min-w-0">
          <p className="text-xs sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 justify-center uppercase tracking-wider font-medium whitespace-nowrap">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <DollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
            </span>
            Total Value
          </p>
          <p className="text-lg sm:text-lg md:text-xl font-bold tracking-tight tabular-nums text-foreground truncate w-full text-center">
            ${summary.totalMarketValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-1 mt-0.5 justify-center flex-wrap">
            {isProfit ? (
              <TrendingUp className="w-3 h-3 text-success shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive shrink-0" />
            )}
            <span className={cn(
              "text-xs sm:text-xs font-medium tabular-nums",
              isProfit ? "text-success" : "text-destructive"
            )}>
              {isProfit ? '+' : ''}${summary.unrealizedPL.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              {' '}({isProfit ? '+' : ''}{summary.unrealizedPLPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Cost Basis */}
        <div className="flex flex-col items-center justify-start px-2 sm:px-4 min-w-0">
          <p className="text-xs sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 justify-center uppercase tracking-wider font-medium whitespace-nowrap">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <CircleDollarSign className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
            </span>
            Cost Basis
          </p>
          <p className="text-lg sm:text-lg md:text-xl font-bold tabular-nums text-foreground truncate w-full text-center">
            ${summary.totalCostBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* In Profit */}
        <div className="flex flex-col items-center justify-start px-2 sm:px-4 min-w-0">
          <p className="text-xs sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 justify-center uppercase tracking-wider font-medium whitespace-nowrap">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-success/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-success" />
            </span>
            In Profit
          </p>
          <p className="text-lg sm:text-lg md:text-xl font-bold tabular-nums text-foreground truncate w-full text-center">
            {summary.holdingsInProfitCount}/{summary.totalHoldings}
          </p>
          <p className="text-xs sm:text-xs text-muted-foreground mt-0.5">
            ({summary.holdingsInProfitPercent.toFixed(0)}%)
          </p>
        </div>

        {/* Health Score */}
        <div className="flex flex-col items-center justify-start px-2 sm:px-4 min-w-0">
          <p className="text-xs sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1 justify-center uppercase tracking-wider font-medium whitespace-nowrap">
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <HeartPulse className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
            </span>
            Health
          </p>
          <p className={cn("text-lg sm:text-lg md:text-xl font-bold tabular-nums", getHealthColor(healthScore))}>
            {healthScore}
          </p>
          <p className={cn("text-xs sm:text-xs mt-0.5", getHealthColor(healthScore))}>
            {getHealthDescription(healthScore)}
          </p>
        </div>
      </div>
    </div>
  );
}
