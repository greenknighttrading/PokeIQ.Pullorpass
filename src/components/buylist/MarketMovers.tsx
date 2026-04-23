import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ScanSearch } from 'lucide-react';
import MoverCardRow from './shared/MoverCardRow';
import { MoverCard } from './shared/signalHelpers';
import MarketScannerBar, { ScannerFilters, DEFAULT_FILTERS } from './MarketScannerBar';

/* ── Component ── */

export default function MarketMovers() {
  const [allMovers, setAllMovers] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ScannerFilters>(() => {
    try {
      const saved = sessionStorage.getItem('scanner-filters');
      return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
    } catch { return DEFAULT_FILTERS; }
  });
  const [isScanned, setIsScanned] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchDualColumns = useCallback(async (f: ScannerFilters) => {
    setLoading(true);
    setError(null);
    try {
      const { count } = await supabase
        .from('market_snapshots')
        .select('*', { count: 'exact', head: true });

      if (!count || count === 0) {
        setAllMovers([]);
        setLoading(false);
        return;
      }

      const timeCol = f.time === '30d' ? 'price_change_30d' : f.time === '90d' ? 'price_change_90d' : 'price_change_7d';
      // Note: 24h uses 7d column as fallback since we don't have a dedicated 24h column yet

      let baseQuery = () => {
      let q = supabase
          .from('market_snapshots')
          .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, min_price_7d, max_price_7d, min_price_30d, max_price_30d, trend_slope_30d, cov_price_30d, printing')
          .eq('game', 'Pokemon')
          .not('price', 'is', null)
          .gte('price', 1)
          .not(timeCol, 'is', null);

        // Type filter (DB stores lowercase: 'card', 'sealed')
        if (f.type === 'cards') q = q.eq('product_type', 'card');
        else if (f.type === 'sealed') q = q.eq('product_type', 'sealed');

        // Price filter
        if (f.price === 'under10') q = q.lt('price', 10);
        else if (f.price === '10to50') q = q.gte('price', 10).lt('price', 50);
        else if (f.price === '50to100') q = q.gte('price', 50).lt('price', 100);
        else if (f.price === '100to400') q = q.gte('price', 100).lt('price', 400);
        else if (f.price === '400plus') q = q.gte('price', 400);

        return q;
      };

      // Fetch top gainers (cap at 50% to exclude outliers)
      const { data: gainers } = await baseQuery()
        .gt(timeCol, 0)
        .lte(timeCol, 50)
        .order(timeCol, { ascending: false })
        .limit(50);

      // Fetch top pullbacks (cap at -35% to exclude outliers)
      const { data: losers } = await baseQuery()
        .lt(timeCol, 0)
        .gte(timeCol, -35)
        .order(timeCol, { ascending: true })
        .limit(50);

      // Deduplicate by card_id
      const combined = [...(gainers || []), ...(losers || [])] as MoverCard[];
      const seen = new Set<string>();
      const deduped = combined.filter(m => {
        const key = m.card_id || m.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setAllMovers(deduped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist filters to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('scanner-filters', JSON.stringify(filters));
  }, [filters]);

  // Only fetch on mount with initial filters, not on every filter change
  useEffect(() => {
    setVisibleCount(10);
    fetchDualColumns(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeCol = filters.time === '30d' ? 'price_change_30d' : filters.time === '90d' ? 'price_change_90d' : 'price_change_7d';
  const isExcluded = (m: MoverCard) => {
    const name = (m.name || '').toLowerCase();
    const rarity = (m.rarity || '').toLowerCase();
    const printing = ((m as any).printing || '').toLowerCase();
    if (name.includes('reverse holo') || rarity.includes('reverse holo') || printing.includes('reverse holo')) return true;
    if (name.includes('1st edition') || printing.includes('1st edition')) return true;
    return false;
  };

  const allGainers = allMovers
    .filter(m => {
      const v = (m[timeCol as keyof MoverCard] as number ?? 0);
      return v > 0 && v <= 50 && !isExcluded(m);
    })
    .slice(0, 2);
  const allPullbacks = allMovers
    .filter(m => { const v = (m[timeCol as keyof MoverCard] as number ?? 0); return v < 0 && v >= -35; });

  const showGainers = filters.movement === 'all' || filters.movement === 'gainers' || filters.movement === 'volatile';
  const showPullbacks = filters.movement === 'all' || filters.movement === 'losers' || filters.movement === 'volatile';

  const gainers = allGainers;
  const pullbacks = allPullbacks.slice(0, visibleCount);
  const timeLabel = filters.time === '24h' ? '24H' : filters.time === '30d' ? '30D' : filters.time === '90d' ? '90D' : '7D';

  const hasMoreGainers = showGainers && allGainers.length > visibleCount;
  const hasMorePullbacks = showPullbacks && allPullbacks.length > visibleCount;
  const hasMore = hasMoreGainers || hasMorePullbacks;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ScanSearch className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Market Scanner</h2>
      </div>

      <MarketScannerBar
        filters={filters}
        onChange={setFilters}
        onScan={() => { setIsScanned(true); setVisibleCount(10); fetchDualColumns(filters); }}
        onClear={() => { setFilters(DEFAULT_FILTERS); setIsScanned(true); setVisibleCount(10); fetchDualColumns(DEFAULT_FILTERS); }}
        isScanned={isScanned}
        scanLabel="Scan"
      />

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Scanning market data…</span>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (!showGainers && !showPullbacks) || (gainers.length === 0 && pullbacks.length === 0) ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No market data available yet</p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 ${showGainers && showPullbacks ? 'lg:grid-cols-2' : ''} gap-6`}>
            {/* Gainers Column */}
            {showGainers && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-primary">▲ Top Gainers</span>
                  <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                </div>
                <div className="space-y-2">
                  {gainers.map((card, i) => (
                    <MoverCardRow
                      key={card.id}
                      card={card}
                      index={i}
                      timeFilter={filters.time}
                      movementFilter="gainers"
                    />
                  ))}
                  {gainers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No gainers found</p>
                  )}
                </div>
              </div>
            )}

            {/* Pullbacks Column */}
            {showPullbacks && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-warning">▼ Top Pullbacks</span>
                  <span className="text-[10px] text-muted-foreground">{timeLabel}</span>
                </div>
                <div className="space-y-2">
                  {pullbacks.map((card, i) => (
                    <MoverCardRow
                      key={card.id}
                      card={card}
                      index={i}
                      timeFilter={filters.time}
                      movementFilter="losers"
                    />
                  ))}
                  {pullbacks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No pullbacks found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="px-6 py-2.5 rounded-lg text-sm font-medium border border-border/60 bg-card/60 hover:bg-card text-foreground transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
