import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2, BarChart3, Activity, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface JustTCGVariant {
  condition: string;
  printing: string;
  language: string;
  price: number | null;
  avgPrice: number | null;
  avgPrice30d: number | null;
  priceChange24hr: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  minPrice7d: number | null;
  maxPrice7d: number | null;
  minPrice30d: number | null;
  maxPrice30d: number | null;
  trendSlope7d: number | null;
  trendSlope30d: number | null;
  stddevPopPrice7d: number | null;
  stddevPopPrice30d: number | null;
  covPrice7d: number | null;
  covPrice30d: number | null;
  iqrPrice7d: number | null;
  iqrPrice30d: number | null;
  priceChangesCount7d: number | null;
  priceChangesCount30d: number | null;
  priceRelativeTo30dRange: number | null;
  lastUpdated: number | null;
}

interface JustTCGCard {
  name: string;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  game: string | null;
  tcgplayerId: string | null;
  variants: JustTCGVariant[];
}

interface Props {
  tcgApiId: string;
  category: string;
}

function StatBox({ label, value, suffix, colorize }: { label: string; value: number | null | undefined; suffix?: string; colorize?: boolean }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium tabular-nums', colorize && (value >= 0 ? 'text-success' : 'text-destructive'))}>
        {colorize && value > 0 ? '+' : ''}
        {typeof value === 'number' ? (Math.abs(value) < 1 ? value.toFixed(4) : value.toFixed(2)) : value}
        {suffix || ''}
      </span>
    </div>
  );
}

export default function JustTCGStats({ tcgApiId, category }: Props) {
  const [card, setCard] = useState<JustTCGCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await supabase.functions.invoke('justtcg', {
          body: { action: 'getCard', cardId: tcgApiId },
        });
        if (!cancelled) {
          const cardData = data?.data?.[0];
          if (cardData) setCard(cardData);
          else setError('Card not found on JustTCG');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [tcgApiId]);

  if (loading) {
    return (
      <div className="glass-card p-4 mb-6 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading live data…</span>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="glass-card p-4 mb-6 text-center">
        <p className="text-sm text-muted-foreground">{error || 'No data available'}</p>
      </div>
    );
  }

  const preferredCondition = category === 'Sealed' ? 'Sealed' : 'Near Mint';
  const variant = card.variants?.find(v => v.condition === preferredCondition) || card.variants?.[0];

  if (!variant) return null;

  const lastUpdated = variant.lastUpdated ? new Date(variant.lastUpdated * 1000) : null;

  return (
    <div className="space-y-4 mb-6">
      {/* Card metadata */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-accent" />
          <p className="text-sm font-medium">JustTCG Live Data</p>
          {lastUpdated && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {card.rarity && <Badge variant="outline" className="text-xs">{card.rarity}</Badge>}
          {card.number && <Badge variant="outline" className="text-xs">#{card.number}</Badge>}
          {variant.printing && <Badge variant="outline" className="text-xs">{variant.printing}</Badge>}
          {variant.condition && <Badge variant="outline" className="text-xs">{variant.condition}</Badge>}
          {variant.language && <Badge variant="outline" className="text-xs">{variant.language}</Badge>}
        </div>
      </div>

      {/* Price changes */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          {((variant.priceChange7d ?? 0) >= 0) ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          <p className="text-sm font-medium">Price Changes</p>
        </div>
        <div className="divide-y divide-border">
          <StatBox label="24h Change" value={variant.priceChange24hr} suffix="%" colorize />
          <StatBox label="7D Change" value={variant.priceChange7d} suffix="%" colorize />
          <StatBox label="30D Change" value={variant.priceChange30d} suffix="%" colorize />
        </div>
      </div>

      {/* Price ranges */}
      {(variant.minPrice7d != null || variant.minPrice30d != null) && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent" />
            <p className="text-sm font-medium">Price Ranges</p>
          </div>
          <div className="divide-y divide-border">
            {variant.minPrice7d != null && variant.maxPrice7d != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">7D Range</span>
                <span className="text-sm font-medium tabular-nums">
                  ${variant.minPrice7d.toFixed(2)} – ${variant.maxPrice7d.toFixed(2)}
                </span>
              </div>
            )}
            {variant.minPrice30d != null && variant.maxPrice30d != null && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-muted-foreground">30D Range</span>
                <span className="text-sm font-medium tabular-nums">
                  ${variant.minPrice30d.toFixed(2)} – ${variant.maxPrice30d.toFixed(2)}
                </span>
              </div>
            )}
            <StatBox label="Avg Price (All)" value={variant.avgPrice} suffix="" />
            <StatBox label="Avg Price (30D)" value={variant.avgPrice30d} suffix="" />
            {variant.priceRelativeTo30dRange != null && (
              <StatBox label="Position in 30D Range" value={variant.priceRelativeTo30dRange * 100} suffix="%" />
            )}
          </div>
        </div>
      )}

      {/* Volatility & Trend */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-accent" />
          <p className="text-sm font-medium">Volatility & Trend</p>
        </div>
        <div className="divide-y divide-border">
          <StatBox label="Trend Slope (7D)" value={variant.trendSlope7d} colorize />
          <StatBox label="Trend Slope (30D)" value={variant.trendSlope30d} colorize />
          <StatBox label="Std Dev (7D)" value={variant.stddevPopPrice7d} suffix="" />
          <StatBox label="Std Dev (30D)" value={variant.stddevPopPrice30d} suffix="" />
          <StatBox label="CoV (7D)" value={variant.covPrice7d} suffix="" />
          <StatBox label="CoV (30D)" value={variant.covPrice30d} suffix="" />
          <StatBox label="IQR (7D)" value={variant.iqrPrice7d} suffix="" />
          <StatBox label="IQR (30D)" value={variant.iqrPrice30d} suffix="" />
          <StatBox label="Price Changes (7D)" value={variant.priceChangesCount7d} suffix="" />
          <StatBox label="Price Changes (30D)" value={variant.priceChangesCount30d} suffix="" />
        </div>
      </div>

      {/* Other variants */}
      {card.variants.length > 1 && (
        <div className="glass-card p-4">
          <p className="text-sm font-medium mb-2">All Variants ({card.variants.length})</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {card.variants.map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{v.condition}</span>
                  {v.printing && <span className="text-muted-foreground">· {v.printing}</span>}
                </div>
                <span className="font-medium tabular-nums">
                  {v.price != null ? `$${v.price.toFixed(2)}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
