import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

interface PricePoint {
  p: number;
  t: number;
}

interface Props {
  priceHistory: PricePoint[];
}

type Range = '30d' | '90d' | '180d';

const RANGE_LABELS: Record<Range, string> = {
  '30d': '30 Day',
  '90d': '90 Day',
  '180d': 'Max',
};

const RANGE_DAYS: Record<Range, number> = {
  '30d': 30,
  '90d': 90,
  '180d': 180,
};

function formatDate(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PriceHistoryChart({ priceHistory }: Props) {
  const [range, setRange] = useState<Range>('30d');

  const sorted = useMemo(() => {
    if (!priceHistory?.length) return [];
    return [...priceHistory].sort((a, b) => a.t - b.t);
  }, [priceHistory]);

  const filtered = useMemo(() => {
    if (!sorted.length) return [];
    const now = Date.now() / 1000;
    const cutoff = now - RANGE_DAYS[range] * 86400;
    return sorted.filter(p => p.t >= cutoff);
  }, [sorted, range]);

  const { minPrice, maxPrice, change } = useMemo(() => {
    if (!filtered.length) return { minPrice: 0, maxPrice: 0, change: 0 };
    const prices = filtered.map(p => p.p);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const first = filtered[0].p;
    const last = filtered[filtered.length - 1].p;
    const ch = first > 0 ? ((last - first) / first) * 100 : 0;
    return { minPrice: min, maxPrice: max, change: ch };
  }, [filtered]);

  if (!sorted.length) return null;

  const chartData = filtered.map(p => ({
    date: p.t,
    price: p.p,
  }));

  const isPositive = change >= 0;
  const strokeColor = 'hsl(var(--success))';
  const gradientId = 'priceGradient';

  // Y-axis padding
  const yPad = (maxPrice - minPrice) * 0.1 || 1;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-foreground">Price History</p>
        <div className="flex gap-1">
          {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                range === r
                  ? 'bg-primary/15 text-primary border border-primary/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={cn(
          'text-sm font-bold tabular-nums',
          isPositive ? 'text-success' : 'text-destructive'
        )}>
          {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{change.toFixed(2)}%
        </span>
        <span className="text-xs text-muted-foreground">
          over {RANGE_LABELS[range].toLowerCase()}
        </span>
      </div>

      <div className="h-48 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border) / 0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={[minPrice - yPad, maxPrice + yPad]}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
                    <p className="text-xs text-muted-foreground">{formatDateFull(d.date)}</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">${d.price.toFixed(2)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
