import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2, TrendingUp, TrendingDown, Search, ChevronDown, PlusCircle, CheckCircle,
  Grid3X3, List,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoverCard, getImageUrl, getChangeForTime } from '@/components/buylist/shared/signalHelpers';
import MarketScannerBar, { ScannerFilters, DEFAULT_FILTERS } from '@/components/buylist/MarketScannerBar';
import { useWatchlist } from '@/hooks/useWatchlist';

const PAGE_SIZE = 20;

function InlineWatchlistBtn({ card, fullWidth }: { card: MoverCard; fullWidth?: boolean }) {
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const inList = isInWatchlist(card.card_id || card.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inList) removeFromWatchlist(card.card_id || card.id);
    else addToWatchlist({
      card_id: card.card_id || card.id,
      name: card.name,
      set_name: card.set_name,
      product_type: card.product_type,
      tcgplayer_id: card.tcgplayer_id,
      rarity: card.rarity,
    });
  };

  if (fullWidth) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors mt-3',
          inList
            ? 'border-success/30 bg-success/10 text-success hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
            : 'border-border/40 bg-secondary/20 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30'
        )}
      >
        {inList ? <CheckCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
        {inList ? 'On Watchlist' : 'Add to Watchlist'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'p-1 rounded-md transition-colors shrink-0',
        inList ? 'text-success hover:text-destructive' : 'text-muted-foreground hover:text-foreground'
      )}
      title={inList ? 'Remove from Watchlist' : 'Add to Watchlist'}
    >
      {inList ? <CheckCircle className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
    </button>
  );
}

function ScannerCard({ card, timePeriod }: { card: MoverCard; timePeriod: string }) {
  const navigate = useNavigate();
  const imgUrl = getImageUrl(card);
  const change = getChangeForTime(card, timePeriod) ?? 0;
  const currentPrice = card.price ?? 0;
  const isUp = change >= 0;

  return (
    <div
      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
      className="glass-card rounded-xl overflow-hidden hover:border-primary/30 transition-all group cursor-pointer flex flex-col"
    >
      {/* Card image */}
      <div className="relative aspect-[3/4] bg-muted/30 flex items-center justify-center">
        {imgUrl ? (
          <img src={imgUrl} alt="" className="w-full h-full object-contain p-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
        )}
        {/* % badge overlay */}
        <div className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-extrabold tabular-nums',
          isUp ? 'bg-success/90 text-success-foreground' : 'bg-destructive/90 text-destructive-foreground'
        )}>
          {isUp ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>
      {/* Info section below card */}
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-[11px] font-bold text-foreground truncate leading-tight">{card.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{card.set_name || '—'}</p>
        <p className="text-[10px] text-muted-foreground truncate">{card.rarity || card.product_type || '—'}</p>
        <div className="flex items-center justify-between pt-0.5">
          <p className="text-sm font-black tabular-nums text-success">${currentPrice.toFixed(2)}</p>
          <p className="text-[10px] tabular-nums text-muted-foreground">Prev: ${(change !== 0 ? currentPrice / (1 + change / 100) : currentPrice).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Table Header ── */
function TableHeader({ timePeriod }: { timePeriod: string }) {
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

function ScannerTableRow({ card, timePeriod, rank }: { card: MoverCard; timePeriod: string; rank: number }) {
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
      {/* Rank */}
      <span className="text-sm font-bold text-foreground bg-muted/40 rounded-md w-8 h-8 flex items-center justify-center">{rank}</span>

      {/* Card: image + name + rarity */}
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

      {/* Set */}
      <div className="min-w-0">
        <p className="text-sm truncate">{card.set_name || '—'}</p>
        <p className="text-[11px] text-muted-foreground truncate">#{card.tcgplayer_id || card.card_id?.slice(-6) || '—'}</p>
      </div>

      {/* Current Price */}
      <p className="text-right text-sm font-bold tabular-nums text-success">${currentPrice.toFixed(2)}</p>

      {/* Previous Price */}
      <p className="text-right text-sm tabular-nums text-muted-foreground">${prevPrice.toFixed(2)}</p>

      {/* Change ($) */}
      <p className={cn('text-right text-sm font-semibold tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
        {dollarChange >= 0 ? '+' : '-'}${Math.abs(dollarChange).toFixed(2)}
      </p>

      {/* Change (%) */}
      <span className={cn(
        'text-right text-xs font-bold tabular-nums px-2 py-1 rounded',
        isUp ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'
      )}>
        {isUp ? '+' : ''}{change.toFixed(2)}%
      </span>

      {/* Watchlist btn */}
      <div onClick={(e) => e.stopPropagation()}>
        <InlineWatchlistBtn card={card} />
      </div>
    </div>
  );
}

/* ── Server-side scan helper ── */

async function fetchScannedData(f: ScannerFilters, search: string): Promise<MoverCard[]> {
  const timeCol = f.time === 'all' ? '7d' : f.time;
  const changeCol = `price_change_${timeCol}`;

  let query = supabase
    .from('market_snapshots')
    .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_24h, price_change_7d, price_change_30d, price_change_90d, product_type, image_url, game')
    .not(changeCol, 'is', null)
    .not('product_type', 'ilike', '%graded%')
    .not('name', 'ilike', '%Energy Search Pro%')
    .not('printing', 'ilike', '%reverse%')
    .not('rarity', 'eq', 'Code Card');

  // Game filter
  if (f.game && f.game !== 'all') {
    query = query.eq('game', f.game);
  }

  // Type filter
  if (f.type === 'cards') query = query.eq('product_type', 'card');
  else if (f.type === 'sealed') query = query.neq('product_type', 'card');

  // Price filter
  switch (f.price) {
    case 'under10': query = query.lt('price', 10).gt('price', 0); break;
    case '10to50': query = query.gte('price', 10).lte('price', 50); break;
    case '50to100': query = query.gte('price', 50).lte('price', 100); break;
    case '100to400': query = query.gte('price', 100).lte('price', 400); break;
    case '400plus': query = query.gte('price', 400); break;
    default: query = query.gt('price', 0); break;
  }

  // Server-side % change range filter (applied BEFORE limit to avoid truncation)
  const pctRanges: Record<string, [number, number]> = {
    '0to5': [0, 5],
    '5to15': [5, 15],
    '15to30': [15, 30],
    '30to50': [30, 50],
    '50plus': [50, 10000],
  };
  const pctRange = f.pctChange !== 'any' ? pctRanges[f.pctChange] : null;

  // Movement filter — server-side ordering + pct range
  if (f.movement === 'gainers') {
    if (pctRange) {
      query = query.gte(changeCol, pctRange[0]).lte(changeCol, pctRange[1]);
    } else {
      query = query.gt(changeCol, 0);
    }
    query = query.order(changeCol, { ascending: false });
  } else if (f.movement === 'losers') {
    if (pctRange) {
      // Losers have negative values, so negate the range
      query = query.lte(changeCol, -pctRange[0]).gte(changeCol, -pctRange[1]);
    } else {
      query = query.lt(changeCol, 0);
    }
    query = query.order(changeCol, { ascending: true });
  } else {
    // all / volatile — can't easily do abs() server-side, fetch broader set
    if (pctRange) {
      // Fetch both positive and negative in range using or()
      query = query.or(
        `${changeCol}.gte.${pctRange[0]},${changeCol}.lte.-${pctRange[0]}`
      );
    }
    query = query.order(changeCol, { ascending: false });
  }

  // Text search (ilike on name or set)
  if (search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`name.ilike.${q},set_name.ilike.${q}`);
  }

  query = query.limit(1000);

  const { data } = await query;

  // Deduplicate by tcgplayer_id/card_id
  const seen = new Set<string>();
  let result = (data ?? []).filter((m: any) => {
    const k = m.tcgplayer_id || m.card_id || m.id;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }) as MoverCard[];

  // Client-side: % change filter and volatile sort (can't do abs() in postgrest)
  const getChange = (c: MoverCard) => getChangeForTime(c, timeCol);

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

  if (f.movement === 'volatile' || f.movement === 'all') {
    result.sort((a, b) => Math.abs(getChange(b) ?? 0) - Math.abs(getChange(a) ?? 0));
  }

  return result;
}

const SORT_OPTIONS = [
  { value: 'change', label: '% Change' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'alpha', label: 'A → Z' },
] as const;

export default function BuyListScanner() {
  const [results, setResults] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filters, setFilters] = useState<ScannerFilters>({ ...DEFAULT_FILTERS });
  const [activeFilters, setActiveFilters] = useState<ScannerFilters>({ ...DEFAULT_FILTERS });
  const [isScanned, setIsScanned] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'change' | 'price-desc' | 'price-asc' | 'alpha'>('change');
  const [sortOpen, setSortOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialType = searchParams.get('type') as ScannerFilters['type'] | null;
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Initial load with defaults (respecting URL params)
  useEffect(() => {
    (async () => {
      const initFilters = { ...DEFAULT_FILTERS };
      if (initialType === 'sealed' || initialType === 'cards') {
        initFilters.type = initialType;
      }
      // Only auto-scan if URL params are provided
      if (initialSearch || initialType) {
        initFilters.type = initialType || 'all';
        setFilters(initFilters);
        setActiveFilters(initFilters);
        setIsScanned(true);
        const data = await fetchScannedData(initFilters, initialSearch);
        setResults(data);
      }
      setLoading(false);
    })();
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setActiveFilters({ ...filters });
    setIsScanned(true);
    setVisibleCount(PAGE_SIZE);
    const data = await fetchScannedData(filters, searchQuery);
    setResults(data);
    setScanning(false);
  }, [filters, searchQuery]);

  const handleClear = useCallback(async () => {
    const d = { ...DEFAULT_FILTERS };
    setFilters(d);
    setActiveFilters(d);
    setIsScanned(false);
    setSearchQuery('');
    setVisibleCount(PAGE_SIZE);
    setScanning(true);
    const data = await fetchScannedData(d, '');
    setResults(data);
    setScanning(false);
  }, []);

  const timePeriod = useMemo(() => {
    const f = isScanned ? activeFilters : DEFAULT_FILTERS;
    return f.time === 'all' ? '7d' : (f.time === '24h' ? '24h' : f.time);
  }, [activeFilters, isScanned]);

  // Client-side text search + sort
  const filtered = useMemo(() => {
    let list = results;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.set_name?.toLowerCase().includes(q)
      );
    }
    // Sort
    const getChange = (c: MoverCard) => getChangeForTime(c, timePeriod) ?? 0;
    switch (sortBy) {
      case 'price-desc': list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case 'price-asc': list = [...list].sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case 'alpha': list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      case 'change': default: break; // already sorted by server
    }
    return list;
  }, [results, searchQuery, sortBy, timePeriod]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Seo title="Market Scanner — PokeIQ" description="Scan and filter the Pokémon TCG market by price, movement, and type." />
      <GlobalNavBar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-3 sm:space-y-4">
          {/* Header + view toggle on same row */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Market Scanner</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Filter and scan the entire market</p>
            </div>
          </div>

          <MarketScannerBar
            filters={filters}
            onChange={setFilters}
            onScan={handleScan}
            onClear={handleClear}
            isScanned={isScanned}
            scanLabel="Scan"
            keyword={searchQuery}
            onKeywordChange={(v) => { setSearchQuery(v); setVisibleCount(PAGE_SIZE); }}
          />

          {(loading || scanning) ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{scanning ? 'Scanning market…' : 'Loading market data…'}</span>
            </div>
          ) : !isScanned && filtered.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3">
              <Search className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">Set your filters and press Scan</p>
              <p className="text-xs text-muted-foreground">Use the filters above to search the market for price movers.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No items match your filters. Try adjusting and scanning again.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{filtered.length} results</p>
                <div className="flex items-center gap-2">
                  <Popover open={sortOpen} onOpenChange={setSortOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        'border border-border/60 bg-card/60 hover:bg-card',
                        sortOpen && 'border-accent/50 bg-accent/5 ring-1 ring-accent/20'
                      )}>
                        <span className="text-muted-foreground text-[11px] hidden sm:inline">Sort:</span>
                        <span className="text-foreground whitespace-nowrap">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                        <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', sortOpen && 'rotate-180')} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto min-w-[150px] p-1 bg-card border-border shadow-lg z-50" align="end" sideOffset={6}>
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value as any); setSortOpen(false); }}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                            sortBy === opt.value
                              ? 'bg-accent/15 text-accent font-medium'
                              : 'text-foreground hover:bg-muted/50'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center border border-border/60 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                      title="Grid view"
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                      title="List view"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {visible.map(card => (
                    <ScannerCard key={card.card_id || card.id} card={card} timePeriod={timePeriod} />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-xl overflow-hidden">
                  <TableHeader timePeriod={timePeriod} />
                  {visible.map((card, i) => (
                    <ScannerTableRow key={card.card_id || card.id} card={card} timePeriod={timePeriod} rank={i + 1} />
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

          <p className="text-xs text-muted-foreground text-center mt-8">
            ⚠️ Education only. Not financial advice. Always DYOR.
          </p>
        </div>
      </main>
    </div>
  );
}
