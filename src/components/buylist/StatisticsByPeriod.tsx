import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PricePoint {
  p: number;
  t: number;
}

interface VariantData {
  price: number | null;
  priceChange24hr: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  priceChange90d?: number | null;
  trendSlope7d: number | null;
  trendSlope30d: number | null;
  trendSlope90d?: number | null;
  minPrice7d: number | null;
  maxPrice7d: number | null;
  minPrice30d: number | null;
  maxPrice30d: number | null;
  minPrice90d?: number | null;
  maxPrice90d?: number | null;
  avgPrice: number | null;
  avgPrice30d: number | null;
  avgPrice90d?: number | null;
  priceChangesCount7d: number | null;
  priceChangesCount30d: number | null;
  priceChangesCount90d?: number | null;
  priceRelativeTo30dRange: number | null;
  priceRelativeTo90dRange?: number | null;
  priceHistory?: PricePoint[];
}

interface Props {
  variant: VariantData;
}

type Period = '24h' | '7d' | '30d' | '90d';

function getTrendLabel(slope: number | null) {
  if (slope == null) return '—';
  if (slope < -1.0) return '📉 Strong ↓';
  if (slope < -0.3) return '📉 Slight ↓';
  if (slope <= 0.3) return '— Flat';
  if (slope <= 1.0) return '📈 Slight ↑';
  return '📈 Strong ↑';
}

function computePeriodStats(history: PricePoint[], days: number) {
  const now = Date.now() / 1000;
  const cutoff = now - days * 86400;
  const points = history.filter(p => p.t >= cutoff);
  if (points.length === 0) return null;

  const prices = points.map(p => p.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const first = points[0].p;
  const last = points[points.length - 1].p;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumX2 += i * i;
  }
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
  const position = max > min ? ((last - min) / (max - min)) * 100 : 50;

  return { min, max, avg, change, slope, position, updates: points.length };
}

export default function StatisticsByPeriod({ variant }: Props) {
  const [period, setPeriod] = useState<Period>('30d');
  const periods: Period[] = ['24h', '7d', '30d', '90d'];

  const history = useMemo(() => {
    const raw = (variant as unknown as Record<string, unknown>).priceHistory as PricePoint[] | undefined;
    if (!raw || !Array.isArray(raw)) return [];
    return [...raw].sort((a, b) => a.t - b.t);
  }, [variant]);

  const stats = useMemo(() => {
    if (period === '7d') {
      return {
        change: variant.priceChange7d,
        slope: variant.trendSlope7d,
        updates: variant.priceChangesCount7d,
        min: variant.minPrice7d,
        max: variant.maxPrice7d,
        avg: variant.avgPrice,
        position: variant.minPrice7d != null && variant.maxPrice7d != null && variant.price != null
          ? ((variant.price - variant.minPrice7d) / (variant.maxPrice7d - variant.minPrice7d)) * 100
          : null,
      };
    }
    if (period === '30d') {
      return {
        change: variant.priceChange30d,
        slope: variant.trendSlope30d,
        updates: variant.priceChangesCount30d,
        min: variant.minPrice30d,
        max: variant.maxPrice30d,
        avg: variant.avgPrice30d,
        position: variant.priceRelativeTo30dRange != null ? variant.priceRelativeTo30dRange * 100 : null,
      };
    }
    if (period === '90d') {
      // Use API-provided 90d stats when available
      const v = variant as unknown as Record<string, unknown>;
      const has90d = v.priceChange90d != null || v.minPrice90d != null;
      if (has90d) {
        const min90 = (v.minPrice90d as number | null) ?? null;
        const max90 = (v.maxPrice90d as number | null) ?? null;
        let pos: number | null = null;
        if (v.priceRelativeTo90dRange != null) {
          pos = (v.priceRelativeTo90dRange as number) * 100;
        } else if (min90 != null && max90 != null && variant.price != null && max90 > min90) {
          pos = ((variant.price - min90) / (max90 - min90)) * 100;
        }
        return {
          change: (v.priceChange90d as number | null) ?? null,
          slope: (v.trendSlope90d as number | null) ?? null,
          updates: (v.priceChangesCount90d as number | null) ?? null,
          min: min90,
          max: max90,
          avg: (v.avgPrice90d as number | null) ?? null,
          position: pos,
        };
      }
      // Fallback to computed from history
      const computed = computePeriodStats(history, 90);
      if (!computed) return null;
      return { change: computed.change, slope: computed.slope, updates: computed.updates, min: computed.min, max: computed.max, avg: computed.avg, position: computed.position };
    }

    // 24h — always computed from history
    const computed = computePeriodStats(history, 1);
    if (!computed) return null;
    return { change: computed.change, slope: computed.slope, updates: computed.updates, min: computed.min, max: computed.max, avg: computed.avg, position: computed.position };
  }, [period, variant, history]);

  const rangePct = stats?.position != null ? Math.max(0, Math.min(100, stats.position)) : 50;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-4">
      <p className="text-sm font-bold text-foreground mb-4">Statistics by Period</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              period === p
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            {p === '24h' ? '24h' : p === '7d' ? '7 Day' : p === '30d' ? '30 Day' : '90 Day'}
          </button>
        ))}
      </div>

      {!stats ? (
        <p className="text-sm text-muted-foreground">No data available for this period.</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price Change</span>
              <span className={cn('text-sm font-bold tabular-nums', stats.change != null && stats.change >= 0 ? 'text-success' : 'text-destructive')}>
                {stats.change != null ? `${stats.change >= 0 ? '📈' : '📉'} ${stats.change >= 0 ? '+' : ''}${stats.change.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Trend</span>
              <span className={cn('text-sm font-bold', stats.slope != null && stats.slope >= 0 ? 'text-success' : 'text-destructive')}>
                {getTrendLabel(stats.slope ?? null)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Market Activity</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {stats.updates != null ? `${stats.updates} updates` : '—'}
              </span>
            </div>
          </div>

          {stats.min != null && stats.max != null && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Price Range</p>
              <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, hsl(var(--success)), hsl(var(--warning)), hsl(var(--destructive)))' }}>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background transition-all duration-500"
                  style={{
                    left: `calc(${rangePct}% - 8px)`,
                    boxShadow: '0 0 10px hsl(var(--foreground) / 0.4)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground tabular-nums">
                <span>${stats.min.toFixed(2)}</span>
                <span>${stats.max.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {stats.min != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Min</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${stats.min.toFixed(2)}</span>
              </div>
            )}
            {stats.avg != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${stats.avg.toFixed(2)}</span>
              </div>
            )}
            {stats.max != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Max</span>
                <span className="text-sm font-bold text-foreground tabular-nums">${stats.max.toFixed(2)}</span>
              </div>
            )}
            {stats.position != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Position</span>
                <span className="text-sm font-bold text-foreground tabular-nums">{stats.position.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
