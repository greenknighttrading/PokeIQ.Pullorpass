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

export default function HistoricalExtremes({ priceHistory }: Props) {
  const [open, setOpen] = useState(true);

  const extremes = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return null;

    const sorted = [...priceHistory].sort((a, b) => a.t - b.t);
    const prices = sorted.map(p => p.p);
    const allTimeLow = Math.min(...prices);
    const allTimeHigh = Math.max(...prices);
    const lowPoint = sorted.find(p => p.p === allTimeLow)!;
    const highPoint = sorted.find(p => p.p === allTimeHigh)!;

    // 1-year range (or all data if less than 1 year)
    const oneYearAgo = Date.now() / 1000 - 365 * 86400;
    const yearPoints = sorted.filter(p => p.t >= oneYearAgo);
    const yearPrices = yearPoints.length > 0 ? yearPoints.map(p => p.p) : prices;
    const yearLow = Math.min(...yearPrices);
    const yearHigh = Math.max(...yearPrices);

    return {
      yearLow,
      yearHigh,
      yearRange: yearHigh - yearLow,
      allTimeLow,
      allTimeLowDate: new Date(lowPoint.t * 1000),
      allTimeHigh,
      allTimeHighDate: new Date(highPoint.t * 1000),
      totalRange: allTimeHigh - allTimeLow,
    };
  }, [priceHistory]);

  if (!extremes) return null;

  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="rounded-xl border border-border/50 bg-card/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-card/60 transition-colors rounded-xl"
      >
        <span className="text-sm font-bold text-foreground">Historical Extremes</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5">
          {/* 1-Year Range */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-3">1-Year Range</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Low</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${extremes.yearLow.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${extremes.yearHigh.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Range</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${extremes.yearRange.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* All-Time Record */}
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-3">All-Time Record</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">All-Time Low</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">${extremes.allTimeLow.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{formatDate(extremes.allTimeLowDate)}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">All-Time High</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">${extremes.allTimeHigh.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{formatDate(extremes.allTimeHighDate)}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Range</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${extremes.totalRange.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
