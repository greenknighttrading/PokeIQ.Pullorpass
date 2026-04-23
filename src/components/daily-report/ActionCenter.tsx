import React from 'react';
import { Link } from 'react-router-dom';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Lock,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingCart,
  ChevronRight,
  Zap,
} from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

interface ActionRow {
  weight: number;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  detail: string;
  cta: string;
  href: string;
}

export function ActionCenter() {
  const { concentration, milestones, items } = usePortfolio();

  const actions: ActionRow[] = [];

  // 1. Profit Lock Signal (weight 5)
  const profitLockItems = milestones.filter(
    (m) => m.item.gainPercent > 300 && m.sellHalfProfit > 250 && m.item.quantity > 1
  );
  for (const m of profitLockItems) {
    const keep = Math.ceil(m.item.quantity / 2);
    const sell = m.item.quantity - keep;
    actions.push({
      weight: 5,
      icon: <Lock className="w-4 h-4 text-success" />,
      iconBg: 'bg-success/10',
      title: 'Lock Profit',
      detail: `${m.item.productName}: Lock in $${fmt(m.sellHalfProfit)} profit (sell ${sell} / keep ${keep})`,
      cta: 'View Position',
      href: '/winners',
    });
  }

  // 2. Over-Concentration Risk (weight 4)
  if (concentration && concentration.top1Percent > 25) {
    actions.push({
      weight: 4,
      icon: <AlertTriangle className="w-4 h-4 text-warning" />,
      iconBg: 'bg-warning/10',
      title: 'Over-Concentration',
      detail: `${concentration.top1Name} now ${concentration.top1Percent.toFixed(0)}% of portfolio`,
      cta: 'View Position',
      href: '/rebalance',
    });
  }

  // 3. Weak Trend Warning (weight 3)
  const weakItems = items
    .filter((i) => i.gainPercent < -10)
    .sort((a, b) => a.gainPercent - b.gainPercent);
  if (weakItems.length > 0) {
    const worst = weakItems[0];
    actions.push({
      weight: 3,
      icon: <ArrowDownRight className="w-4 h-4 text-destructive" />,
      iconBg: 'bg-destructive/10',
      title: 'Weak Trend',
      detail: `${worst.productName} ${worst.gainPercent.toFixed(1)}% — Threat Trend`,
      cta: 'View Position',
      href: '/winners',
    });
  }

  // 4. Buy Opportunity (weight 2)
  actions.push({
    weight: 2,
    icon: <ShoppingCart className="w-4 h-4 text-primary" />,
    iconBg: 'bg-primary/10',
    title: 'Buy Opportunity',
    detail: 'Check your watchlist for items entering buy zones',
    cta: 'View Position',
    href: '/buylist/watchlist',
  });

  // 5. New High (weight 1)
  const highItems = items.filter((i) => i.gainPercent > 50);
  if (highItems.length > 0) {
    actions.push({
      weight: 1,
      icon: <ArrowUpRight className="w-4 h-4 text-success" />,
      iconBg: 'bg-success/10',
      title: 'New High',
      detail: `${highItems.length} holding${highItems.length > 1 ? 's' : ''} at 90D highs`,
      cta: 'View Position',
      href: '/winners',
    });
  }

  const sortedActions = [...actions].sort((a, b) => b.weight - a.weight).slice(0, 5);

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-5 sm:p-6">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
        <Zap className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Action Center</h2>
        <span className="text-xs text-muted-foreground ml-1">— Personalized portfolio alerts, ranked by priority</span>
      </div>

      <div className="space-y-0">
        {sortedActions.map((action, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="border-t border-border" />}
            <Link to={action.href} className="flex items-center justify-between py-3.5 gap-3 group">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', action.iconBg)}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{action.detail}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 sm:hidden group-hover:text-foreground transition-colors" />
              <Button size="sm" className="text-xs h-8 gap-1 font-medium bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:inline-flex shrink-0">
                {action.cta} <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
