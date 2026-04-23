import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MarketCounts {
  cards: number;
  cardsUpPct: number;
  cardsUp: number;
  cardsDown: number;
}

export function MarketPulseGauge() {
  const [counts, setCounts] = useState<MarketCounts>({ cards: 0, cardsUpPct: 50, cardsUp: 0, cardsDown: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Use pre-computed sentiment_cache instead of expensive count queries
      const { data: cached } = await supabase
        .from('sentiment_cache')
        .select('cards_total, cards_up, cards_down, cards_up_pct')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        setCounts({
          cards: cached.cards_total,
          cardsUpPct: cached.cards_up_pct,
          cardsUp: cached.cards_up,
          cardsDown: cached.cards_down,
        });
      }
      setLoading(false);
    })();
  }, []);

  const upPct = counts.cardsUpPct;
  const angle = ((upPct / 100) * 180) - 90;
  const isGreedy = upPct >= 55;
  const isFearful = upPct < 45;
  const sentimentLabel = isGreedy ? 'Greed' : isFearful ? 'Fear' : 'Neutral';
  const sentimentColor = isGreedy ? 'text-success' : isFearful ? 'text-destructive' : 'text-warning';
  const sentimentCaption = isGreedy
    ? 'Greed is driving the market'
    : isFearful
    ? 'Fear is gripping the market'
    : 'The market is holding steady';

  return (
    <div className="rounded-xl border border-border/30 bg-card/60 p-5 flex flex-col items-center justify-center">
      <div className="flex items-center gap-2 mb-3 self-start">
        <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
          <Gauge className="w-4 h-4 text-warning" />
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Market Pulse</p>
      </div>

      {loading ? (
        <div className="w-44 h-24 bg-muted/20 animate-pulse rounded" />
      ) : (
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 200 115" className="w-40 h-[88px]">
            <defs>
              <linearGradient id="report-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--destructive))" />
                <stop offset="35%" stopColor="hsl(var(--destructive))" stopOpacity="0.6" />
                <stop offset="50%" stopColor="hsl(var(--warning))" />
                <stop offset="65%" stopColor="hsl(var(--success))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--success))" />
              </linearGradient>
            </defs>
            <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="14" strokeLinecap="round" />
            <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="url(#report-gauge)" strokeWidth="14" strokeLinecap="round" />
            <line x1="15" y1="100" x2="15" y2="88" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
            <line x1="100" y1="15" x2="100" y2="27" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
            <line x1="185" y1="100" x2="185" y2="88" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
            <g transform={`rotate(${angle}, 100, 100)`}>
              <line x1="100" y1="100" x2="100" y2="28" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="100" cy="100" r="5" fill="hsl(var(--foreground))" />
            </g>
            <text x="15" y="112" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.7">Fear</text>
            <text x="185" y="112" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8" opacity="0.7">Greed</text>
          </svg>
          <span className={cn('text-sm font-bold', sentimentColor)}>{sentimentLabel}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5 text-center max-w-[180px]">{sentimentCaption}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] tabular-nums text-success font-semibold">↑ {counts.cardsUp.toLocaleString()}</span>
            <span className="text-[10px] tabular-nums text-destructive font-semibold">↓ {counts.cardsDown.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
