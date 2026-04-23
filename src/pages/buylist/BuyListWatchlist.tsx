import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, TrendingUp, TrendingDown, Eye, ChevronDown,
  Grid3X3, List, Search,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWatchlist } from '@/hooks/useWatchlist';
import { MoverCard, getImageUrl, getChangeForTime } from '@/components/buylist/shared/signalHelpers';
import MarketScannerBar, { ScannerFilters } from '@/components/buylist/MarketScannerBar';
import WatchlistSearch from '@/components/buylist/WatchlistSearch';

const PAGE_SIZE = 20;

const WATCHLIST_DEFAULTS: ScannerFilters = {
  game: 'all',
  type: 'all',
  time: 'all',
  movement: 'all',
  price: 'any',
  pctChange: 'any',
};

/* ── Stats Banner ── */
function WatchlistStats({ cards, timePeriod }: { cards: MoverCard[]; timePeriod: string }) {
  const totalValue = cards.reduce((s, c) => s + (c.price ?? 0), 0);
  const avgChange = cards.length > 0
    ? cards.reduce((s, c) => s + (getChangeForTime(c, timePeriod) ?? 0), 0) / cards.length
    : 0;
  const gainers = cards.filter(c => (getChangeForTime(c, timePeriod) ?? 0) > 0).length;
  const losers = cards.filter(c => (getChangeForTime(c, timePeriod) ?? 0) < 0).length;
  const flat = cards.length - gainers - losers;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="glass-card rounded-xl p-4 text-center">
        <p className="text-2xl font-bold tabular-nums">{cards.length}</p>
        <p className="text-xs text-muted-foreground">Items Tracked</p>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <p className="text-2xl font-bold tabular-nums">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        <p className="text-xs text-muted-foreground">Total Value</p>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <p className={cn('text-2xl font-bold tabular-nums', avgChange >= 0 ? 'text-success' : 'text-destructive')}>
          {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground">Avg {timePeriod.toUpperCase()} Change</p>
      </div>
      <div className="glass-card rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-3 text-sm font-bold">
          <span className="text-success">↑{gainers}</span>
          <span className="text-muted-foreground">⊘{flat}</span>
          <span className="text-destructive">↓{losers}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Distribution</p>
      </div>
    </div>
  );
}

/* ── Grid Card ── */
function WatchlistCard({ card, timePeriod, onRemove }: { card: MoverCard; timePeriod: string; onRemove: (id: string) => void }) {
  const navigate = useNavigate();
  const imgUrl = getImageUrl(card);
  const change = getChangeForTime(card, timePeriod) ?? 0;
  const currentPrice = card.price ?? 0;
  const prevPrice = change !== 0 ? currentPrice / (1 + change / 100) : currentPrice;
  const isUp = change >= 0;

  return (
    <div className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all group flex flex-col items-center text-center relative">
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(card.card_id || card.id); }}
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 text-xs"
        title="Remove"
      >✕</button>

      <button onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)} className="w-full flex flex-col items-center">
        <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors">{card.name}</p>
        <p className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5 mb-3">{card.set_name}</p>

        {imgUrl ? (
          <img src={imgUrl} alt="" className="w-16 h-22 object-contain rounded-lg mb-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-16 h-22 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[9px] mb-2">No img</div>
        )}

        <div className="flex items-center gap-1.5 mb-3">
          {isUp ? <TrendingUp className="w-5 h-5 text-success" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
          <span className={cn('text-2xl font-black tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
            {isUp ? '+' : ''}{change.toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground">{timePeriod.toUpperCase()}</span>
        </div>
      </button>

      <div className="w-full mt-auto space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Current</span>
          <span className="text-sm font-bold tabular-nums">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Previous</span>
          <span className="text-xs text-muted-foreground tabular-nums">${prevPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Table Header ── */
function WatchlistTableHeader() {
  return (
    <div className="grid grid-cols-[3rem_1fr_1fr_6rem_6rem_5.5rem_5.5rem_2.5rem] gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
      <span>Rank</span>
      <span>Card</span>
      <span>Set</span>
      <span className="text-right">Current Price</span>
      <span className="text-right">Previous Price</span>
      <span className="text-right">Change ($)</span>
      <span className="text-right">Change (%)</span>
      <span></span>
    </div>
  );
}

function WatchlistTableRow({ card, timePeriod, rank, onRemove }: { card: MoverCard; timePeriod: string; rank: number; onRemove: (id: string) => void }) {
  const navigate = useNavigate();
  const imgUrl = getImageUrl(card);
  const change = getChangeForTime(card, timePeriod) ?? 0;
  const currentPrice = card.price ?? 0;
  const prevPrice = change !== 0 ? currentPrice / (1 + change / 100) : currentPrice;
  const isUp = change >= 0;
  const dollarChange = currentPrice - prevPrice;

  return (
    <div
      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
      className="grid grid-cols-[3rem_1fr_1fr_6rem_6rem_5.5rem_5.5rem_2.5rem] gap-2 px-4 py-3 items-center hover:bg-muted/20 transition-colors cursor-pointer border-b border-border/20 group"
    >
      <span className="text-sm font-bold text-foreground bg-muted/40 rounded-md w-8 h-8 flex items-center justify-center">{rank}</span>

      <div className="flex items-center gap-3 min-w-0">
        {imgUrl ? (
          <img src={imgUrl} alt="" className="w-10 h-14 object-contain rounded shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-10 h-14 rounded bg-muted flex items-center justify-center text-muted-foreground text-[8px] shrink-0">No img</div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{card.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{card.rarity || card.product_type}</p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm truncate">{card.set_name || '—'}</p>
        <p className="text-[11px] text-muted-foreground truncate">#{card.tcgplayer_id || card.card_id?.slice(-6) || '—'}</p>
      </div>

      <p className="text-right text-sm font-bold tabular-nums text-success">${currentPrice.toFixed(2)}</p>
      <p className="text-right text-sm tabular-nums text-muted-foreground">${prevPrice.toFixed(2)}</p>

      <p className={cn('text-right text-sm font-semibold tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
        {dollarChange >= 0 ? '+' : '-'}${Math.abs(dollarChange).toFixed(2)}
      </p>

      <span className={cn(
        'text-right text-xs font-bold tabular-nums px-2 py-1 rounded',
        isUp ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
      )}>
        {isUp ? '+' : ''}{change.toFixed(2)}%
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onRemove(card.card_id || card.id); }}
        className="text-muted-foreground hover:text-destructive transition-colors text-xs"
        title="Remove"
      >✕</button>
    </div>
  );
}

/* ── Main Page ── */
export default function BuyListWatchlist() {
  const navigate = useNavigate();
  const { items, loading: wlLoading, refresh, removeFromWatchlist } = useWatchlist();
  const [enriched, setEnriched] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ScannerFilters>({ ...WATCHLIST_DEFAULTS });
  const [activeFilters, setActiveFilters] = useState<ScannerFilters>({ ...WATCHLIST_DEFAULTS });
  const [isScanned, setIsScanned] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isAuthed, setIsAuthed] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user && !session.user.is_anonymous);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Enrich watchlist
  const enrichItems = useCallback(async () => {
    if (items.length === 0) { setEnriched([]); setLoading(false); return; }
    const cardIds = items.map(i => i.card_id);
    const allSnapshots: MoverCard[] = [];
    for (let i = 0; i < cardIds.length; i += 50) {
      const batch = cardIds.slice(i, i + 50);
      const { data } = await supabase
        .from('market_snapshots')
        .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, min_price_7d, max_price_7d, min_price_30d, max_price_30d, trend_slope_30d, cov_price_30d, image_url')
        .in('card_id', batch);
      if (data) allSnapshots.push(...(data as MoverCard[]));
    }

    const snapMap = new Map<string, MoverCard>();
    for (const s of allSnapshots) {
      if (!snapMap.has(s.card_id)) snapMap.set(s.card_id, s);
    }

    const result: MoverCard[] = items.map(item => {
      const snap = snapMap.get(item.card_id);
      if (snap) return snap;
      return {
        id: item.id, card_id: item.card_id, name: item.name, set_name: item.set_name,
        rarity: item.rarity, tcgplayer_id: item.tcgplayer_id, price: null,
        price_change_7d: null, price_change_30d: null, price_change_90d: null,
        product_type: item.product_type ?? 'card',
      };
    });

    const seen = new Set<string>();
    const deduped = result.filter(c => {
      const k = c.card_id || c.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    setEnriched(deduped);
    setLoading(false);
  }, [items]);

  useEffect(() => {
    if (!wlLoading) enrichItems();
  }, [wlLoading, enrichItems]);

  const timePeriod = useMemo(() => {
    const f = isScanned ? activeFilters : WATCHLIST_DEFAULTS;
    return f.time === 'all' ? '7d' : f.time;
  }, [activeFilters, isScanned]);

  const handleScan = useCallback(() => {
    setActiveFilters({ ...filters });
    setIsScanned(true);
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const handleClear = useCallback(() => {
    const d = { ...WATCHLIST_DEFAULTS };
    setFilters(d);
    setActiveFilters(d);
    setIsScanned(false);
    setSearchQuery('');
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Apply filters
  const filtered = useMemo(() => {
    let result = [...enriched];
    const f = isScanned ? activeFilters : WATCHLIST_DEFAULTS;

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.set_name?.toLowerCase().includes(q)
      );
    }

    if (f.type === 'cards') result = result.filter(c => c.product_type === 'card');
    else if (f.type === 'sealed') result = result.filter(c => c.product_type !== 'card');

    switch (f.price) {
      case 'under10': result = result.filter(c => c.price != null && c.price < 10); break;
      case '10to50': result = result.filter(c => c.price != null && c.price >= 10 && c.price <= 50); break;
      case '50to100': result = result.filter(c => c.price != null && c.price >= 50 && c.price <= 100); break;
      case '100to400': result = result.filter(c => c.price != null && c.price >= 100 && c.price <= 400); break;
      case '400plus': result = result.filter(c => c.price != null && c.price >= 400); break;
    }

    const timeCol = f.time === 'all' ? '7d' : f.time;
    const getChange = (c: MoverCard) => getChangeForTime(c, timeCol);
    if (f.movement === 'gainers') {
      result = result.filter(c => { const ch = getChange(c); return ch != null && ch > 0; });
      result.sort((a, b) => (getChange(b) ?? 0) - (getChange(a) ?? 0));
    } else if (f.movement === 'losers') {
      result = result.filter(c => { const ch = getChange(c); return ch != null && ch < 0; });
      result.sort((a, b) => (getChange(a) ?? 0) - (getChange(b) ?? 0));
    } else if (f.movement === 'volatile') {
      result.sort((a, b) => Math.abs(getChange(b) ?? 0) - Math.abs(getChange(a) ?? 0));
    } else {
      result.sort((a, b) => Math.abs(getChange(b) ?? 0) - Math.abs(getChange(a) ?? 0));
    }

    return result;
  }, [enriched, activeFilters, isScanned, searchQuery]);

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Seo title="Watchlist — PokeIQ" description="Your personal Pokémon TCG watchlist." />
        <GlobalNavBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="glass-card rounded-xl p-12 text-center space-y-4 max-w-md">
            <Eye className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-xl font-bold">Your Private Watchlist</h1>
            <p className="text-sm text-muted-foreground">Sign in to access your personalized watchlist with stats and market data.</p>
            <Button onClick={() => navigate('/auth')} className="gap-2">Sign In</Button>
          </div>
        </main>
      </div>
    );
  }

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="Watchlist — PokeIQ" description="Your personal Pokémon TCG watchlist with live market data." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Your Watchlist</h1>
              <p className="text-sm text-muted-foreground">Your private brief — track and monitor your picks</p>
            </div>
            <div className="flex items-center border border-border/60 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                title="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2.5 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search to add */}
          <WatchlistSearch onAdded={refresh} />
          <p className="text-xs text-muted-foreground">Use the search above or browse the <button onClick={() => navigate('/buylist/scanner')} className="text-primary hover:underline font-medium inline-flex items-center gap-1"><Search className="w-3 h-3" />Market Scanner</button> to find cards to add.</p>

          {wlLoading || loading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading watchlist…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <Eye className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">Your watchlist is empty</p>
              <p className="text-xs text-muted-foreground">Search above or add cards from the Market Report or Scanner</p>
              <Button variant="outline" size="sm" onClick={() => navigate('/pokeiq-daily')}>Browse Market Report</Button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <WatchlistStats cards={enriched} timePeriod={timePeriod} />

              <MarketScannerBar
                filters={filters}
                onChange={setFilters}
                onScan={handleScan}
                onClear={handleClear}
                isScanned={isScanned}
                scanLabel="Filter"
                keyword={searchQuery}
                onKeywordChange={(v) => { setSearchQuery(v); setVisibleCount(PAGE_SIZE); }}
              />

              <p className="text-xs text-muted-foreground">{filtered.length} of {enriched.length} items</p>


              {/* Cards */}
              {filtered.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">No items match your filters</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {visible.map(card => (
                        <WatchlistCard
                          key={card.card_id || card.id}
                          card={card}
                          timePeriod={timePeriod}
                          onRemove={(id) => removeFromWatchlist(id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card rounded-xl overflow-hidden">
                      <WatchlistTableHeader />
                      {visible.map((card, i) => (
                        <WatchlistTableRow
                          key={card.card_id || card.id}
                          card={card}
                          timePeriod={timePeriod}
                          rank={i + 1}
                          onRemove={(id) => removeFromWatchlist(id)}
                        />
                      ))}
                    </div>
                  )}
                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                      className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border/40 hover:bg-muted/20"
                    >
                      <ChevronDown className="w-4 h-4" /> Load More
                    </button>
                  )}
                </>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground text-center mt-8">
            ⚠️ Education only. Not financial advice. Always DYOR.
          </p>
        </div>
      </main>
    </div>
  );
}
