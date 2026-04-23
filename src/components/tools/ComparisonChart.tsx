import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface PricePoint {
  date: string;
  sealedPct: number | null;
  cardsPct: number | null;
}

interface ComparisonChartProps {
  data: PricePoint[];
  isLoading?: boolean;
}

export function ComparisonChart({ data, isLoading }: ComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];
    return data.map(d => ({
      ...d,
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Price Performance (180 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[360px] flex items-center justify-center">
            <div className="animate-pulse text-sm text-muted-foreground">Loading price history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Price Performance (180 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            Select a set to view price comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Price Performance (180 Days)</CardTitle>
        <p className="text-xs text-muted-foreground">Normalized % change from earliest data point</p>
      </CardHeader>
      <CardContent className="pl-0 pr-2">
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="sealedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(168 50% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(168 50% 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cardsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(45 80% 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(45 80% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(215 15% 55%)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(220 18% 12%)',
                border: '1px solid hsl(220 15% 25%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                `${value > 0 ? '+' : ''}${value.toFixed(1)}%`,
                name === 'sealedPct' ? 'Sealed Products' : 'Top Cards',
              ]}
            />
            <Legend
              formatter={(value) => (value === 'sealedPct' ? 'Sealed Products' : 'Top 10 Cards')}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="sealedPct"
              stroke="hsl(168 50% 45%)"
              strokeWidth={2}
              fill="url(#sealedGrad)"
              connectNulls
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="cardsPct"
              stroke="hsl(45 80% 55%)"
              strokeWidth={2}
              fill="url(#cardsGrad)"
              connectNulls
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
