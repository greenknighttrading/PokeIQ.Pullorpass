import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface PricePoint {
  p: number;
  t: number;
}

interface Props {
  priceHistory: PricePoint[];
}

export default function PriceMovementTable({ priceHistory }: Props) {
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];

    const sorted = [...priceHistory].sort((a, b) => b.t - a.t); // newest first
    const cutoff = Date.now() / 1000 - 30 * 86400;
    const recent = sorted.filter(p => p.t >= cutoff);

    // Group by date, take the last price per day
    const byDate = new Map<string, { price: number; t: number }>();
    for (const pt of [...recent].reverse()) {
      const d = new Date(pt.t * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      byDate.set(key, { price: pt.p, t: pt.t });
    }

    const entries = Array.from(byDate.entries())
      .sort((a, b) => b[1].t - a[1].t); // newest first

    return entries.map(([dateKey, { price }], idx) => {
      const prevEntry = entries[idx + 1];
      const prevPrice = prevEntry ? prevEntry[1].price : null;
      const change = prevPrice != null && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : null;
      const d = new Date(dateKey + 'T00:00:00');
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price,
        change,
      };
    });
  }, [priceHistory]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-card/60 transition-colors rounded-xl"
      >
        <span className="text-sm font-bold text-foreground">30-Day Price Movement</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="space-y-0">
            {/* Header */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-20">Date</span>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-right w-20">Price</span>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-right w-20">Change</span>
            </div>
            {rows.map(({ date, price, change }) => (
              <div key={date} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                <span className="text-sm text-muted-foreground w-20">{date}</span>
                <span className="text-sm font-semibold text-foreground tabular-nums text-right w-20">${price.toFixed(2)}</span>
                <span className={cn(
                  'text-sm font-semibold tabular-nums text-right w-20',
                  change == null ? 'text-muted-foreground' : change >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {change != null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
