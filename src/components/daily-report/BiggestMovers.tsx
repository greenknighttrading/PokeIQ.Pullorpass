import React from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Flame } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtDollar(n: number) {
  return `${n >= 0 ? '+' : '-'}$${fmt(Math.abs(n))}`;
}

export function BiggestMovers() {
  const { items } = usePortfolio();

  const sorted = [...items].sort((a, b) => Math.abs(b.profitDollars) - Math.abs(a.profitDollars));
  const top = sorted.slice(0, 5);

  return (
    <div className="rounded-xl border border-border/30 bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <Flame className="w-4 h-4 text-warning" />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Biggest Movers <span className="normal-case">(Owned)</span></p>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      ) : (
        <div className="space-y-2.5">
          {top.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {item.profitDollars >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-success shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <span className="text-sm text-foreground truncate">{item.productName}</span>
              </div>
              <span className={cn('text-sm font-bold tabular-nums shrink-0', item.profitDollars >= 0 ? 'text-success' : 'text-destructive')}>
                {fmtDollar(item.profitDollars)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
