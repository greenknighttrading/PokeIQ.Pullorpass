import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Loader2, TrendingUp, TrendingDown, Flame, ArrowUpDown, ArrowUp, ArrowDown, Layers, ChevronLeft, ChevronDown, X } from 'lucide-react';
import { SetValueChart } from './SetValueChart';

/* ── Types ── */

interface SetData {
  id: string;
  name: string;
  release_date: string | null;
  cards_count: number;
  sealed_count: number;
  set_value_usd: number;
  set_value_change_7d_pct: number | null;
  set_value_change_30d_pct: number | null;
  set_value_change_90d_pct: number | null;
}

interface SetCard {
  id: string;
  name: string;
  set_name: string;
  rarity: string | null;
  image_url: string | null;
  variants?: {
    condition: string;
    price: number;
    priceChange24hr?: number;
    priceChange7d?: number;
    priceChange30d?: number;
    statistics?: Record<string, { price_change_pct?: number }>;
  }[];
}

type SortKey = 'rank' | 'name' | 'value' | '7d' | '30d' | '90d' | 'trend';
type SortDir = 'asc' | 'desc';

/* ── Trend Signal Engine ── */

function calcTrendScore(pct7d: number | null, pct30d: number | null, pct90d: number | null, pct24h?: number | null): number {
  const p90 = pct90d ?? 0;
  const p30 = pct30d ?? 0;
  const p7 = pct7d ?? 0;
  const p24 = pct24h ?? 0;

  // 90-Day (max 40)
  const s90 = p90 > 20 ? 40 : p90 > 10 ? 30 : p90 > 0 ? 20 : p90 > -10 ? 10 : 0;
  // 30-Day (max 30)
  const s30 = p30 > 15 ? 30 : p30 > 5 ? 22 : p30 > 0 ? 15 : p30 > -10 ? 5 : 0;
  // 7-Day (max 20)
  const s7 = p7 > 5 ? 20 : p7 > 0 ? 15 : p7 > -5 ? 5 : 0;
  // 24h (max 10)
  const s24 = p24 > 0 ? 10 : 0;

  return s90 + s30 + s7 + s24;
}

function getTrendColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 45) return 'yellow';
  return 'red';
}

const barColorMap = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
} as const;

function TrendBar({ pct7d, pct30d, pct90d, pct24h }: { pct7d: number | null; pct30d: number | null; pct90d: number | null; pct24h?: number | null }) {
  const score = calcTrendScore(pct7d, pct30d, pct90d, pct24h);
  const color = getTrendColor(score);
  return <div className={cn('w-1 rounded-full self-stretch min-h-[28px]', barColorMap[color])} />;
}

function TrendSummary({ items }: { items: { pct7d: number | null; pct30d: number | null; pct90d: number | null; pct24h?: number | null }[] }) {
  let buy = 0, hold = 0, weak = 0;
  items.forEach(i => {
    const c = getTrendColor(calcTrendScore(i.pct7d, i.pct30d, i.pct90d, i.pct24h));
    if (c === 'green') buy++; else if (c === 'yellow') hold++; else weak++;
  });
  return (
    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />Buy Trend ({buy})</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" />Hold Trend ({hold})</span>
      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />Weak Trend ({weak})</span>
    </div>
  );
}

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  const positive = value >= 0;
  return (
    <span className={cn(
      'text-xs font-semibold tabular-nums flex items-center gap-1',
      positive ? 'text-success' : 'text-destructive'
    )}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}

function SortHeader({ label, sortKey, currentSort, currentDir, onSort }: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        currentDir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

/* ── Set Detail Drill-Down ── */

const SET_DETAIL_PAGE_SIZE = 5;

function SetDetail({ set, onBack }: { set: SetData; onBack: () => void }) {
  const [cards, setCards] = useState<SetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState(SET_DETAIL_PAGE_SIZE);

  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      try {
        // Try live API first
        const { data } = await supabase.functions.invoke('justtcg', {
          body: { action: 'getBySet', set: set.id, limit: 50 },
        });
        const items = Array.isArray(data?.data) ? data.data : [];
        if (items.length > 0) {
          items.sort((a: any, b: any) => {
            const priceA = a?.variants?.[0]?.price ?? 0;
            const priceB = b?.variants?.[0]?.price ?? 0;
            return priceB - priceA;
          });
          setCards(items);
          setLoading(false);
          return;
        }
      } catch { /* fall through to DB */ }

      // Fallback: load from market_snapshots
      try {
        const { data: rows } = await supabase
          .from('market_snapshots')
          .select('card_id, name, set_name, rarity, image_url, price, price_change_24h, price_change_7d, price_change_30d, price_change_90d, condition, product_type')
          .eq('set_name', set.name)
          .gt('price', 0)
          .order('price', { ascending: false })
          .limit(50);
        if (rows) {
          setCards(rows.map((r: any) => ({
            id: r.card_id,
            name: r.name,
            set_name: r.set_name,
            rarity: r.rarity,
            image_url: r.image_url,
            variants: [{
              condition: r.condition ?? r.product_type ?? '',
              price: r.price ?? 0,
              priceChange24hr: r.price_change_24h,
              priceChange7d: r.price_change_7d,
              priceChange30d: r.price_change_30d,
              priceChange90d: r.price_change_90d,
            }],
          })));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchCards();
  }, [set.name]);

  const getCardPrice = (c: SetCard) => c.variants?.[0]?.price ?? 0;
  const getCondition = (c: SetCard) => c.variants?.[0]?.condition ?? '';
  const isSealed = (c: SetCard) => {
    const cond = getCondition(c).toLowerCase();
    return cond === 'sealed';
  };
  const getPct24h = (c: SetCard) => c.variants?.[0]?.priceChange24hr ?? null;
  const getPct7d = (c: SetCard) => c.variants?.[0]?.priceChange7d ?? null;
  const getPct30d = (c: SetCard) => c.variants?.[0]?.priceChange30d ?? null;
  const getPct90d = (c: SetCard) => (c.variants?.[0] as any)?.priceChange90d ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate">{set.name}</h2>
          <p className="text-xs text-muted-foreground">
            Top 50 by value · ${set.set_value_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
          </p>
        </div>
        <TrendBar pct7d={set.set_value_change_7d_pct} pct30d={set.set_value_change_30d_pct} pct90d={set.set_value_change_90d_pct} />
      </div>

      {/* Set Value Chart */}
      <SetValueChart setName={set.name} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading cards…</span>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <TrendSummary items={cards.map(c => ({ pct7d: getPct7d(c), pct30d: getPct30d(c), pct90d: getPct90d(c), pct24h: getPct24h(c) }))} />
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[6px_40px_1fr_110px_75px_75px_75px_75px] gap-2 items-center px-4 py-3 bg-muted/30 border-b border-border">
            <span />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Card</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">24H %</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">7D %</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">30D %</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">90D %</span>
          </div>

          <div className="divide-y divide-border">
            {cards.slice(0, visibleCards).map((card, idx) => {
              const price = getCardPrice(card);
              const pct24h = getPct24h(card);
              const pct7d = getPct7d(card);
              const pct30d = getPct30d(card);
              const pct90d = getPct90d(card);
              const sealed = isSealed(card);
              return (
                <div key={card.id} className="grid grid-cols-[6px_40px_1fr_110px_75px_75px_75px_75px] gap-2 items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <TrendBar pct7d={pct7d} pct30d={pct30d} pct90d={pct90d} pct24h={pct24h} />
                  <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{card.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {card.set_name}{card.rarity ? ` — ${card.rarity}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    {sealed && <p className="text-[10px] text-muted-foreground font-medium">Sealed</p>}
                  </div>
                  <div><ChangeCell value={pct24h} /></div>
                  <div><ChangeCell value={pct7d} /></div>
                  <div><ChangeCell value={pct30d} /></div>
                  <div><ChangeCell value={pct90d} /></div>
                </div>
              );
            })}
          </div>

          {visibleCards < cards.length && (
            <button
              onClick={() => setVisibleCards(v => v + SET_DETAIL_PAGE_SIZE)}
              className="w-full py-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-t border-border/40 hover:bg-muted/20"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Load More ({cards.length - visibleCards} remaining)
            </button>
          )}

          {cards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No cards found for this set.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */

export default function SetsExplorer({ initialLimit }: { initialLimit?: number } = {}) {
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [hotOnly, setHotOnly] = useState(false);
  const [selectedSet, setSelectedSet] = useState<SetData | null>(null);
  const [visibleCount, setVisibleCount] = useState(initialLimit ?? 999);

  useEffect(() => {
    async function fetchSets() {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke('justtcg', {
          body: { action: 'getSets' },
        });
        const items: SetData[] = Array.isArray(data?.data) ? data.data : [];
        setSets(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sets');
      } finally {
        setLoading(false);
      }
    }
    fetchSets();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = sets.filter(s => s.set_value_usd >= 1000);
    // Remove miscellaneous/generic sets
    result = result.filter(s => !/^misc/i.test(s.name) && !/miscellaneous/i.test(s.name));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }
    if (hotOnly) {
      result = result.filter(s =>
        (s.set_value_change_7d_pct ?? 0) > 2 ||
        (s.set_value_change_30d_pct ?? 0) > 5 ||
        (s.set_value_change_90d_pct ?? 0) > 10
      );
    }
    result.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case 'name': return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        case 'value': av = a.set_value_usd; bv = b.set_value_usd; break;
        case '7d': av = a.set_value_change_7d_pct ?? -999; bv = b.set_value_change_7d_pct ?? -999; break;
        case '30d': av = a.set_value_change_30d_pct ?? -999; bv = b.set_value_change_30d_pct ?? -999; break;
        case '90d': av = a.set_value_change_90d_pct ?? -999; bv = b.set_value_change_90d_pct ?? -999; break;
        case 'trend': {
          av = calcTrendScore(a.set_value_change_7d_pct, a.set_value_change_30d_pct, a.set_value_change_90d_pct);
          bv = calcTrendScore(b.set_value_change_7d_pct, b.set_value_change_30d_pct, b.set_value_change_90d_pct);
          break;
        }
        default: av = a.set_value_usd; bv = b.set_value_usd;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return result;
  }, [sets, search, sortKey, sortDir, hotOnly]);

  const avgValue = filtered.length > 0
    ? Math.round(filtered.reduce((s, x) => s + x.set_value_usd, 0) / filtered.length)
    : 0;

  const isHot = (s: SetData) =>
    (s.set_value_change_7d_pct ?? 0) > 2 ||
    (s.set_value_change_30d_pct ?? 0) > 5;

  // Drill-down view
  if (selectedSet) {
    return <SetDetail set={selectedSet} onBack={() => setSelectedSet(null)} />;
  }

  return (
    <div className="space-y-4">

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading sets…</span>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-destructive">{error}</div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          {/* Info bar – desktop: single row; mobile: stacked */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 border-b border-border/40 flex-wrap bg-muted/30">
            <span className="text-xs text-muted-foreground font-medium">{filtered.length} sets</span>
            <span className="text-xs text-muted-foreground">Avg. value ${avgValue.toLocaleString()}</span>
            <div className="relative max-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sets..."
                className="pl-7 h-7 text-xs"
              />
            </div>
            <Button
              variant={hotOnly ? 'default' : 'outline'}
              size="sm"
              className="gap-1 text-[10px] h-6 px-2"
              onClick={() => setHotOnly(!hotOnly)}
            >
              <Flame className="w-3 h-3" />
              Hot
            </Button>
            <span className="ml-auto" />
            <TrendSummary items={filtered.map(s => ({ pct7d: s.set_value_change_7d_pct, pct30d: s.set_value_change_30d_pct, pct90d: s.set_value_change_90d_pct }))} />
          </div>

          {/* Mobile info bar */}
          <div className="sm:hidden border-b border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search sets..."
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant={hotOnly ? 'default' : 'outline'}
                size="sm"
                className="gap-1 text-xs h-9 px-3"
                onClick={() => setHotOnly(!hotOnly)}
              >
                <Flame className="w-3.5 h-3.5" />
                Hot
              </Button>
            </div>
          </div>

          {/* Desktop: Column headers with sort */}
          <div className="hidden sm:grid grid-cols-[6px_50px_1fr_110px_75px_75px_75px] gap-2 items-center px-4 py-2 border-b border-border">
            <span />
            <SortHeader label="#" sortKey="rank" currentSort={sortKey} currentDir={sortDir} onSort={() => { setSortKey('value'); setSortDir('desc'); }} />
            <SortHeader label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="Value" sortKey="value" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="7D" sortKey="7d" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="30D" sortKey="30d" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
            <SortHeader label="90D" sortKey="90d" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
          </div>

          {/* Desktop: Table rows */}
          <div className="hidden sm:block divide-y divide-border">
            {filtered.slice(0, visibleCount).map((set, idx) => (
              <div
                key={set.id}
                onClick={() => setSelectedSet(set)}
                className="grid grid-cols-[6px_50px_1fr_110px_75px_75px_75px] gap-2 items-center px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer border-b border-border last:border-b-0"
              >
                <TrendBar pct7d={set.set_value_change_7d_pct} pct30d={set.set_value_change_30d_pct} pct90d={set.set_value_change_90d_pct} />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground font-medium">{idx + 1}</span>
                  {isHot(set) && <Flame className="w-3.5 h-3.5 text-warning" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{set.name}</p>
                  {set.release_date && (
                    <p className="text-[10px] text-muted-foreground">Released: {new Date(set.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold tabular-nums">${set.set_value_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-[10px] text-muted-foreground">{set.cards_count + set.sealed_count} items</p>
                </div>
                <div><ChangeCell value={set.set_value_change_7d_pct} /></div>
                <div><ChangeCell value={set.set_value_change_30d_pct} /></div>
                <div><ChangeCell value={set.set_value_change_90d_pct} /></div>
              </div>
            ))}
          </div>

          {/* Mobile: Card list */}
          <div className="sm:hidden divide-y divide-border">
            {filtered.slice(0, visibleCount).map((set, idx) => (
              <div
                key={set.id}
                onClick={() => setSelectedSet(set)}
                className="px-3 py-3 hover:bg-muted/20 transition-colors cursor-pointer active:bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TrendBar pct7d={set.set_value_change_7d_pct} pct30d={set.set_value_change_30d_pct} pct90d={set.set_value_change_90d_pct} />
                  <span className="text-xs text-muted-foreground font-medium shrink-0">#{idx + 1}</span>
                  <p className="text-sm font-semibold truncate flex-1 min-w-0">{set.name}</p>
                  {isHot(set) && <Flame className="w-3.5 h-3.5 text-warning shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-1 ml-5">
                  <span className="text-sm font-bold tabular-nums">${set.set_value_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="text-[10px] text-muted-foreground">· {set.cards_count + set.sealed_count} items</span>
                  {set.release_date && (
                    <span className="text-[10px] text-muted-foreground">· {new Date(set.release_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 ml-5">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">7D</span>
                    <ChangeCell value={set.set_value_change_7d_pct} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">30D</span>
                    <ChangeCell value={set.set_value_change_30d_pct} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">90D</span>
                    <ChangeCell value={set.set_value_change_90d_pct} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {visibleCount < filtered.length && (
            <button
              onClick={() => setVisibleCount(v => v + (initialLimit ?? 20))}
              className="w-full py-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-t border-border/40 hover:bg-muted/20"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Load More Sets
            </button>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No sets found.</div>
          )}
        </div>
      )}
    </div>
  );
}
