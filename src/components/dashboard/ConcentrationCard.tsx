import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';

export function ConcentrationCard() {
  const { concentration } = usePortfolio();

  if (!concentration) return null;

  const metrics = [
    { 
      label: 'Top Holding', 
      percent: concentration.top3Percent > 0 ? (concentration.top3Percent / Math.min(3, concentration.top3Names.length)) : 0, 
      threshold: 20,
      detail: concentration.top3Names[0] || 'N/A',
    },
    { 
      label: 'Top 3 Holdings', 
      percent: concentration.top3Percent, 
      threshold: 40,
      detail: concentration.top3Names.slice(0, 3).join(', '),
    },
    { 
      label: 'Top Set/Product', 
      percent: concentration.topSetPercent, 
      threshold: 30,
      detail: concentration.topSetName,
    },
  ];

  return (
    <div className="glass-card p-4 sm:p-6 animate-fade-in stagger-4" style={{ opacity: 0 }}>
      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6">Concentration Risk</h2>

      <div className="space-y-4">
        {metrics.map((metric) => {
          const isElevated = metric.percent > metric.threshold;
          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className={cn(
                  "font-medium tabular-nums",
                  isElevated ? "text-warning" : "text-foreground"
                )}>
                  {metric.percent.toFixed(1)}%
                </span>
              </div>
              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                    isElevated ? "bg-warning" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(metric.percent, 100)}%` }}
                />
                {/* Threshold marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-muted-foreground/50"
                  style={{ left: `${metric.threshold}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1" title={metric.detail}>
                {metric.detail}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
        Thresholds shown as markers. Exceeding doesn't mean action is required.
      </p>
    </div>
  );
}
