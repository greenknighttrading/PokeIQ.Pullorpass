import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, TrendingUp, TrendingDown,
  LayoutGrid, List,
  Database, Crown, Package, Layers, SlidersHorizontal, Star,
  Plus, ChevronUp, ChevronDown, Trash2, Edit2, Check, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import WatchlistButton from './WatchlistButton';
import MarketScannerBar, { ScannerFilters, DEFAULT_FILTERS } from './MarketScannerBar';

/* ── Types ── */

interface SnapshotRow {
  id: string;
  card_id: string;
  name: string;
  set_name: string | null;
  number: string | null;
  rarity: string | null;
  tcgplayer_id: string | null;
  price: number | null;
  price_change_7d: number | null;
  price_change_30d: number | null;
  price_change_90d: number | null;
  product_type: string;
  min_price_7d: number | null;
  max_price_7d: number | null;
  min_price_30d: number | null;
  max_price_30d: number | null;
  trend_slope_30d: number | null;
  cov_price_30d: number | null;
  snapshot_date: string;
  synced_at: string;
  image_url: string | null;
}

interface MoverCard {
  id: string;
  card_id: string;
  name: string;
  setName: string;
  cardNumber: string | null;
  rarity: string | null;
  tcgplayerId: string | null;
  current: number;
  pctChange: number;
  dollarChange: number;
  previousPrice: number;
  volatility: number;
  trendSlope: number;
  productType: string;
  isNewHigh: boolean;
  isNewLow: boolean;
  imageUrl: string | null;
}

interface UserWatchlist {
  id: string;
  name: string;
  filters: ScannerFilters & { cardIds?: string[] };
  position: number;
}

type TimePeriod = '7d' | '30d' | '90d';
type ViewMode = 'grid' | 'table';
type CategoryKey = 'raw' | 'sealed' | 'greatest_hits' | 'custom' | string;

interface Category {
  key: CategoryKey;
  label: string;
  icon: React.ElementType;
}

const LIMIT = 50;
const PENDING_STORAGE_KEY = 'smartlist_pending_cards';
const PENDING_NAME_KEY = 'smartlist_pending_name';
const EDITING_LIST_KEY = 'smartlist_editing_id';

const BUILT_IN_CATEGORIES: Category[] = [
  { key: 'raw', label: 'RAW CARDS', icon: Layers },
  { key: 'sealed', label: 'SEALED', icon: Package },
  { key: 'greatest_hits', label: 'GREATEST HITS', icon: Crown },
  { key: 'promo', label: 'PROMO', icon: Star },
];

/* ── Helpers ── */

function getChangeCol(period: TimePeriod): 'price_change_7d' | 'price_change_30d' | 'price_change_90d' {
  return period === '7d' ? 'price_change_7d' : period === '30d' ? 'price_change_30d' : 'price_change_90d';
}

function getImageUrl(row: SnapshotRow): string | null {
  if (row.image_url) return row.image_url;
  if (row.tcgplayer_id) return `https://tcgplayer-cdn.tcgplayer.com/product/${row.tcgplayer_id}_in_200x200.jpg`;
  return null;
}

function toMoverCard(row: SnapshotRow, period: TimePeriod): MoverCard {
  const changeCol = getChangeCol(period);
  const current = row.price ?? 0;
  const pctChange = (row[changeCol] as number) ?? 0;
  const dollarChange = current > 0 && pctChange !== 0 ? current - (current / (1 + pctChange / 100)) : 0;
  const previousPrice = current - dollarChange;
  const volatility = row.cov_price_30d ?? 0;
  const trendSlope = row.trend_slope_30d ?? 0;
  const isNewHigh = current > 0 && row.max_price_7d != null && current >= row.max_price_7d * 0.98 && pctChange > 0;
  const isNewLow = current > 0 && row.min_price_7d != null && current <= row.min_price_7d * 1.02 && pctChange < 0;

  return {
    id: row.id, card_id: row.card_id, name: row.name, setName: row.set_name ?? '',
    cardNumber: row.number, rarity: row.rarity, tcgplayerId: row.tcgplayer_id,
    current, pctChange, dollarChange, previousPrice, volatility, trendSlope,
    productType: row.product_type, isNewHigh, isNewLow, imageUrl: getImageUrl(row),
  };
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return dateStr; }
}

function dedup(cards: MoverCard[]): MoverCard[] {
  const map = new Map<string, MoverCard>();
  for (const c of cards) {
    const existing = map.get(c.card_id);
    if (!existing || Math.abs(c.pctChange) > Math.abs(existing.pctChange)) map.set(c.card_id, c);
  }
  return Array.from(map.values());
}

/** Dedup by normalized name — keeps only the entry with the highest absolute % change per unique name */
function dedupByName(cards: MoverCard[]): MoverCard[] {
  const map = new Map<string, MoverCard>();
  for (const c of cards) {
    const key = c.name.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || Math.abs(c.pctChange) > Math.abs(existing.pctChange)) map.set(key, c);
  }
  return Array.from(map.values());
}

/* ── Session storage helpers for pending cards ── */
function savePendingToSession(cards: MoverCard[], name: string, editingId: string | null) {
  try {
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(cards));
    sessionStorage.setItem(PENDING_NAME_KEY, name);
    if (editingId) sessionStorage.setItem(EDITING_LIST_KEY, editingId);
    else sessionStorage.removeItem(EDITING_LIST_KEY);
  } catch { /* silent */ }
}

function loadPendingFromSession(): { cards: MoverCard[]; name: string; editingId: string | null } {
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    const name = sessionStorage.getItem(PENDING_NAME_KEY) || '';
    const editingId = sessionStorage.getItem(EDITING_LIST_KEY) || null;
    if (raw) return { cards: JSON.parse(raw), name, editingId };
  } catch { /* silent */ }
  return { cards: [], name: '', editingId: null };
}

function clearPendingSession() {
  try {
    sessionStorage.removeItem(PENDING_STORAGE_KEY);
    sessionStorage.removeItem(PENDING_NAME_KEY);
    sessionStorage.removeItem(EDITING_LIST_KEY);
  } catch { /* silent */ }
}

/* ── Card Grid Item ── */
function CardGridItem({ card, index, onClick, priceColorClass = 'text-success' }: { card: MoverCard; index: number; onClick: () => void; priceColorClass?: string }) {
  const isUp = card.pctChange >= 0;
  return (
    <div onClick={onClick} className="glass-card rounded-xl overflow-hidden hover:border-primary/30 transition-all text-left group relative cursor-pointer flex flex-col">
      <div className="relative aspect-[3/4] bg-muted/30 flex items-center justify-center">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain p-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
        )}
        <div className={cn(
          'absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-extrabold tabular-nums',
          isUp ? 'bg-success/90 text-success-foreground' : 'bg-destructive/90 text-destructive-foreground'
        )}>
          {isUp ? '+' : ''}{card.pctChange.toFixed(1)}%
        </div>
      </div>
      <div className="px-2.5 py-2 space-y-0.5 flex flex-col flex-1">
        <p className="text-[11px] font-bold text-foreground truncate leading-tight">{card.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{card.setName}</p>
        <p className="text-[10px] text-muted-foreground truncate">{card.rarity || card.productType || '—'}</p>
        <div className="flex items-center justify-between pt-0.5 mt-auto">
          <p className={cn('text-sm font-black tabular-nums', priceColorClass)}>${card.current.toFixed(2)}</p>
          <p className="text-[10px] tabular-nums text-muted-foreground">Prev: ${card.previousPrice.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Card Table Row ── */
function CardTableRow({ card, index, onClick, priceColorClass = 'text-success' }: { card: MoverCard; index: number; onClick: () => void; priceColorClass?: string }) {
  const isUp = card.pctChange >= 0;
  return (
    <tr onClick={onClick} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {card.imageUrl && <img src={card.imageUrl} alt={card.name} className="w-14 h-20 object-contain rounded shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          <div className="min-w-0">
            <p className="font-semibold truncate max-w-[200px] group-hover:text-accent transition-colors">{card.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{card.rarity || 'Unknown'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell"><p className="text-sm font-medium truncate max-w-[200px]">{card.setName}</p></td>
      <td className="px-4 py-3 text-right"><span className={cn('font-bold tabular-nums', priceColorClass)}>${card.current.toFixed(2)}</span></td>
      <td className="px-4 py-3 text-right hidden md:table-cell"><span className="tabular-nums text-muted-foreground">${card.previousPrice.toFixed(2)}</span></td>
      <td className="px-4 py-3 text-right">
        <span className={cn('inline-block px-3 py-1.5 rounded-lg font-extrabold tabular-nums text-sm', isUp ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
          {isUp ? '+' : ''}{card.pctChange.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <WatchlistButton card={{ card_id: card.card_id, name: card.name, set_name: card.setName, product_type: card.productType, tcgplayer_id: card.tcgplayerId, rarity: card.rarity }} />
      </td>
    </tr>
  );
}

const DEFAULT_VISIBLE = 6;

/* ── Section Row (Gainers or Downtrend) ── */
function SectionRow({ title, icon: Icon, cards, viewMode, timePeriodLabel, navigate, colorClass, priceColorClass = 'text-success' }: {
  title: string; icon: React.ElementType; cards: MoverCard[]; viewMode: ViewMode; timePeriodLabel: string; navigate: (path: string) => void; colorClass: string; priceColorClass?: string;
}) {
  const [visibleCount, setVisibleCount] = React.useState(DEFAULT_VISIBLE);
  const visibleCards = cards.slice(0, visibleCount);
  const hasMore = visibleCount < cards.length;

  if (cards.length === 0) return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-4 h-4', colorClass)} />
        <span className={cn('text-sm font-bold', colorClass)}>{title}</span>
        <Badge variant="secondary" className="text-[10px]">0</Badge>
      </div>
      <p className="text-xs text-muted-foreground text-center py-6">No cards found</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-4 h-4', colorClass)} />
        <span className={cn('text-sm font-bold', colorClass)}>{title}</span>
        <Badge variant="secondary" className="text-[10px]">{cards.length}</Badge>
      </div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 auto-rows-fr">
          {visibleCards.map((card, i) => (
            <CardGridItem key={card.id} card={card} index={i} onClick={() => navigate(`/buylist/mover/${card.tcgplayerId || card.card_id}`)} priceColorClass={priceColorClass} />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Card</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Set</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell whitespace-nowrap">Previous</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">% Chg</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {visibleCards.map((card, i) => (
                  <CardTableRow key={card.id} card={card} index={i} onClick={() => navigate(`/buylist/mover/${card.tcgplayerId || card.card_id}`)} priceColorClass={priceColorClass} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center pt-3">
          <button
            onClick={() => setVisibleCount(prev => prev + 5)}
            className="px-5 py-2 rounded-lg text-xs font-semibold border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            Load More ({cards.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Scan Results Grid (3 cols, flat list with + to add to pending list) ── */
function ScanResultsGrid({ cards, navigate, onAddCard, addedCardIds }: { cards: MoverCard[]; navigate: (path: string) => void; onAddCard?: (card: MoverCard) => void; addedCardIds?: Set<string> }) {
  const [visibleCount, setVisibleCount] = React.useState(6);
  const visible = cards.slice(0, visibleCount);
  const hasMore = visibleCount < cards.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="text-[10px]">{cards.length} results</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((card, i) => {
          const isUp = card.pctChange >= 0;
          const isAdded = addedCardIds?.has(card.card_id);
          return (
            <div key={card.id} onClick={() => navigate(`/buylist/mover/${card.tcgplayerId || card.card_id}`)} className="glass-card p-4 rounded-xl hover:border-primary/30 transition-all text-left group relative cursor-pointer">
              <span className="absolute top-2 left-2 w-6 h-6 rounded-md bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">#{i + 1}</span>
              <div className="absolute top-2 right-2 z-10" onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!isAdded) onAddCard?.(card); }}>
                <button
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    isAdded ? 'text-success bg-success/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                  title={isAdded ? 'Added' : 'Add to list'}
                  disabled={isAdded}
                >
                  {isAdded ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex flex-col items-center pt-6 pb-2">
                {card.imageUrl && (
                  <img src={card.imageUrl} alt={card.name} className="w-24 h-32 object-contain rounded-lg mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className={cn('px-3 py-1.5 rounded-lg text-lg font-extrabold tabular-nums text-center mb-2', isUp ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')}>
                  {isUp ? '+' : ''}{card.pctChange.toFixed(1)}%
                </div>
                <p className="text-sm font-bold truncate w-full text-center">{card.name}</p>
                <p className="text-[10px] text-muted-foreground truncate w-full text-center">{card.setName}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn('text-sm font-bold tabular-nums', isUp ? 'text-success' : 'text-yellow-400')}>${card.current.toFixed(2)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">${card.previousPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button onClick={() => setVisibleCount(prev => prev + 6)} className="px-5 py-2 rounded-lg text-xs font-semibold border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-colors">
            Load More ({cards.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

/* ── User Watchlist Content (shows cards stored in this specific list, displayed like built-in categories) ── */
function UserWatchlistContent({ watchlist, viewMode, timePeriod, navigate, onEdit, onDelete }: {
  watchlist: UserWatchlist;
  viewMode: ViewMode;
  timePeriod: TimePeriod;
  navigate: (path: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [cards, setCards] = React.useState<MoverCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  const cardIds = (watchlist.filters as any)?.cardIds as string[] | undefined;
  const timePeriodLabel = timePeriod === '7d' ? '7D' : timePeriod === '30d' ? '30D' : '90D';

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!cardIds || cardIds.length === 0) { setCards([]); setLoading(false); return; }

      const select = 'id,card_id,name,set_name,number,rarity,tcgplayer_id,price,price_change_7d,price_change_30d,price_change_90d,product_type,min_price_7d,max_price_7d,min_price_30d,max_price_30d,trend_slope_30d,cov_price_30d,snapshot_date,synced_at,image_url,listings';
      const { data: snapshots } = await supabase.from('market_snapshots').select(select).in('card_id', cardIds);
      if (cancelled) return;

      const mapped = (snapshots || []).map((r: any) => toMoverCard(r as SnapshotRow, timePeriod));
      setCards(dedup(mapped));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [watchlist.id, timePeriod, cardIds]);

  if (loading) return (
    <div className="flex items-center justify-center gap-3 py-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading list…</span>
    </div>
  );

  const gainers = cards.filter(c => c.pctChange >= 0).sort((a, b) => b.pctChange - a.pctChange);
  const downtrend = cards.filter(c => c.pctChange < 0).sort((a, b) => a.pctChange - b.pctChange);

  return (
    <div className="space-y-6">
      {/* Header with edit + trash */}
      <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-bold">{watchlist.name}</h2>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors" title="Edit list">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="Delete list">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <Badge variant="secondary" className="text-xs">{cards.length} cards</Badge>
      </div>

      {cards.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <SlidersHorizontal className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No cards in this list yet. Click <Edit2 className="w-3.5 h-3.5 inline" /> to add cards.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionRow title="▲ Top Gainers" icon={TrendingUp} cards={gainers} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-success" priceColorClass="text-success" />
           <SectionRow title="▼ Top Downtrend" icon={TrendingDown} cards={downtrend} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-destructive" priceColorClass="text-yellow-400" />
        </div>
      ) : (
        <div className="space-y-8">
          <SectionRow title="▲ Top Gainers" icon={TrendingUp} cards={gainers} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-success" priceColorClass="text-success" />
          <SectionRow title="▼ Top Downtrend" icon={TrendingDown} cards={downtrend} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-destructive" priceColorClass="text-yellow-400" />
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */

export default function MarketMoversCategories() {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('raw');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categoryData, setCategoryData] = useState<Record<string, { gainers: MoverCard[]; downtrend: MoverCard[] }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [totalCards, setTotalCards] = useState<number | null>(null);
  const [gameFilter, setGameFilter] = useState<'all' | 'Pokemon' | 'One Piece'>('Pokemon');
  const cacheRef = useRef<Record<string, Record<string, { gainers: MoverCard[]; downtrend: MoverCard[] }>>>({});

  // Custom scan results (flat list, no split)
  const [scanResults, setScanResults] = useState<MoverCard[]>([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [customFilters, setCustomFilters] = useState<ScannerFilters>(DEFAULT_FILTERS);
  const [customKeyword, setCustomKeyword] = useState('');

  // User watchlists state
  const [userWatchlists, setUserWatchlists] = useState<UserWatchlist[]>([]);
  const [newListName, setNewListName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [session, setSession] = useState<any>(null);
  // Pending cards for Create Your Own (added via + before saving)
  const [pendingCards, setPendingCards] = useState<MoverCard[]>([]);
  // ID of existing watchlist being edited (null = creating new)
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);

  // Restore pending cards from session storage on mount
  useEffect(() => {
    const saved = loadPendingFromSession();
    if (saved.cards.length > 0) {
      setPendingCards(saved.cards);
      setNewListName(saved.name);
      setEditingWatchlistId(saved.editingId);
      setSelectedCategory('custom');
    }
  }, []);

  // Persist pending cards to session storage whenever they change
  useEffect(() => {
    if (selectedCategory === 'custom') {
      savePendingToSession(pendingCards, newListName, editingWatchlistId);
    }
  }, [pendingCards, newListName, editingWatchlistId, selectedCategory]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Load user watchlists
  const loadUserWatchlists = useCallback(async () => {
    if (!session?.user) { setUserWatchlists([]); return; }
    const { data } = await supabase
      .from('user_watchlists')
      .select('*')
      .order('position', { ascending: true });
    setUserWatchlists((data ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      filters: d.filters as ScannerFilters & { cardIds?: string[] },
      position: d.position,
    })));
  }, [session]);

  useEffect(() => { loadUserWatchlists(); }, [loadUserWatchlists]);

  const fetchAll = useCallback(async (period: TimePeriod) => {
    const cacheKey = `${period}_${gameFilter}`;
    if (cacheRef.current[cacheKey]) {
      setCategoryData(cacheRef.current[cacheKey]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const changeCol = getChangeCol(period);
      const select = 'id,card_id,name,set_name,number,rarity,tcgplayer_id,price,price_change_7d,price_change_30d,price_change_90d,product_type,min_price_7d,max_price_7d,min_price_30d,max_price_30d,trend_slope_30d,cov_price_30d,snapshot_date,synced_at,image_url,listings';

      const minListings = period === '7d' ? 2 : period === '30d' ? 5 : 10;
      const listingsFilter = `listings.is.null,listings.gt.${minListings}`;
      const greatestHitsNames = gameFilter === 'One Piece'
        ? ['luffy', 'shanks', 'kaido', 'zoro']
        : ['charizard', 'umbreon', 'lugia', 'rayquaza'];
      const nameFilter = greatestHitsNames.map(n => `name.ilike.%${n}%`).join(',');

      // Dynamic gain cap: 7d=50%, 30d=150%, 90d=250%
      const gainCap = period === '90d' ? 250 : period === '30d' ? 150 : 50;

      // Helper to apply game filter to a query builder
      const gf = (q: any) => gameFilter !== 'all' ? q.eq('game', gameFilter) : q;

      const [rawGainRes, rawPullRes, sealGainRes, sealPullRes, ghGainRes, ghPullRes, promoGainRes, promoPullRes, countRes] = await Promise.all([
        gf(supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).gt('price', 5).or(listingsFilter).eq('product_type', 'card').not('printing', 'ilike', '%reverse%').gt(changeCol, 0).lte(changeCol, gainCap)).order(changeCol, { ascending: false }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).gt('price', 5).or(listingsFilter).eq('product_type', 'card').not('printing', 'ilike', '%reverse%').lt(changeCol, 0).gte(changeCol, -35)).order(changeCol, { ascending: true }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).gt('price', 5).or(listingsFilter).eq('product_type', 'sealed').gt(changeCol, 0).lte(changeCol, gainCap)).order(changeCol, { ascending: false }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).gt('price', 5).or(listingsFilter).eq('product_type', 'sealed').lt(changeCol, 0).gte(changeCol, -35)).order(changeCol, { ascending: true }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).gt('price', 50).or(nameFilter).not(changeCol, 'is', null).not('printing', 'ilike', '%reverse%').gt(changeCol, 0).lte(changeCol, gainCap)).order(changeCol, { ascending: false }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).gt('price', 50).or(nameFilter).not(changeCol, 'is', null).not('printing', 'ilike', '%reverse%').lt(changeCol, 0).gte(changeCol, -35)).order(changeCol, { ascending: true }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).gt('price', 3).eq('rarity', 'Promo').not('printing', 'ilike', '%reverse%').gt(changeCol, 0).lte(changeCol, gainCap)).order(changeCol, { ascending: false }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).gt('price', 3).eq('rarity', 'Promo').not('printing', 'ilike', '%reverse%').lt(changeCol, 0).gte(changeCol, -35)).order(changeCol, { ascending: true }).limit(LIMIT),
        gf(supabase.from('market_snapshots').select('id', { count: 'exact', head: true }).gt('price', 0)),
      ]);

      const map = (res: any) => (res.data || []).map((r: any) => toMoverCard(r as SnapshotRow, period));

      if (rawGainRes.data?.[0]) setLastSynced((rawGainRes.data[0] as SnapshotRow).synced_at);
      setTotalCards(countRes.count ?? null);

      const results: Record<string, { gainers: MoverCard[]; downtrend: MoverCard[] }> = {
        raw: { gainers: dedup(map(rawGainRes)), downtrend: dedup(map(rawPullRes)) },
        sealed: { gainers: dedup(map(sealGainRes)), downtrend: dedup(map(sealPullRes)) },
        greatest_hits: { gainers: dedupByName(dedup(map(ghGainRes))), downtrend: dedupByName(dedup(map(ghPullRes))) },
        promo: { gainers: dedupByName(dedup(map(promoGainRes))), downtrend: dedupByName(dedup(map(promoPullRes))) },
      };

      cacheRef.current[`${period}_${gameFilter}`] = results;
      setCategoryData(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [gameFilter]);

  const fetchCustom = useCallback(async (f: ScannerFilters, period: TimePeriod, keyword?: string) => {
    setCustomLoading(true);
    try {
      const changeCol = getChangeCol(period);
      const select = 'id,card_id,name,set_name,number,rarity,tcgplayer_id,price,price_change_7d,price_change_30d,price_change_90d,product_type,min_price_7d,max_price_7d,min_price_30d,max_price_30d,trend_slope_30d,cov_price_30d,snapshot_date,synced_at,image_url,listings';

      let q = supabase.from('market_snapshots').select(select).not(changeCol, 'is', null).not('price', 'is', null).gte('price', 1);
      if (f.type === 'cards') q = q.eq('product_type', 'card');
      else if (f.type === 'sealed') q = q.eq('product_type', 'sealed');
      if (f.price === 'under10') q = q.lt('price', 10);
      else if (f.price === '10to50') q = q.gte('price', 10).lt('price', 50);
      else if (f.price === '50to100') q = q.gte('price', 50).lt('price', 100);
      else if (f.price === '100to400') q = q.gte('price', 100).lt('price', 400);
      else if (f.price === '400plus') q = q.gte('price', 400);
      if (keyword && keyword.trim()) q = q.ilike('name', `%${keyword.trim()}%`);
      // Sort by absolute change magnitude
      q = q.order(changeCol, { ascending: false }).limit(30);

      const { data } = await q;
      const mapped = (data || []).map((r: any) => toMoverCard(r as SnapshotRow, period));
      setScanResults(dedup(mapped));
    } catch { /* silent */ } finally {
      setCustomLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(timePeriod); }, [timePeriod, fetchAll, gameFilter]);

  const isBuiltIn = BUILT_IN_CATEGORIES.some(c => c.key === selectedCategory);
  const isCustomNew = selectedCategory === 'custom';
  const isUserWatchlist = !isBuiltIn && !isCustomNew;

  const currentData = (categoryData[selectedCategory] || { gainers: [], downtrend: [] });

  const timePeriodLabel = timePeriod === '7d' ? '7D' : timePeriod === '30d' ? '30D' : '90D';

  // Add card to pending list (Create Your Own flow)
  const handleAddPendingCard = (card: MoverCard) => {
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    setPendingCards(prev => {
      if (prev.some(c => c.card_id === card.card_id)) return prev;
      return [...prev, card];
    });
  };

  // Remove from pending
  const handleRemovePending = (cardId: string) => {
    setPendingCards(prev => prev.filter(c => c.card_id !== cardId));
  };

  // Save pending cards as a new watchlist or update existing
  const handleSaveWatchlist = async () => {
    if (!session?.user) {
      navigate('/auth');
      return;
    }
    if (pendingCards.length === 0) return;
    const name = newListName.trim() || 'My List';

    if (editingWatchlistId) {
      // Update existing watchlist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('user_watchlists').update({
        name,
        filters: { cardIds: pendingCards.map(c => c.card_id) } as any,
      } as any).eq('id', editingWatchlistId);
    } else {
      // Create new watchlist
      const maxPos = userWatchlists.length > 0 ? Math.max(...userWatchlists.map(w => w.position)) + 1 : 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('user_watchlists').insert({
        user_id: session.user.id,
        name,
        filters: { cardIds: pendingCards.map(c => c.card_id) } as any,
        position: maxPos,
      } as any);
    }

    const savedEditingId = editingWatchlistId;
    setNewListName('');
    setPendingCards([]);
    setEditingWatchlistId(null);
    clearPendingSession();
    await loadUserWatchlists();
    // Switch to the saved/updated list
    if (savedEditingId) {
      setSelectedCategory(savedEditingId);
    }
  };

  // Edit an existing watchlist — load its cards into pending and switch to custom mode
  const handleEditWatchlist = async (wl: UserWatchlist) => {
    const cardIds = (wl.filters as any)?.cardIds as string[] | undefined;
    if (cardIds && cardIds.length > 0) {
      // Fetch the card data for the stored IDs
      const select = 'id,card_id,name,set_name,number,rarity,tcgplayer_id,price,price_change_7d,price_change_30d,price_change_90d,product_type,min_price_7d,max_price_7d,min_price_30d,max_price_30d,trend_slope_30d,cov_price_30d,snapshot_date,synced_at,image_url,listings';
      const { data: snapshots } = await supabase.from('market_snapshots').select(select).in('card_id', cardIds);
      const mapped = (snapshots || []).map((r: any) => toMoverCard(r as SnapshotRow, timePeriod));
      setPendingCards(dedup(mapped));
    } else {
      setPendingCards([]);
    }
    setNewListName(wl.name);
    setEditingWatchlistId(wl.id);
    setSelectedCategory('custom');
  };

  // Delete watchlist
  const handleDeleteWatchlist = async (id: string) => {
    await supabase.from('user_watchlists').delete().eq('id', id);
    if (selectedCategory === id) setSelectedCategory('raw');
    if (editingWatchlistId === id) {
      setEditingWatchlistId(null);
      setPendingCards([]);
      setNewListName('');
      clearPendingSession();
    }
    await loadUserWatchlists();
  };

  // Rename watchlist (inline in sidebar)
  const handleRenameWatchlist = async (id: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('user_watchlists').update({ name: editName } as any).eq('id', id);
    setEditingId(null);
    await loadUserWatchlists();
  };

  // Move watchlist up/down
  const handleMoveWatchlist = async (id: string, direction: 'up' | 'down') => {
    const idx = userWatchlists.findIndex(w => w.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= userWatchlists.length) return;
    const a = userWatchlists[idx];
    const b = userWatchlists[swapIdx];
    await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from('user_watchlists').update({ position: b.position } as any).eq('id', a.id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from('user_watchlists').update({ position: a.position } as any).eq('id', b.id),
    ]);
    await loadUserWatchlists();
  };

  // Cancel editing and go back
  const handleCancelEdit = () => {
    setPendingCards([]);
    setNewListName('');
    clearPendingSession();
    if (editingWatchlistId) {
      setSelectedCategory(editingWatchlistId);
    } else {
      setSelectedCategory('raw');
    }
    setEditingWatchlistId(null);
  };

  const addedCardIds = React.useMemo(() => new Set(pendingCards.map(c => c.card_id)), [pendingCards]);

  const selectedUserWatchlist = userWatchlists.find(w => w.id === selectedCategory);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Time Period + View Mode */}
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex gap-1.5 sm:gap-2">
          {(['7d', '30d', '90d'] as TimePeriod[]).map(period => (
            <button key={period} onClick={() => setTimePeriod(period)} className={cn(
              'px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all',
              timePeriod === period ? 'bg-foreground text-background shadow-md' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border/50'
            )}>
              {period === '7d' ? '7D' : period === '30d' ? '30D' : '90D'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {totalCards != null && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Database className="w-3 h-3 text-primary" /><span>{totalCards.toLocaleString()} cards indexed</span>
            </div>
          )}
          {lastSynced && <span className="text-[10px] text-muted-foreground hidden sm:inline">· Updated {formatDate(lastSynced)}</span>}
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 sm:p-2 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50')} title="Grid view"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={cn('p-1.5 sm:p-2 transition-colors', viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50')} title="Table view"><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Mobile: horizontal pill strip for categories */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {BUILT_IN_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.key;
            const IconComp = cat.icon;
            return (
              <button key={cat.key} onClick={() => setSelectedCategory(cat.key)} className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground border border-border/50'
              )}>
                <IconComp className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
          {userWatchlists.map(wl => {
            const isActive = selectedCategory === wl.id;
            return (
              <button key={wl.id} onClick={() => setSelectedCategory(wl.id)} className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                isActive ? 'bg-accent text-accent-foreground' : 'bg-muted/40 text-muted-foreground border border-border/50'
              )}>
                <SlidersHorizontal className="w-3 h-3" />
                {wl.name}
              </button>
            );
          })}
          <button onClick={() => { if (!session?.user) { window.location.href = '/auth'; return; } setSelectedCategory('custom'); setEditingWatchlistId(null); setPendingCards([]); setNewListName(''); clearPendingSession(); }} className={cn(
            'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
            isCustomNew ? 'bg-muted/60 text-foreground ring-1 ring-primary/30' : 'bg-muted/40 text-muted-foreground border border-border/50'
          )}>
            <Plus className="w-3 h-3" />
            CREATE
          </button>
        </div>

        {/* Mobile: pending cards summary when in custom mode */}
        {isCustomNew && pendingCards.length > 0 && (
          <div className="mt-2 glass-card rounded-lg p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{editingWatchlistId ? 'Cards' : 'Added'} ({pendingCards.length})</span>
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="List name…"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="h-6 text-[10px] w-24"
                />
                <button onClick={handleSaveWatchlist} className="px-2 py-1 rounded text-[10px] font-semibold bg-primary text-primary-foreground">
                  {editingWatchlistId ? 'Update' : 'Save'}
                </button>
                {editingWatchlistId && (
                  <button onClick={handleCancelEdit} className="px-2 py-1 rounded text-[10px] font-semibold text-muted-foreground border border-border/50">Cancel</button>
                )}
              </div>
            </div>
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {pendingCards.map(card => (
                <div key={card.card_id} className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/30 text-[10px]">
                  <span className="truncate max-w-[60px]">{card.name}</span>
                  <button onClick={() => handleRemovePending(card.card_id)} className="text-muted-foreground hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        {isCustomNew && pendingCards.length === 0 && editingWatchlistId && (
          <div className="mt-2">
            <button onClick={handleCancelEdit} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground border border-border/50">Cancel</button>
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-6">
        {/* Left Sidebar — desktop only */}
        <div className="hidden lg:block lg:w-72 shrink-0">
          <div className="glass-card rounded-xl p-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">Smart Lists</h3>
            <div className="space-y-1">
              {BUILT_IN_CATEGORIES.map(cat => {
                const isActive = selectedCategory === cat.key;
                const data = categoryData[cat.key];
                const count = data ? data.gainers.length + data.downtrend.length : 0;
                const IconComp = cat.icon;
                return (
                  <button key={cat.key} onClick={() => setSelectedCategory(cat.key)} className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/40'
                  )}>
                    <IconComp className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-primary')} />
                    <span className="flex-1 text-left">{cat.label}</span>
                    <Badge variant="secondary" className={cn('text-xs tabular-nums min-w-[28px] justify-center', isActive ? 'bg-primary-foreground/20 text-primary-foreground' : '')}>{count}</Badge>
                  </button>
                );
              })}

              {/* User's saved watchlists */}
              {userWatchlists.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                  {userWatchlists.map((wl, idx) => {
                    const isActive = selectedCategory === wl.id;
                    const cardCount = ((wl.filters as any)?.cardIds as string[] | undefined)?.length ?? 0;
                    return (
                      <div key={wl.id} className="group relative">
                        <button onClick={() => setSelectedCategory(wl.id)} className={cn(
                          'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all',
                          isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted/40'
                        )}>
                          <SlidersHorizontal className={cn('w-4 h-4 shrink-0', isActive ? 'text-accent-foreground' : 'text-accent')} />
                          {editingId === wl.id ? (
                            <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-7 text-xs"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameWatchlist(wl.id); }}
                                autoFocus
                              />
                              <button onClick={() => handleRenameWatchlist(wl.id)} className="p-1 hover:bg-muted/40 rounded"><Check className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <span className="flex-1 text-left truncate">{wl.name}</span>
                          )}
                          <Badge variant="secondary" className={cn('text-xs tabular-nums min-w-[28px] justify-center group-hover:opacity-0 transition-opacity', isActive ? 'bg-accent-foreground/20 text-accent-foreground' : '')}>{cardCount}</Badge>
                        </button>
                        {/* Action buttons on hover – replace badge position */}
                        <div className={cn('absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-card/90 rounded-md px-1', editingId === wl.id && '!hidden')}>
                          <button onClick={(e) => { e.stopPropagation(); handleMoveWatchlist(wl.id, 'up'); }} disabled={idx === 0} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move up"><ChevronUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleMoveWatchlist(wl.id, 'down'); }} disabled={idx === userWatchlists.length - 1} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move down"><ChevronDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleEditWatchlist(wl); }} className="p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground" title="Edit"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteWatchlist(wl.id); }} className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create Your Own */}
            <div className="mt-4 pt-4 border-t border-border/40">
              <button onClick={() => { if (!session?.user) { window.location.href = '/auth'; return; } setSelectedCategory('custom'); setEditingWatchlistId(null); setPendingCards([]); setNewListName(''); clearPendingSession(); }} className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all',
                isCustomNew ? 'bg-muted/60 text-foreground ring-1 ring-primary/30' : 'text-foreground hover:bg-muted/40'
              )}>
                <Plus className={cn('w-4 h-4 shrink-0', isCustomNew ? 'text-primary' : 'text-accent')} />
                <span className="flex-1 text-left">CREATE YOUR OWN</span>
              </button>

              {/* Pending cards list (shown when Create Your Own / Edit is active) */}
              {isCustomNew && pendingCards.length === 0 && !editingWatchlistId && (
                <p className="text-[10px] text-muted-foreground px-3 py-2 italic">Scan and add cards to build your list</p>
              )}
              {isCustomNew && pendingCards.length > 0 && (
                <div className="mt-2 space-y-1 px-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1">
                    {editingWatchlistId ? 'Cards' : 'Added'} ({pendingCards.length})
                  </p>
                  {pendingCards.map(card => (
                    <div key={card.card_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/20">
                      {card.imageUrl && <img src={card.imageUrl} alt="" className="w-6 h-8 object-contain rounded shrink-0" />}
                      <span className="text-xs font-medium truncate flex-1">{card.name}</span>
                      <button onClick={() => handleRemovePending(card.card_id)} className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0" title="Remove">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Save / Update watchlist */}
              {isCustomNew && pendingCards.length > 0 && (
                <div className="mt-3 px-1 space-y-2">
                  <Input
                    placeholder="Name your smart list…"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <button
                    onClick={handleSaveWatchlist}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {editingWatchlistId ? 'Update' : 'Save'} Smart List ({pendingCards.length} cards)
                  </button>
                  {editingWatchlistId && (
                    <button
                      onClick={handleCancelEdit}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
              {isCustomNew && pendingCards.length === 0 && editingWatchlistId && (
                <div className="mt-3 px-1">
                  <button
                    onClick={handleCancelEdit}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isCustomNew && (
            <div className="mb-3 sm:mb-6 space-y-2 sm:space-y-4">
              {editingWatchlistId && (
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <Edit2 className="w-4 h-4 text-accent" />
                  <span className="text-sm font-bold">Editing: {newListName || 'Untitled'}</span>
                </div>
              )}
              <MarketScannerBar
                filters={customFilters}
                onChange={setCustomFilters}
                onScan={() => fetchCustom(customFilters, timePeriod, customKeyword)}
                onClear={() => { setCustomFilters(DEFAULT_FILTERS); setCustomKeyword(''); setScanResults([]); }}
                isScanned={scanResults.length > 0}
                scanLabel="Scan"
                keyword={customKeyword}
                onKeywordChange={setCustomKeyword}
              />
            </div>
          )}

          {(loading || (isCustomNew && customLoading)) ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scanning {totalCards?.toLocaleString() || '30,000+'} cards…</span>
            </div>
          ) : error ? (
            <div className="glass-card p-8 text-center"><p className="text-sm text-muted-foreground">{error}</p></div>
          ) : isCustomNew ? (
            scanResults.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <SlidersHorizontal className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Set your filters above and click <strong>Scan</strong> to find cards</p>
              </div>
            ) : (
              <ScanResultsGrid cards={scanResults} navigate={navigate} onAddCard={handleAddPendingCard} addedCardIds={addedCardIds} />
            )
          ) : isUserWatchlist && selectedUserWatchlist ? (
            <UserWatchlistContent
              watchlist={selectedUserWatchlist}
              viewMode={viewMode}
              timePeriod={timePeriod}
              navigate={navigate}
              onEdit={() => handleEditWatchlist(selectedUserWatchlist)}
              onDelete={() => handleDeleteWatchlist(selectedUserWatchlist.id)}
            />
          ) : (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionRow title="▲ Top Gainers" icon={TrendingUp} cards={currentData.gainers} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-success" priceColorClass="text-success" />
                <SectionRow title="▼ Top Downtrend" icon={TrendingDown} cards={currentData.downtrend} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-destructive" priceColorClass="text-yellow-400" />
              </div>
            ) : (
              <div className="space-y-8">
                <SectionRow title="▲ Top Gainers" icon={TrendingUp} cards={currentData.gainers} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-success" priceColorClass="text-success" />
                <SectionRow title="▼ Top Downtrend" icon={TrendingDown} cards={currentData.downtrend} viewMode={viewMode} timePeriodLabel={timePeriodLabel} navigate={navigate} colorClass="text-destructive" priceColorClass="text-yellow-400" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
