import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { pptApi } from '@/hooks/usePokemonPriceTracker';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { SetSelector } from '@/components/tools/SetSelector';
import { ComparisonChart, PricePoint } from '@/components/tools/ComparisonChart';
import { UndervaluedVerdict } from '@/components/tools/UndervaluedVerdict';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Seo } from '@/components/seo/Seo';



interface SnapshotRow {
  card_id: string;
  name: string;
  price: number | null;
  price_change_7d: number | null;
  price_change_30d: number | null;
  price_change_90d: number | null;
  product_type: string;
  tcgplayer_id: string | null;
  image_url: string | null;
  rarity: string | null;
}

export default function SealedVsCards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSet, setSelectedSet] = useState<string | null>(searchParams.get('set'));

  // Persist selected set in URL
  useEffect(() => {
    if (selectedSet) {
      setSearchParams({ set: selectedSet }, { replace: true });
    }
  }, [selectedSet, setSearchParams]);

  // Step 1: Get sealed + card snapshots for the selected set from DB
  const { data: snapshots, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['sealed-vs-cards-snapshots', selectedSet],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('card_id, name, price, price_change_7d, price_change_30d, price_change_90d, product_type, tcgplayer_id, image_url, rarity')
        .eq('set_name', selectedSet!)
        .gt('price', 0)
        .order('price', { ascending: false });

      if (error) throw error;
      return data as SnapshotRow[];
    },
    enabled: !!selectedSet,
    staleTime: 1000 * 60 * 10,
  });

  // Separate sealed and cards, deduplicate by tcgplayer_id
  const { sealedItems, topCards } = useMemo(() => {
    if (!snapshots) return { sealedItems: [], topCards: [] };

    const dedup = (items: SnapshotRow[]) => {
      const seen = new Set<string>();
      return items.filter(s => {
        const key = s.tcgplayer_id || s.card_id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const sealed = dedup(
      snapshots.filter(s => s.product_type === 'sealed')
    ).slice(0, 5);

    const cards = dedup(
      snapshots.filter(s => s.product_type === 'card')
    ).slice(0, 10);

    return { sealedItems: sealed, topCards: cards };
  }, [snapshots]);

  // Step 2: Fetch 180-day price history from PPT using tcgplayer_id
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['sealed-vs-cards-history', selectedSet,
      sealedItems.map(s => s.tcgplayer_id).join(','),
      topCards.map(c => c.tcgplayer_id).join(',')
    ],
    queryFn: async () => {
      // Build list of items with tcgplayer_ids to fetch history for
      const sealedWithId = sealedItems.filter(s => s.tcgplayer_id);
      const cardsWithId = topCards.filter(c => c.tcgplayer_id);

      console.log(`[SealedVsCards] Fetching history: ${sealedWithId.length} sealed, ${cardsWithId.length} cards`);

      if (sealedWithId.length === 0 && cardsWithId.length === 0) {
        return { sealed: [] as any[], cards: [] as any[] };
      }

      // Extract history from both card and sealed PPT response shapes
      // Cards may return nested conditions.history[{ market, date }]
      // Sealed products return priceHistory[{ unopenedPrice, date }]
      const extractHistory = (itemData: any): Array<{ date: string; price: number }> => {
        const ph = itemData?.priceHistory;
        if (!ph) return [];

        // Sealed products: flat array with unopenedPrice
        if (Array.isArray(ph)) {
          return ph
            .map((h: any) => ({
              date: h?.date,
              price: h?.unopenedPrice ?? h?.market ?? h?.price,
            }))
            .filter((h: any) => h.date && typeof h.price === 'number' && h.price > 0);
        }

        // Cards: nested conditions structure
        const conditions = ph?.conditions;
        if (conditions && typeof conditions === 'object') {
          const condKey = conditions['Near Mint'] ? 'Near Mint' : Object.keys(conditions)[0];
          const hist = conditions[condKey]?.history;
          if (Array.isArray(hist)) {
            return hist
              .map((h: any) => ({ date: h?.date, price: h?.market ?? h?.price }))
              .filter((h: any) => h.date && typeof h.price === 'number' && h.price > 0);
          }
        }

        return [];
      };

      const fetchHistory = async (item: SnapshotRow, type: 'sealed' | 'card') => {
        try {
          const res = type === 'sealed'
            ? await pptApi.getSealedProducts({ tcgPlayerId: item.tcgplayer_id!, includeHistory: true, days: 180, limit: 1 })
            : await pptApi.getCardById(item.tcgplayer_id!, { includeHistory: true, days: 180 });

          const itemData = Array.isArray(res?.data) ? res.data[0] : res?.data;
          const history = extractHistory(itemData);
          console.log(`[SealedVsCards] ${type} "${item.name}" got ${history.length} history points, keys: ${Object.keys(itemData || {}).join(',')}`);
          return { type, name: item.name, history };
        } catch (e) {
          console.warn(`[SealedVsCards] Failed to fetch history for ${item.name}:`, e);
          return { type, name: item.name, history: [] };
        }
      };

      const results = await Promise.all([
        ...sealedWithId.map(s => fetchHistory(s, 'sealed')),
        ...cardsWithId.map(c => fetchHistory(c, 'card')),
      ]);

      return {
        sealed: results.filter(r => r.type === 'sealed'),
        cards: results.filter(r => r.type === 'card'),
      };
    },
    enabled: (sealedItems.length > 0 || topCards.length > 0) && !!selectedSet,
    staleTime: 1000 * 60 * 30,
  });

  // Step 3: Build aggregate chart data — normalize to % change from day 1
  const chartData = useMemo((): PricePoint[] => {
    if (!historyData) return [];

    const buildAggregateIndex = (items: { history: any }[]) => {
      const histories = items
        .map(item =>
          (Array.isArray(item.history) ? item.history : [])
            .map((pt: any) => ({
              date: pt.date?.split('T')[0],
              price: pt.price,
            }))
            .filter((pt: any) => pt.date && typeof pt.price === 'number' && pt.price > 0)
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
        )
        .filter(history => history.length > 0);

      if (histories.length === 0) return new Map<string, number>();

      const allDates = [...new Set(histories.flatMap(history => history.map(point => point.date)))].sort();
      const byDate = new Map<string, number[]>();

      for (const history of histories) {
        const priceByDate = new Map(history.map(point => [point.date, point.price]));
        let lastPrice: number | null = null;

        for (const date of allDates) {
          if (priceByDate.has(date)) {
            lastPrice = priceByDate.get(date)!;
          }

          if (lastPrice === null) continue;
          if (!byDate.has(date)) byDate.set(date, []);
          byDate.get(date)!.push(lastPrice);
        }
      }

      const series = [...byDate.entries()]
        .map(([date, prices]) => ({
          date,
          avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (series.length === 0) return new Map<string, number>();

      const base = series[0].avg;
      const pctMap = new Map<string, number>();
      for (const s of series) {
        pctMap.set(s.date, ((s.avg - base) / base) * 100);
      }
      return pctMap;
    };

    const sealedPct = buildAggregateIndex(historyData.sealed);
    const cardsPct = buildAggregateIndex(historyData.cards);

    if (sealedPct.size === 0 && cardsPct.size === 0) return [];

    const allDates = new Set([...sealedPct.keys(), ...cardsPct.keys()]);
    const sorted = [...allDates].sort();

    let lastSealed: number | null = null;
    let lastCards: number | null = null;

    return sorted.map(date => {
      if (sealedPct.has(date)) lastSealed = sealedPct.get(date)!;
      if (cardsPct.has(date)) lastCards = cardsPct.get(date)!;
      return {
        date,
        sealedPct: lastSealed,
        cardsPct: lastCards,
      };
    });
  }, [historyData]);

  // Aggregate 30d/90d changes for verdict (from DB data, no extra API calls)
  const verdictData = useMemo(() => {
    const avg = (items: SnapshotRow[], field: 'price_change_30d' | 'price_change_90d') => {
      const vals = items.map(i => i[field] ?? 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return {
      sealed30d: avg(sealedItems, 'price_change_30d'),
      sealed90d: avg(sealedItems, 'price_change_90d'),
      cards30d: avg(topCards, 'price_change_30d'),
      cards90d: avg(topCards, 'price_change_90d'),
    };
  }, [sealedItems, topCards]);

  const showVerdict = sealedItems.length > 0 && topCards.length > 0;
  const isChartLoading = historyLoading && !!selectedSet && (sealedItems.length > 0 || topCards.length > 0);

  return (
    <>
      <Seo
        title="Sealed vs Cards Comparison | PokeIQ"
        description="Compare 180-day price performance of sealed products vs top raw cards for any Pokémon TCG set. Identify which is undervalued."
      />
      <GlobalNavBar />
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sealed vs Cards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compare 180-day price trends of sealed products vs top raw cards. Find what's undervalued.
            </p>
          </div>

          <SetSelector value={selectedSet} onChange={setSelectedSet} />

          <ComparisonChart data={chartData} isLoading={isChartLoading} />

          {showVerdict && (
            <UndervaluedVerdict
              sealed30d={verdictData.sealed30d}
              sealed90d={verdictData.sealed90d}
              cards30d={verdictData.cards30d}
              cards90d={verdictData.cards90d}
            />
          )}

          {selectedSet && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Sealed Products
                    <Badge variant="secondary" className="text-[10px] ml-auto">{sealedItems.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {snapshotsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                  ) : sealedItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No sealed products found for this set</p>
                  ) : (
                    sealedItems.map((item, i) => (
                      <ProductRow key={`sealed-${i}-${item.card_id}`} item={item} />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-accent" />
                    Top Cards
                    <Badge variant="secondary" className="text-[10px] ml-auto">{topCards.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {snapshotsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
                  ) : topCards.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No card data found for this set</p>
                  ) : (
                    topCards.map((item, i) => (
                      <ProductRow key={`card-${i}-${item.card_id}`} item={item} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProductRow({ item }: { item: SnapshotRow }) {
  const change30d = item.price_change_30d ?? 0;
  const isUp = change30d >= 0;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      {item.image_url && (
        <img src={item.image_url} alt="" className="w-8 h-11 object-contain rounded-sm shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          ${item.price?.toFixed(2)}
          {item.rarity && <span className="ml-1.5 text-muted-foreground/70">· {item.rarity}</span>}
        </p>
      </div>
      <div className={cn('flex items-center gap-0.5 text-xs font-bold tabular-nums shrink-0', isUp ? 'text-success' : 'text-warning')}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isUp ? '+' : ''}{change30d.toFixed(1)}%
      </div>
    </div>
  );
}
