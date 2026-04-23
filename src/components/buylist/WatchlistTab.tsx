import React, { useEffect, useState, useCallback } from 'react';
import { Eye, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWatchlist } from '@/hooks/useWatchlist';
import MarketScannerBar, { ScannerFilters, DEFAULT_FILTERS } from './MarketScannerBar';
import MoverCardRow from './shared/MoverCardRow';
import { MoverCard, getChangeForTime } from './shared/signalHelpers';
import WatchlistSearch from './WatchlistSearch';

const PAGE_SIZE = 10;

const WATCHLIST_DEFAULTS: ScannerFilters = {
  game: 'all',
  type: 'all',
  time: 'all',
  movement: 'all',
  price: 'any',
  pctChange: 'any',
};

export default function WatchlistTab() {
  const { items, loading: wlLoading, refresh } = useWatchlist();
  const [enriched, setEnriched] = useState<MoverCard[]>([]);
  const [filtered, setFiltered] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ScannerFilters>({ ...WATCHLIST_DEFAULTS });
  const [activeFilters, setActiveFilters] = useState<ScannerFilters>({ ...WATCHLIST_DEFAULTS });
  const [isScanned, setIsScanned] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Enrich watchlist items with market_snapshots data
  const enrichItems = useCallback(async () => {
    if (items.length === 0) { setEnriched([]); setLoading(false); return; }

    const cardIds = items.map(i => i.card_id);
    // Fetch in batches of 50 to avoid query limits
    const allSnapshots: MoverCard[] = [];
    for (let i = 0; i < cardIds.length; i += 50) {
      const batch = cardIds.slice(i, i + 50);
      const { data } = await supabase
        .from('market_snapshots')
        .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, min_price_7d, max_price_7d, min_price_30d, max_price_30d, trend_slope_30d, cov_price_30d')
        .in('card_id', batch);
      if (data) allSnapshots.push(...(data as MoverCard[]));
    }

    // Map by card_id, prefer snapshot data; fall back to watchlist metadata
    const snapMap = new Map<string, MoverCard>();
    for (const s of allSnapshots) snapMap.set(s.card_id, s);

    const result: MoverCard[] = items.map(item => {
      const snap = snapMap.get(item.card_id);
      if (snap) return snap;
      // Fallback: no market data
      return {
        id: item.id,
        card_id: item.card_id,
        name: item.name,
        set_name: item.set_name,
        rarity: item.rarity,
        tcgplayer_id: item.tcgplayer_id,
        price: null,
        price_change_7d: null,
        price_change_30d: null,
        price_change_90d: null,
        product_type: item.product_type ?? 'card',
      };
    });

    setEnriched(result);
    setLoading(false);
  }, [items]);

  useEffect(() => {
    if (!wlLoading) enrichItems();
  }, [wlLoading, enrichItems]);

  // Apply filters
  const applyFilters = useCallback((cards: MoverCard[], f: ScannerFilters) => {
    let result = [...cards];

    // Type filter
    if (f.type === 'cards') result = result.filter(c => c.product_type === 'card');
    else if (f.type === 'sealed') result = result.filter(c => c.product_type === 'sealed');

    // Price filter
    switch (f.price) {
      case 'under10': result = result.filter(c => c.price != null && c.price < 10); break;
      case '10to50': result = result.filter(c => c.price != null && c.price >= 10 && c.price <= 50); break;
      case '50to100': result = result.filter(c => c.price != null && c.price >= 50 && c.price <= 100); break;
      case '100to400': result = result.filter(c => c.price != null && c.price >= 100 && c.price <= 400); break;
      case '400plus': result = result.filter(c => c.price != null && c.price >= 400); break;
    }

    // Movement filter — use 7d as default change column when time is 'all'
    const timeCol = f.time === 'all' ? '7d' : f.time;
    const getChange = (c: MoverCard) => getChangeForTime(c, timeCol);

    // % Change filter
    if (f.pctChange !== 'any') {
      result = result.filter(c => {
        const ch = Math.abs(getChange(c) ?? 0);
        switch (f.pctChange) {
          case '0to5': return ch >= 0 && ch < 5;
          case '5to15': return ch >= 5 && ch < 15;
          case '15to30': return ch >= 15 && ch < 30;
          case '30to50': return ch >= 30 && ch < 50;
          case '50plus': return ch >= 50;
          default: return true;
        }
      });
    }

    if (f.movement === 'gainers') {
      result = result.filter(c => { const ch = getChange(c); return ch != null && ch > 0; });
      result.sort((a, b) => (getChange(b) ?? 0) - (getChange(a) ?? 0));
    } else if (f.movement === 'losers') {
      result = result.filter(c => { const ch = getChange(c); return ch != null && ch < 0; });
      result.sort((a, b) => (getChange(a) ?? 0) - (getChange(b) ?? 0));
    } else if (f.movement === 'volatile') {
      result.sort((a, b) => Math.abs(getChange(b) ?? 0) - Math.abs(getChange(a) ?? 0));
    }
    // 'all' movement: no filtering, keep original order

    return result;
  }, []);

  // Re-filter when enriched data or active filters change
  useEffect(() => {
    setFiltered(applyFilters(enriched, activeFilters));
    setVisibleCount(PAGE_SIZE);
  }, [enriched, activeFilters, applyFilters]);

  const handleScan = () => {
    setActiveFilters({ ...filters });
    setIsScanned(true);
  };

  const handleClear = () => {
    const defaults = { ...WATCHLIST_DEFAULTS };
    setFilters(defaults);
    setActiveFilters(defaults);
    setIsScanned(false);
  };

  if (wlLoading || loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading watchlist…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-success" />
          <h2 className="text-xl font-bold text-foreground">Watchlist</h2>
        </div>
        <div className="mb-4">
          <WatchlistSearch onAdded={refresh} />
        </div>
        <div className="glass-card p-12 text-center">
          <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Your watchlist is empty</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Search above or add cards from the Scanner
          </p>
        </div>
      </div>
    );
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-success" />
          <h2 className="text-xl font-bold text-foreground">Watchlist</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
            {items.length} {items.length === 1 ? 'card' : 'cards'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-7">
          Your tracked cards with live market data and signals.
        </p>
      </div>

      <div className="mb-4">
        <WatchlistSearch onAdded={refresh} />
      </div>

      <div className="mb-5">
        <MarketScannerBar
          filters={filters}
          onChange={setFilters}
          onScan={handleScan}
          onClear={handleClear}
          isScanned={isScanned}
          scanLabel="Filter"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No watchlist items match your filters</p>
          <button onClick={handleClear} className="text-xs text-accent hover:underline mt-2">Reset filters</button>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((card, i) => (
            <MoverCardRow
              key={card.id}
              card={card}
              index={i}
              timeFilter={activeFilters.time}
              movementFilter={activeFilters.movement}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border/40 hover:bg-muted/20"
            >
              <ChevronDown className="w-4 h-4" />
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
