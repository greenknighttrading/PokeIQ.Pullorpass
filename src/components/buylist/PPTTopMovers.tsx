import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PPTCardRaw {
  tcgPlayerId: string;
  name: string;
  setName: string;
  cardNumber: string;
  rarity: string;
  prices: { market: number | null; low: number | null; primaryPrinting?: string };
  imageCdnUrl200: string;
  priceHistory?: any;
}

/* ── Extract price history from nested PPT v2 response ── */
function extractPriceHistory(card: PPTCardRaw): Array<{ date: string; price: number }> {
  const ph = card.priceHistory;
  if (!ph) return [];

  if (ph.variants && typeof ph.variants === 'object') {
    const printing = card.prices?.primaryPrinting || Object.keys(ph.variants)[0];
    const variant = ph.variants[printing];
    if (variant && typeof variant === 'object') {
      const conditionData = (variant as any)['Near Mint'] || Object.values(variant)[0] as any;
      if (conditionData?.history && Array.isArray(conditionData.history)) {
        return conditionData.history
          .map((h: any) => ({ date: h.date, price: h.market ?? h.price ?? 0 }))
          .filter((h: any) => h.price > 0);
      }
    }
  }

  if (Array.isArray(ph)) {
    return ph.map((h: any) => ({ date: h.date, price: h.price ?? h.market ?? 0 })).filter((h: any) => h.price > 0);
  }

  return [];
}

function computeChange(card: PPTCardRaw): { pctChange: number; dollarChange: number; current: number } {
  const history = extractPriceHistory(card);
  const current = card.prices.market || (history.length > 0 ? history[history.length - 1].price : 0);
  const oldest = history.length >= 2 ? history[0].price : current;
  const pctChange = oldest > 0 ? ((current - oldest) / oldest) * 100 : 0;
  const dollarChange = current - oldest;
  return { pctChange, dollarChange, current };
}

function extractCards(response: any): PPTCardRaw[] {
  if (!response || typeof response !== 'object') return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.items)) return response.items;
  if (response.data && typeof response.data === 'object') {
    const d = response.data;
    if (Array.isArray(d.items)) return d.items;
  }
  return [];
}

export default function PPTTopMovers() {
  const navigate = useNavigate();
  const [movers, setMovers] = useState<(PPTCardRaw & { pctChange: number; dollarChange: number; current: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('pokemon-price-tracker', {
          body: { action: 'getCards', params: { limit: 30, includeHistory: true, days: 7, minPrice: 5, sortBy: 'marketPrice', sortOrder: 'desc' } }
        });
        if (cancelled) return;
        if (fnError) { setError(true); setLoading(false); return; }

        const cards = extractCards(data);
        console.log(`[PPTTopMovers] Extracted ${cards.length} cards`);

        if (cards.length === 0) { setError(true); setLoading(false); return; }

        const filtered = cards
          .map(c => ({ ...c, ...computeChange(c) }))
          .filter(c => c.current >= 5 && Math.abs(c.pctChange) > 0.5 && c.pctChange <= 50 && c.pctChange >= -35)
          .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

        // Limit gainers to 2, no limit on pullbacks
        const gainers = filtered.filter(c => c.pctChange > 0).slice(0, 2);
        const losers = filtered.filter(c => c.pctChange < 0).slice(0, 10);
        const enriched = [...gainers, ...losers]
          .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
          .slice(0, 10);

        setMovers(enriched);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Top Movers</h3>
          <Badge variant="secondary" className="text-[10px]">Live</Badge>
        </div>
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading top movers…</span>
        </div>
      </div>
    );
  }

  if (error || movers.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">Top Movers</h3>
        <Badge variant="secondary" className="text-[10px]">7D · $5+</Badge>
      </div>

      <div className="space-y-1.5">
        {movers.map((card, i) => {
          const isUp = card.pctChange >= 0;
          return (
            <button
              key={card.tcgPlayerId}
              onClick={() => navigate(`/buylist/mover/${card.tcgPlayerId}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left group"
            >
              <span className="text-xs font-bold text-muted-foreground w-5 text-center shrink-0">
                {i + 1}
              </span>

              {card.imageCdnUrl200 && (
                <img
                  src={card.imageCdnUrl200}
                  alt={card.name}
                  className="w-8 h-11 object-contain rounded shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                  {card.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {card.setName}{card.rarity ? ` · ${card.rarity}` : ''}
                </p>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <span className="text-sm font-bold tabular-nums">${card.current.toFixed(2)}</span>
                <span className={cn(
                  'text-xs font-bold tabular-nums flex items-center gap-0.5',
                  isUp ? 'text-success' : 'text-destructive'
                )}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? '+' : ''}{card.pctChange.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
