import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Zap, TrendingUp, TrendingDown, ChevronRight, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MoverCard, getImageUrl } from '@/components/buylist/shared/signalHelpers';
import { useIsPremium } from '@/hooks/useIsPremium';

export function MarketOverviewSection() {
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const [allMovers, setAllMovers] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Find the latest snapshot_date that actually has tradable cards (price > 5).
      // The very latest snapshot can be a partial / low-price sync with no movers.
      const { data: latestRow } = await supabase.from('market_snapshots')
        .select('snapshot_date')
        .gt('price', 5)
        .not('price_change_7d', 'is', null)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const d = latestRow?.snapshot_date;

      const qGainers = supabase.from('market_snapshots')
        .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url')
        .not('price_change_7d', 'is', null).gt('price', 5).gt('price_change_7d', 0).lte('price_change_7d', 50)
        .not('product_type', 'ilike', '%graded%');
      const qLosers = supabase.from('market_snapshots')
        .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url')
        .not('price_change_7d', 'is', null).gt('price', 5).lt('price_change_7d', 0).gte('price_change_7d', -35)
        .not('product_type', 'ilike', '%graded%');

      if (d) {
        qGainers.eq('snapshot_date', d);
        qLosers.eq('snapshot_date', d);
      }

      const [gainRes, loseRes] = await Promise.all([
        qGainers.order('price_change_7d', { ascending: false }).limit(50),
        qLosers.order('price_change_7d', { ascending: true }).limit(50),
      ]);

      const dedup = (arr: any[]) => {
        const seen = new Set<string>();
        return arr.filter(m => {
          const k = m.tcgplayer_id || m.card_id || m.id;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }) as MoverCard[];
      };

      setAllMovers([...dedup(gainRes.data ?? []), ...dedup(loseRes.data ?? [])]);
      setLoading(false);
    })();
  }, []);

  const allGainers = useMemo(() =>
    allMovers.filter(c => (c.price_change_7d ?? 0) > 0), [allMovers]);

  const allPullbacks = useMemo(() =>
    allMovers.filter(c => (c.price_change_7d ?? 0) < 0), [allMovers]);

  const gainers = useMemo(() =>
    [...allGainers].sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0)).slice(0, 5),
    [allGainers]);

  const pullbacks = useMemo(() =>
    [...allPullbacks].sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0)).slice(0, 5),
    [allPullbacks]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-warning" />
        <h2 className="text-base font-semibold text-foreground">Market Overview</h2>
      </div>
      <div className="flex items-center gap-3 mb-5 text-[11px] text-muted-foreground">
        <span>7D Movers</span>
        {!loading && (
          <>
            <span>·</span>
            <span className="text-success font-medium">{allGainers.length} up</span>
            <span>·</span>
            <span className="text-destructive font-medium">{allPullbacks.length} down</span>
            <span>·</span>
            <span>{allMovers.length} cards tracked</span>
          </>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading market data…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gainers */}
            <div>
              <p className="text-sm font-bold text-success mb-3">▲ Gainers · 7D</p>
              <div className={cn("space-y-1 relative", !isPremium && "pointer-events-none")}>
                {!isPremium && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/40 backdrop-blur-sm rounded-lg pointer-events-auto">
                    <button
                      onClick={() => navigate('/premium')}
                      className="rounded-lg border border-violet-500/30 bg-violet-500/15 hover:bg-violet-500/25 transition-colors px-4 py-2 flex items-center gap-2 text-xs font-semibold text-violet-300"
                    >
                      <Crown className="w-3.5 h-3.5" /> Unlock with Premium
                    </button>
                  </div>
                )}
                <div className={cn(!isPremium && "blur-sm select-none")}>
                {gainers.map((card, i) => {
                  const imgUrl = getImageUrl(card);
                  const change = card.price_change_7d ?? 0;
                  return (
                    <button
                      key={card.id}
                      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors group text-left"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                      {imgUrl && (
                        <img src={imgUrl} alt="" className="w-7 h-9 object-contain rounded shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{card.set_name}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
                        <span className="text-[10px] font-bold tabular-nums text-success flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />+{change.toFixed(1)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
                {gainers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No gainers found</p>}
                </div>
              </div>
            </div>

            {/* Pullbacks */}
            <div>
              <p className="text-sm font-bold text-warning mb-3">▼ Pullbacks · 7D</p>
              <div className={cn("space-y-1 relative", !isPremium && "pointer-events-none")}>
                {!isPremium && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/40 backdrop-blur-sm rounded-lg pointer-events-auto">
                    <button
                      onClick={() => navigate('/premium')}
                      className="rounded-lg border border-violet-500/30 bg-violet-500/15 hover:bg-violet-500/25 transition-colors px-4 py-2 flex items-center gap-2 text-xs font-semibold text-violet-300"
                    >
                      <Crown className="w-3.5 h-3.5" /> Unlock with Premium
                    </button>
                  </div>
                )}
                <div className={cn(!isPremium && "blur-sm select-none")}>
                {pullbacks.map((card, i) => {
                  const imgUrl = getImageUrl(card);
                  const change = card.price_change_7d ?? 0;
                  return (
                    <button
                      key={card.id}
                      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors group text-left"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                      {imgUrl && (
                        <img src={imgUrl} alt="" className="w-7 h-9 object-contain rounded shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{card.set_name}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
                        <span className="text-[10px] font-bold tabular-nums text-destructive flex items-center gap-0.5">
                          <TrendingDown className="w-2.5 h-2.5" />{change.toFixed(1)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
                {pullbacks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No pullbacks found</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border text-center">
            <Link to="/smartlist" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              See More <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
