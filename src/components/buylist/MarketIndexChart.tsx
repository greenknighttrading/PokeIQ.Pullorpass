import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndexRow {
  date: string;
  total_market_value: number;
  sp500_close: number | null;
}

interface ChartPoint {
  date: string;
  label: string;
  pokemon: number;
  sp500: number | null;
  pokemonNorm: number;
  sp500Norm: number | null;
}

export default function MarketIndexChart() {
  const [data, setData] = useState<IndexRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('market_index')
      .select('date, total_market_value, sp500_close')
      .order('date', { ascending: true })
      .then(({ data: rows }) => {
        setData((rows ?? []) as IndexRow[]);
        setLoading(false);
      });
  }, []);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    const firstPoke = data[0].total_market_value || 1;
    const firstSp = data[0].sp500_close || 1;

    return data.map(r => ({
      date: r.date,
      label: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      pokemon: r.total_market_value,
      sp500: r.sp500_close,
      pokemonNorm: ((r.total_market_value / firstPoke) - 1) * 100,
      sp500Norm: r.sp500_close ? ((r.sp500_close / firstSp) - 1) * 100 : null,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center gap-2 h-64">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading market index…</span>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="glass-card rounded-xl p-6 text-center space-y-2">
        <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto" />
        <p className="text-sm font-semibold">Market Index Coming Soon</p>
        <p className="text-xs text-muted-foreground">
          We're collecting daily market data. Check back in a few days to see the Pokémon TCG market vs S&P 500 chart.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-foreground">Pokémon TCG Market vs S&P 500</p>
          <p className="text-[10px] text-muted-foreground">Normalized % change from first data point</p>
        </div>
      </div>

      <div className="h-64 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload as ChartPoint;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg space-y-1">
                    <p className="text-xs text-muted-foreground">{d.date}</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs font-semibold">Pokémon: {d.pokemonNorm > 0 ? '+' : ''}{d.pokemonNorm.toFixed(2)}%</span>
                    </div>
                    {d.sp500Norm != null && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-xs font-semibold">S&P 500: {d.sp500Norm > 0 ? '+' : ''}{d.sp500Norm.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="pokemonNorm"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Pokémon TCG"
            />
            <Line
              type="monotone"
              dataKey="sp500Norm"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="S&P 500 (SPY)"
              connectNulls
            />
            <Legend
              content={() => (
                <div className="flex items-center justify-center gap-6 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-primary rounded" />
                    <span className="text-[10px] text-muted-foreground">Pokémon TCG Market</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-warning rounded border-dashed" style={{ borderTop: '1.5px dashed hsl(var(--warning))' }} />
                    <span className="text-[10px] text-muted-foreground">S&P 500 (SPY)</span>
                  </div>
                </div>
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
