import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';

interface SetValueChartProps {
  setName: string;
}

interface DailyPoint {
  date: string;
  value: number;
  cards: number;
}

export function SetValueChart({ setName }: SetValueChartProps) {
  const [data, setData] = useState<DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data: rows } = await supabase
        .from('set_value_daily')
        .select('snapshot_date, total_value, cards_count')
        .eq('set_name', setName)
        .order('snapshot_date', { ascending: true })
        .limit(90);

      if (rows && rows.length > 0) {
        setData(rows.map((r: any) => ({
          date: r.snapshot_date,
          value: Number(r.total_value),
          cards: r.cards_count,
        })));
      }
      setLoading(false);
    }
    fetch();
  }, [setName]);

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  const pctChange = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].value;
    const last = data[data.length - 1].value;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Set Value Over Time</span>
        </div>
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (chartData.length < 2) {
    return (
      <div className="rounded-xl border border-border/30 bg-card/40 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Set Value Over Time</span>
        </div>
        <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">
          Not enough historical data yet — chart will appear as daily snapshots accumulate.
        </div>
      </div>
    );
  }

  const isPositive = (pctChange ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-border/30 bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Set Value Over Time</span>
          <span className="text-[10px] text-muted-foreground">({chartData.length} days)</span>
        </div>
        {pctChange !== null && (
          <span className={`text-xs font-bold tabular-nums ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{pctChange.toFixed(1)}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="setValueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? 'hsl(142 50% 45%)' : 'hsl(0 70% 55%)'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isPositive ? 'hsl(142 50% 45%)' : 'hsl(0 70% 55%)'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={45}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(220 18% 12%)',
              border: '1px solid hsl(220 15% 25%)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Set Value']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? 'hsl(142 50% 45%)' : 'hsl(0 70% 55%)'}
            strokeWidth={2}
            fill="url(#setValueGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
