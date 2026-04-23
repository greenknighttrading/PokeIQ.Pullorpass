import React, { useState, useEffect } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function fmtDollar(n: number) {
  return `${n >= 0 ? '+' : '-'}$${fmt(Math.abs(n))}`;
}

export function PortfolioToday() {
  const { summary, items } = usePortfolio();
  const [plPeriod, setPlPeriod] = useState<'1D' | '7D'>('7D');

  // Market pulse counts
  const [pulse, setPulse] = useState({ up: 0, neutral: 0, down: 0 });
  useEffect(() => {
    (async () => {
      const { data: latestRow } = await supabase.from('market_snapshots')
        .select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1).single();
      const d = latestRow?.snapshot_date;

      const qUp = supabase.from('market_snapshots').select('id', { count: 'exact', head: true })
        .not('price', 'is', null).gt('price', 0).eq('product_type', 'card')
        .not('price_change_7d', 'is', null).gt('price_change_7d', 0);
      const qDown = supabase.from('market_snapshots').select('id', { count: 'exact', head: true })
        .not('price', 'is', null).gt('price', 0).eq('product_type', 'card')
        .not('price_change_7d', 'is', null).lt('price_change_7d', 0);
      const qTotal = supabase.from('market_snapshots').select('id', { count: 'exact', head: true })
        .not('price', 'is', null).gt('price', 0).eq('product_type', 'card')
        .not('price_change_7d', 'is', null);

      if (d) {
        qUp.eq('snapshot_date', d);
        qDown.eq('snapshot_date', d);
        qTotal.eq('snapshot_date', d);
      }

      const [upRes, downRes, totalRes] = await Promise.all([qUp, qDown, qTotal]);
      const up = upRes.count ?? 0;
      const down = downRes.count ?? 0;
      const total = totalRes.count ?? 0;
      setPulse({ up, down, neutral: Math.max(0, total - up - down) });
    })();
  }, []);

  const pulseTotal = pulse.up + pulse.neutral + pulse.down || 1;
  const upPct = (pulse.up / pulseTotal) * 100;
  const neutralPct = (pulse.neutral / pulseTotal) * 100;
  const downPct = (pulse.down / pulseTotal) * 100;

  // Biggest movers
  const sorted = [...items].sort((a, b) => Math.abs(b.profitDollars) - Math.abs(a.profitDollars));
  const topMovers = sorted.slice(0, 4);

  const isProfit = summary ? summary.unrealizedPL >= 0 : true;

  if (!summary) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/60 p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-primary" /> My Portfolio Today
        </h2>
        <p className="text-sm text-muted-foreground">Upload or add items to see your daily snapshot.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4 sm:p-6">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 pb-3 mb-4 border-b border-border/40">
        <BarChart3 className="w-5 h-5 text-primary" /> My Portfolio Today
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_auto_3fr] gap-0 items-stretch">
        {/* LEFT: Portfolio Value + Daily P/L + Market Pulse bar */}
        <div className="flex flex-col pr-0 lg:pr-0">
          {/* Value + P/L row */}
          <div className="flex items-stretch gap-0 rounded-lg border border-border/40 overflow-hidden">
            {/* Portfolio Value */}
            <div className="space-y-1.5 min-w-0 p-3 sm:p-5 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Portfolio Value</p>
              <p className="text-xl sm:text-3xl font-bold tabular-nums text-foreground truncate">${fmt(summary.totalMarketValue)}</p>
              <div className="flex items-center gap-1">
                {isProfit ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                <span className={cn('text-[11px] font-semibold tabular-nums truncate', isProfit ? 'text-success' : 'text-destructive')}>
                  ${fmt(Math.abs(summary.unrealizedPL))} ({fmtPct(summary.unrealizedPLPercent)}) 7D
                </span>
              </div>
            </div>

            {/* Daily P/L */}
            <div className="space-y-1.5 min-w-0 border-l border-border/40 p-3 sm:p-5 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Daily P/L</p>
                <div className="flex gap-0.5 bg-secondary/40 rounded-md p-0.5">
                  {(['1D', '7D'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlPeriod(p)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-medium transition-colors',
                        plPeriod === p
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <p className={cn('text-lg sm:text-xl font-bold tabular-nums truncate', isProfit ? 'text-success' : 'text-destructive')}>
                {fmtDollar(summary.unrealizedPL)}
              </p>
              <span className={cn('text-[11px] font-semibold tabular-nums truncate block', isProfit ? 'text-success' : 'text-destructive')}>
                ${fmt(Math.abs(summary.unrealizedPL))} ({fmtPct(summary.unrealizedPLPercent)})
              </span>
            </div>
          </div>

          {/* Market Pulse Bar */}
          <div className="mt-4 pt-3 border-t border-border/10">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Market Overview</p>
            <p className="text-[11px] text-muted-foreground tabular-nums text-center mb-1.5 flex items-center justify-center gap-1">
              {pulseTotal.toLocaleString()} Cards Tracked
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    Based on 7-day price change data across all tracked cards.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-muted/20">
              <div className="h-full bg-success" style={{ width: `${upPct}%`, borderRadius: upPct === 100 ? '9999px' : '9999px 0 0 9999px' }} />
              <div className="h-full bg-muted-foreground/30" style={{ width: `${neutralPct}%` }} />
              <div className="h-full bg-destructive" style={{ width: `${downPct}%`, borderRadius: downPct === 100 ? '9999px' : '0 9999px 9999px 0' }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-success font-semibold tabular-nums">↑ {pulse.up.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{pulse.neutral.toLocaleString()} neutral</span>
              <span className="text-[11px] text-destructive font-semibold tabular-nums">↓ {pulse.down.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        {/* RIGHT: Biggest Movers (wider) */}
        <div className="mt-4 lg:mt-0 lg:pl-3 min-w-0 overflow-hidden flex flex-col">
          <div className="rounded-lg border border-border/40 p-4 min-w-0 overflow-hidden flex-1 flex flex-col">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
              Biggest Movers <span className="normal-case">(Owned)</span>
            </p>
            {topMovers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topMovers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate min-w-0 flex-shrink">{item.productName}</span>
                    <span className={cn('text-sm font-bold tabular-nums shrink-0 whitespace-nowrap', item.profitDollars >= 0 ? 'text-success' : 'text-destructive')}>
                      {fmtPct(item.gainPercent)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
