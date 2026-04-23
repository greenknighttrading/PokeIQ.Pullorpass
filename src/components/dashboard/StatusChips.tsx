import React from 'react';
import { AlertTriangle, TrendingUp, Scale, Droplets, CheckCircle } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatusChip {
  id: string;
  label: string;
  type: 'warning' | 'success' | 'primary';
  icon: React.ElementType;
  tooltip: string;
}

export function StatusChips() {
  const { concentration, milestones, allocation, allocationTarget, items } = usePortfolio();

  if (!concentration || !allocation) return null;

  const chips: StatusChip[] = [];

  // Overweight allocation
  const allocationDiffs = [
    { name: 'Sealed', diff: allocation.sealed.percent - allocationTarget.sealed },
    { name: 'Slabs', diff: allocation.slabs.percent - allocationTarget.slabs },
    { name: 'Raw Cards', diff: allocation.rawCards.percent - allocationTarget.rawCards },
  ];

  const overweightCategory = allocationDiffs.find(d => d.diff > 15);
  if (overweightCategory) {
    chips.push({
      id: 'overweight',
      label: `Overweight ${overweightCategory.name}`,
      type: 'warning',
      icon: Scale,
      tooltip: `Your ${overweightCategory.name.toLowerCase()} allocation is ${Math.round(overweightCategory.diff)}% above your target. Consider redirecting new capital elsewhere.`,
    });
  }

  // High concentration
  if (concentration.top1Percent > 20) {
    chips.push({
      id: 'concentration',
      label: 'High Concentration',
      type: 'warning',
      icon: AlertTriangle,
      tooltip: `Your top position (${concentration.top1Name}) represents ${concentration.top1Percent.toFixed(1)}% of your portfolio. Consider whether this aligns with your risk tolerance.`,
    });
  }

  // Profit milestones
  if (milestones.length > 0) {
    const milestone500 = milestones.filter(m => m.milestone === 500).length;
    const milestone300 = milestones.filter(m => m.milestone === 300).length;
    const milestone200 = milestones.filter(m => m.milestone === 200).length;

    if (milestone500 > 0) {
      chips.push({
        id: 'milestone-500',
        label: `${milestone500} at 500%+`,
        type: 'success',
        icon: TrendingUp,
        tooltip: `${milestone500} holding${milestone500 > 1 ? 's have' : ' has'} exceeded 500% gains — historically an excellent point to consider locking in profits.`,
      });
    } else if (milestone300 > 0) {
      chips.push({
        id: 'milestone-300',
        label: `${milestone300} at 300%+`,
        type: 'success',
        icon: TrendingUp,
        tooltip: `${milestone300} holding${milestone300 > 1 ? 's have' : ' has'} exceeded 300% gains — consider reviewing your position.`,
      });
    } else if (milestone200 > 0) {
      chips.push({
        id: 'milestone-200',
        label: `${milestone200} at 200%+`,
        type: 'primary',
        icon: TrendingUp,
        tooltip: `${milestone200} holding${milestone200 > 1 ? 's have' : ' has'} reached 200% gains milestone.`,
      });
    }
  }

  // Low liquidity warning
  const lowLiquidityItems = items.filter(item => item.liquidityTier === 'Low');
  const lowLiquidityValue = lowLiquidityItems.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const totalValue = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
  const lowLiquidityPercent = totalValue > 0 ? (lowLiquidityValue / totalValue) * 100 : 0;

  if (lowLiquidityPercent > 30) {
    chips.push({
      id: 'low-liquidity',
      label: 'Low Liquidity',
      type: 'warning',
      icon: Droplets,
      tooltip: `${lowLiquidityPercent.toFixed(0)}% of your portfolio is in low-liquidity assets. These may take longer to sell at fair value.`,
    });
  }

  // All clear
  if (chips.length === 0) {
    chips.push({
      id: 'healthy',
      label: 'Portfolio Healthy',
      type: 'success',
      icon: CheckCircle,
      tooltip: 'No significant risks or opportunities detected. Your portfolio is well-balanced.',
    });
  }

  return (
    <div className="flex flex-wrap gap-2 animate-fade-in stagger-3" style={{ opacity: 0 }}>
      {chips.map((chip) => (
        <Tooltip key={chip.id}>
          <TooltipTrigger asChild>
            <button
              className={cn(
                chip.type === 'warning' && 'status-chip-warning',
                chip.type === 'success' && 'status-chip-success',
                chip.type === 'primary' && 'status-chip-primary',
                'cursor-help'
              )}
            >
              <chip.icon className="w-4 h-4" />
              <span>{chip.label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-sm">
            {chip.tooltip}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
