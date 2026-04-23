import React, { useMemo, useEffect, useState } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { Card } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Snapshot {
  snapshot_date: string;
  total_market_value: number;
  total_cost_basis: number;
}

export function PortfolioValueChart() {
  const { items, summary, priceMatchDetails } = usePortfolio();
  const [dbSnapshots, setDbSnapshots] = useState<Snapshot[]>([]);

  // Fetch historical snapshots; seed today's with live prices if edge function hasn't run
  useEffect(() => {
    if (!items.length || !summary) return;

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;
      const today = new Date().toISOString().split('T')[0];

      // Fetch all snapshots
      const { data } = await supabase
        .from('portfolio_value_snapshots')
        .select('snapshot_date, total_market_value, total_cost_basis')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: true });

      const snapshots = (data ?? []) as Snapshot[];

      // Always recalculate today's value with latest market prices
      // Build tcgplayer_id map from priceMatchDetails
      const itemTcgMap = new Map<string, string>();
      const allTcgIds: string[] = [];
      if (priceMatchDetails) {
        for (const detail of priceMatchDetails) {
          if (detail.tcgplayerId && detail.confidence !== 'none') {
            itemTcgMap.set(detail.id, detail.tcgplayerId);
            allTcgIds.push(detail.tcgplayerId);
          }
        }
      }

      // Fetch live prices for matched items — use the latest snapshot date
      const priceMap = new Map<string, number>();
      const uniqueTcgIds = [...new Set(allTcgIds)];
      if (uniqueTcgIds.length > 0) {
        // Get the latest snapshot date first
        const { data: latestRow } = await supabase
          .from('market_snapshots')
          .select('snapshot_date')
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single();
        const latestDate = latestRow?.snapshot_date || today;

        for (let i = 0; i < uniqueTcgIds.length; i += 50) {
          const chunk = uniqueTcgIds.slice(i, i + 50);
          const { data: pData } = await supabase
            .from('market_snapshots')
            .select('tcgplayer_id, price')
            .in('tcgplayer_id', chunk)
            .eq('snapshot_date', latestDate)
            .not('price', 'is', null);
          for (const p of pData ?? []) {
            if (p.tcgplayer_id && p.price) priceMap.set(p.tcgplayer_id, Number(p.price));
          }
        }
      }

      // Calculate total with live prices for matched, stored for unmatched
      let totalMarketValue = 0;
      for (const item of items as any[]) {
        const qty = item.quantity || 1;
        const tcgId = itemTcgMap.get(item.id);
        const livePrice = tcgId ? priceMap.get(tcgId) ?? null : null;
        totalMarketValue += (livePrice ?? item.marketPrice ?? 0) * qty;
      }

      const valueToStore = Math.round(totalMarketValue);

      await supabase
        .from('portfolio_value_snapshots')
        .upsert({
          user_id: userId,
          snapshot_date: today,
          total_market_value: valueToStore,
          total_cost_basis: Math.round(summary.totalCostBasis),
          item_count: items.length,
        }, { onConflict: 'user_id,snapshot_date' });

      // Update or add today's entry in the snapshots array
      const todayIdx = snapshots.findIndex(s => s.snapshot_date === today);
      const todayEntry = { snapshot_date: today, total_market_value: valueToStore, total_cost_basis: Math.round(summary.totalCostBasis) };
      if (todayIdx >= 0) {
        snapshots[todayIdx] = todayEntry;
      } else {
        snapshots.push(todayEntry);
      }

      if (snapshots.length > 0) {
        setDbSnapshots(snapshots);
      }
    };

    run();
  }, [items.length, summary?.totalMarketValue, priceMatchDetails]);

  // Build chart data: prefer DB snapshots, fall back to purchase-date based
  const chartData = useMemo(() => {
    // If we have DB snapshots, use them
    if (dbSnapshots.length >= 2) {
      return dbSnapshots.map(s => ({
        month: s.snapshot_date,
        label: format(parseISO(s.snapshot_date), 'MMM d'),
        value: Math.round(s.total_market_value),
        cost: Math.round(s.total_cost_basis),
      }));
    }

    // Fallback: build from purchase dates (existing logic)
    if (!items.length) return [];

    const events: { date: Date; value: number; cost: number }[] = [];
    const withDates = items.filter(i => i.dateAdded);
    const withoutDates = items.filter(i => !i.dateAdded);

    withDates.forEach(item => {
      events.push({
        date: item.dateAdded!,
        value: item.totalMarketValue,
        cost: item.totalCostBasis,
      });
    });

    if (withoutDates.length > 0 && withDates.length === 0) {
      const now = new Date();
      const monthsBack = 12;
      withoutDates.forEach((item, i) => {
        const monthOffset = Math.floor((i / withoutDates.length) * monthsBack);
        const date = new Date(now.getFullYear(), now.getMonth() - monthsBack + monthOffset, 1);
        events.push({ date, value: item.totalMarketValue, cost: item.totalCostBasis });
      });
    } else if (withoutDates.length > 0) {
      const earliest = withDates.reduce((min, i) => (i.dateAdded! < min ? i.dateAdded! : min), withDates[0].dateAdded!);
      withoutDates.forEach(item => {
        events.push({ date: earliest, value: item.totalMarketValue, cost: item.totalCostBasis });
      });
    }

    if (events.length === 0) return [];
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    const dayMap = new Map<string, { value: number; cost: number }>();
    let cumValue = 0;
    let cumCost = 0;

    events.forEach(e => {
      const key = format(e.date, 'yyyy-MM-dd');
      cumValue += e.value;
      cumCost += e.cost;
      dayMap.set(key, { value: cumValue, cost: cumCost });
    });

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    if (!dayMap.has(todayKey)) {
      const totalValue = summary?.totalMarketValue ?? cumValue;
      const totalCost = summary?.totalCostBasis ?? cumCost;
      dayMap.set(todayKey, { value: totalValue, cost: totalCost });
    }

    const allKeys = Array.from(dayMap.keys()).sort();
    const result: { month: string; label: string; value: number; cost: number }[] = [];

    if (allKeys.length >= 2) {
      const start = parseISO(allKeys[0]);
      const end = parseISO(allKeys[allKeys.length - 1]);
      let lastValue = 0;
      let lastCost = 0;

      const cursor = new Date(start);
      while (cursor <= end) {
        const key = format(cursor, 'yyyy-MM-dd');
        if (dayMap.has(key)) {
          lastValue = dayMap.get(key)!.value;
          lastCost = dayMap.get(key)!.cost;
        }
        result.push({
          month: key,
          label: format(cursor, 'MMM d'),
          value: Math.round(lastValue),
          cost: Math.round(lastCost),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      allKeys.forEach(key => {
        result.push({
          month: key,
          label: format(parseISO(key), 'MMM d'),
          value: Math.round(dayMap.get(key)!.value),
          cost: Math.round(dayMap.get(key)!.cost),
        });
      });
    }

    return result;
  }, [items, summary, dbSnapshots]);

  if (chartData.length < 2) return null;

  const firstValue = chartData[0]?.value ?? 0;
  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const growthPct = firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100).toFixed(1) : '0';
  const isPositive = lastValue >= firstValue;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Collection Value Over Time</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        }`}>
          {isPositive ? '+' : ''}{growthPct}%
        </span>
      </div>

      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.15} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-popover border border-border rounded-lg p-2 shadow-lg text-xs">
                    <p className="font-medium text-foreground mb-1">{label}</p>
                    <p className="text-primary">Value: ${payload[0]?.value?.toLocaleString()}</p>
                    <p className="text-muted-foreground">Cost: ${payload[1]?.value?.toLocaleString()}</p>
                  </div>
                );
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              fill="url(#valueGrad)" 
            />
            <Area 
              type="monotone" 
              dataKey="cost" 
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1}
              strokeDasharray="4 4"
              fill="url(#costGrad)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-primary rounded" />
          <span>Market Value</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t border-dashed border-muted-foreground" />
          <span>Cost Basis</span>
        </div>
      </div>
    </Card>
  );
}
