import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, ExternalLink, TrendingUp, TrendingDown, Info, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculatePackEV, classifyPackEra, tcgPlayerUrl, type RarityPrice } from '@/lib/packEV';
import { cn } from '@/lib/utils';

interface PackRow {
  name: string;
  price: number;
  set_name: string;
  tcgplayer_id: string | null;
  ev: number;
  evRatio: number;
  era: 'modern' | 'legacy' | 'vintage';
}

const INITIAL_LIMIT = 15;
const STEP = 15;
type SortKey = 'price' | 'ev' | 'value' | 'set';

export default function PackPicker() {
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(INITIAL_LIMIT);
  const [sortBy, setSortBy] = useState<SortKey>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const cacheKey = 'pack-picker-v6-cache';
    let cancelled = false;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.packs?.length > 0 && Date.now() - parsed.cachedAt < 10 * 60 * 1000) {
          setPacks(parsed.packs);
          setLoading(false);
          return;
        }
      }
    } catch {}

    (async () => {
      const { data: setStats } = await supabase.rpc('get_set_stats');
      const mainSets = new Set(
        (setStats ?? [])
          .filter((s: any) => s.cards_count >= 20 && !/^misc|miscellaneous|league|promo/i.test(s.set_name))
          .map((s: any) => s.set_name)
      );

      const { data: cardData } = await supabase
        .from('market_snapshots')
        .select('set_name, rarity, price')
        .eq('product_type', 'card')
        .eq('game', 'Pokemon')
        .gt('price', 0)
        .not('rarity', 'is', null)
        .limit(40000);

      const rarityMap = new Map<string, Map<string, { sum: number; n: number }>>();
      for (const row of cardData ?? []) {
        if (!row.set_name || !row.rarity) continue;
        if (!mainSets.has(row.set_name)) continue;
        if (!rarityMap.has(row.set_name)) rarityMap.set(row.set_name, new Map());
        const inner = rarityMap.get(row.set_name)!;
        const prev = inner.get(row.rarity) ?? { sum: 0, n: 0 };
        inner.set(row.rarity, { sum: prev.sum + (row.price ?? 0), n: prev.n + 1 });
      }

      const { data } = await supabase
        .from('market_snapshots')
        .select('name, price, set_name, tcgplayer_id')
        .eq('product_type', 'sealed')
        .eq('game', 'Pokemon')
        .ilike('name', '%Booster Pack%')
        .gte('price', 5)
        .not('price', 'is', null)
        .not('set_name', 'is', null)
        .order('price', { ascending: true })
        .limit(800);

      if (!cancelled && data) {
        const bySet = new Map<string, PackRow>();
        for (const d of data) {
          if (!d.set_name || !mainSets.has(d.set_name)) continue;
          if (/sleeved/i.test(d.name)) continue;

          const rarityAgg = rarityMap.get(d.set_name);
          const rarityPrices: RarityPrice[] = rarityAgg
            ? Array.from(rarityAgg.entries()).map(([rarity, v]) => ({
                rarity,
                avg_price: v.sum / v.n,
                count: v.n,
              }))
            : [];
          const era = classifyPackEra(d.set_name);
          const ev = calculatePackEV(rarityPrices, era);
          const price = d.price ?? 0;

          const row: PackRow = {
            name: d.name,
            price,
            set_name: d.set_name,
            tcgplayer_id: d.tcgplayer_id,
            ev,
            evRatio: price > 0 ? ev / price : 0,
            era,
          };

          const existing = bySet.get(d.set_name);
          if (!existing || row.price < existing.price) {
            bySet.set(d.set_name, row);
          }
        }
        const deduped = Array.from(bySet.values()).sort((a, b) => a.price - b.price);

        setPacks(deduped);
        setLoading(false);
        sessionStorage.setItem(cacheKey, JSON.stringify({ packs: deduped, cachedAt: Date.now() }));
      }
    })();

    return () => { cancelled = true; };
  }, []);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'price' || key === 'set' ? 'asc' : 'desc');
    }
  }

  const sortedPacks = useMemo(() => {
    const arr = [...packs];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'price': return (a.price - b.price) * dir;
        case 'ev': return (a.ev - b.ev) * dir;
        case 'value': return (a.evRatio - b.evRatio) * dir;
        case 'set': return a.set_name.localeCompare(b.set_name) * dir;
      }
    });
    return arr;
  }, [packs, sortBy, sortDir]);

  const visiblePacks = sortedPacks.slice(0, visible);
  const hasMore = visible < sortedPacks.length;

  if (loading) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Loading packs…</span>
        </div>
      </div>
    );
  }

  const SortHeader = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: 'left' | 'right' }) => (
    <button
      onClick={() => toggleSort(k)}
      className={cn(
        'flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground transition-colors',
        align === 'right' && 'justify-end ml-auto'
      )}
    >
      {label}
      <ArrowUpDown className={cn('w-3 h-3 opacity-50', sortBy === k && 'opacity-100 text-primary')} />
    </button>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="glass-card rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 via-muted/30 to-transparent">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Pack Picker</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                Cheapest booster pack per main set · approx. EV from rarity pull rates · {packs.length} sets
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                    Prices come from JustTCG market data (lowest available variant). They can be lower than TCGplayer's "Market Price" (median) shown on listing pages. Always confirm on TCGplayer before buying.
                  </TooltipContent>
                </Tooltip>
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left"><SortHeader k="set" label="Set" /></th>
                <th className="px-3 py-2 text-right"><SortHeader k="price" label="Price" align="right" /></th>
                <th className="px-3 py-2 text-right"><SortHeader k="ev" label="EV" align="right" /></th>
                <th className="px-3 py-2 text-right"><SortHeader k="value" label="EV / Price" align="right" /></th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Buy</th>
              </tr>
            </thead>
            <tbody>
              {visiblePacks.map((pack) => {
                const profitable = pack.evRatio >= 1;
                const ratio = pack.evRatio;
                const ratioColor =
                  ratio >= 1.2 ? 'text-success' :
                  ratio >= 0.8 ? 'text-warning' :
                  'text-destructive';
                const cleanLabel = pack.set_name
                  .replace(/^(SV\d*|SWSH\d*|ME\d*|SM|XY|BW|DP)[\s:·-]+/i, '')
                  .trim();

                return (
                  <tr
                    key={pack.set_name}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-xs leading-tight">{cleanLabel}</p>
                      <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{pack.era} era</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-semibold tabular-nums text-sm">${pack.price.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={cn('font-semibold tabular-nums text-sm cursor-help', ratioColor)}>
                            {pack.ev > 0 ? `$${pack.ev.toFixed(2)}` : '—'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[220px] text-xs">
                          <p className="font-semibold">Approximate Expected Value</p>
                          <p className="text-muted-foreground text-[10px] mt-0.5">
                            Estimated avg pack contents using approximate pull rates ({pack.era} era) and current market prices for each rarity. Approximation only.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {pack.ev > 0 ? (
                        <div className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums',
                          profitable
                            ? 'bg-success/10 text-success'
                            : 'bg-muted/40 text-muted-foreground'
                        )}>
                          {profitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {(ratio * 100).toFixed(0)}%
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <a
                        href={tcgPlayerUrl(pack.tcgplayer_id, pack.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        TCGplayer <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisible(v => Math.min(v + STEP, sortedPacks.length))}
            >
              Load more ({sortedPacks.length - visible} remaining)
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
