import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, TrendingDown, TrendingUp, Target, Wallet, Zap, Database, Cloud,
} from 'lucide-react';
import {
  PACK_ODDS_REGISTRY, getPackOddsBySetName, type PackOddsConfig,
} from '@/lib/packOdds';
import { cn } from '@/lib/utils';

interface RarityRow {
  rarity: string;
  shortLabel: string;
  oneIn: number;
  chancePct: number;        // 100 / oneIn
  avgRawPrice: number;      // mean price for this rarity
  totalRarityValue: number; // sum of all card prices in this rarity
  cardCount: number;        // # of cards we found for this rarity
  evPerPack: number;        // chancePct/100 * avgRawPrice
  source: 'db' | 'justtcg' | 'none';
}

interface PackStats {
  rows: RarityRow[];
  evPerPack: number;        // total expected value per pack
  totalSetValue: number;    // grand total of all rarity totals
}

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function buildStats(
  config: PackOddsConfig,
  priceByRarity: Map<string, { avg: number; sum: number; count: number; source: 'db' | 'justtcg' }>
): PackStats {
  const rows: RarityRow[] = config.rarities.map(r => {
    const rec = priceByRarity.get(r.rarity);
    const avg = rec?.avg ?? 0;
    const chancePct = 100 / r.oneIn;
    return {
      rarity: r.rarity,
      shortLabel: r.shortLabel,
      oneIn: r.oneIn,
      chancePct,
      avgRawPrice: avg,
      totalRarityValue: rec?.sum ?? 0,
      cardCount: rec?.count ?? 0,
      evPerPack: (chancePct / 100) * avg,
      source: rec ? rec.source : 'none',
    };
  });
  const evPerPack = rows.reduce((s, r) => s + r.evPerPack, 0);
  const totalSetValue = rows.reduce((s, r) => s + r.totalRarityValue, 0);
  return { rows, evPerPack, totalSetValue };
}


export default function PackGainsCalculator() {
  const [selectedSet, setSelectedSet] = useState<string>(PACK_ODDS_REGISTRY[0].setName);
  const [packsOpened, setPacksOpened] = useState<number>(10);
  const [costPerPack, setCostPerPack] = useState<number>(10);

  const config = getPackOddsBySetName(selectedSet)!;

  // 1) Pull what we have from market_snapshots
  const dbQuery = useQuery({
    queryKey: ['pack-gains-db', selectedSet],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('rarity, price')
        .eq('set_name', selectedSet)
        .eq('product_type', 'card')
        .gt('price', 0);
      if (error) throw error;
      const byRarity = new Map<string, { sum: number; count: number }>();
      for (const row of data ?? []) {
        if (!row.rarity || !row.price) continue;
        const cur = byRarity.get(row.rarity) ?? { sum: 0, count: 0 };
        cur.sum += Number(row.price);
        cur.count += 1;
        byRarity.set(row.rarity, cur);
      }
      return byRarity;
    },
    staleTime: 1000 * 60 * 30,
  });

  // 2) Determine which rarities are still missing and live-fetch from JustTCG
  const dbBy = dbQuery.data;
  const missingRarities = useMemo(() => {
    if (!dbBy) return [];
    return config.rarities.filter(r => !dbBy.has(r.rarity)).map(r => r.rarity);
  }, [config.rarities, dbBy]);

  const liveQuery = useQuery({
    queryKey: ['pack-gains-live', selectedSet, missingRarities.join('|')],
    enabled: !!dbBy && missingRarities.length > 0,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const setParam = config.justTcgSetName ?? config.setName;
      const acc = new Map<string, { sum: number; count: number }>();
      // Page through up to 4 pages (400 cards) to be safe
      for (let page = 0; page < 4; page++) {
        const { data, error } = await supabase.functions.invoke('justtcg', {
          body: {
            action: 'getBySet',
            set: setParam,
            game: 'pokemon',
            limit: 100,
            offset: page * 100,
          },
        });
        if (error) break;
        const items: any[] = Array.isArray(data?.data) ? data.data : [];
        if (items.length === 0) break;
        for (const card of items) {
          const rarity = card?.rarity;
          if (!rarity || !missingRarities.includes(rarity)) continue;
          const nm = card?.variants?.find((v: any) => v.condition === 'Near Mint') ?? card?.variants?.[0];
          const price = Number(nm?.price);
          if (!Number.isFinite(price) || price <= 0) continue;
          const cur = acc.get(rarity) ?? { sum: 0, count: 0 };
          cur.sum += price;
          cur.count += 1;
          acc.set(rarity, cur);
        }
        if (items.length < 100) break;
      }
      return acc;
    },
  });

  // 3) Merge DB + live into one map with source tracking
  const priceMap = useMemo(() => {
    const out = new Map<string, { avg: number; count: number; source: 'db' | 'justtcg' }>();
    if (dbBy) dbBy.forEach((v, k) => out.set(k, { avg: v.sum / v.count, count: v.count, source: 'db' }));
    if (liveQuery.data) {
      liveQuery.data.forEach((v, k) => {
        if (!out.has(k) && v.count > 0) out.set(k, { avg: v.sum / v.count, count: v.count, source: 'justtcg' });
      });
    }
    return out;
  }, [dbBy, liveQuery.data]);

  const isLoading = dbQuery.isLoading || liveQuery.isFetching;

  const stats = useMemo<PackStats>(
    () => buildStats(config, priceMap),
    [config, priceMap]
  );

  const expectedValueTotal = stats.evPerPack * Math.max(0, packsOpened);
  const totalCost = costPerPack * Math.max(0, packsOpened);
  const expectedGainLoss = expectedValueTotal - totalCost;
  const breakEvenPack = stats.evPerPack;
  const avgGainPerPack = stats.evPerPack - costPerPack;
  const evRoiPct = costPerPack > 0 ? (avgGainPerPack / costPerPack) * 100 : 0;
  const dbCount = stats.rows.filter(r => r.source === 'db').length;
  const liveCount = stats.rows.filter(r => r.source === 'justtcg').length;
  const missingCount = stats.rows.filter(r => r.source === 'none').length;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Pack Gains Calculator — Estimate Booster Pack EV | PokeIQ"
        description="Estimate expected value and break-even cost for Pokémon TCG booster packs using real market prices."
      />
      <GlobalNavBar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Pack Gains Calculator</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Math-driven booster economics. Real card prices, real pull rates, no hopium.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Badge variant="outline" className="gap-1.5">
              <Database className="w-3 h-3" /> {dbCount} from DB
            </Badge>
            {liveCount > 0 && (
              <Badge variant="outline" className="gap-1.5">
                <Cloud className="w-3 h-3" /> {liveCount} from JustTCG
              </Badge>
            )}
            {missingCount > 0 && (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                {missingCount} unmatched
              </Badge>
            )}
          </div>
        </header>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Select Set</Label>
              <Select value={selectedSet} onValueChange={setSelectedSet}>
                <SelectTrigger className="mt-1.5 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACK_ODDS_REGISTRY.map(p => (
                    <SelectItem key={p.setName} value={p.setName}>
                      {p.displayName} ({p.setCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Packs Opened</Label>
              <Input
                type="number" min={0} value={packsOpened}
                onChange={(e) => setPacksOpened(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Cost per Pack ($)</Label>
              <Input
                type="number" min={0} step="0.01" value={costPerPack}
                onChange={(e) => setCostPerPack(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 h-11"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hero KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            icon={<Zap className="w-4 h-4" />}
            label="Expected pack value"
            value={fmtMoney(stats.evPerPack)}
            sub={`vs ${fmtMoney(costPerPack)} cost`}
          />
          <Kpi
            icon={<Target className="w-4 h-4" />}
            label="Break-even pack cost"
            value={fmtMoney(breakEvenPack)}
            sub={breakEvenPack < costPerPack ? 'Pack is overpriced' : 'Pack is below EV'}
            tone={breakEvenPack >= costPerPack ? 'pos' : 'neg'}
          />
          <Kpi
            icon={avgGainPerPack >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            label="Edge per pack"
            value={fmtMoney(avgGainPerPack)}
            sub={`${evRoiPct >= 0 ? '+' : ''}${evRoiPct.toFixed(1)}% ROI`}
            tone={avgGainPerPack >= 0 ? 'pos' : 'neg'}
          />
          <Kpi
            icon={<Wallet className="w-4 h-4" />}
            label={`${packsOpened} packs · expected P&L`}
            value={fmtMoney(expectedGainLoss)}
            sub={`Spend ${fmtMoney(totalCost)} → return ${fmtMoney(expectedValueTotal)}`}
            tone={expectedGainLoss >= 0 ? 'pos' : 'neg'}
          />
        </div>

        {/* Run summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Run summary</CardTitle>
            <p className="text-[11px] text-muted-foreground">{packsOpened} packs × {fmtMoney(costPerPack)} each</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Spend" value={fmtMoney(totalCost)} />
            <SummaryRow label="Expected return" value={fmtMoney(expectedValueTotal)} />
            <div className="border-t border-border/60 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Expected P&L</span>
                <span className={cn(
                  'text-base font-bold tabular-nums',
                  expectedGainLoss >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {expectedGainLoss >= 0 ? '+' : ''}{fmtMoney(expectedGainLoss)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              Expected uses statistical odds (packs × pull rate × avg raw price).
            </p>
          </CardContent>
        </Card>

        {/* Rarity breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Full rarity table</CardTitle>
            <p className="text-[11px] text-muted-foreground">All odds, average raw prices, sample sizes, and per-pack EV contribution.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Rarity</th>
                    <th className="text-center px-4 py-2 font-medium">Odds</th>
                    <th className="text-center px-4 py-2 font-medium">% Chance</th>
                    <th className="text-center px-4 py-2 font-medium">Avg Raw</th>
                    <th className="text-center px-4 py-2 font-medium">EV Raw / Pack</th>
                    <th className="text-center px-4 py-2 font-medium">Sample</th>
                    <th className="text-center px-4 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map(r => (
                    <tr key={r.rarity} className="border-t border-border/40">
                      <td className="px-4 py-3">{r.rarity}</td>
                      <td className="px-4 py-3 text-center tabular-nums">1 / {r.oneIn}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{r.chancePct.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {r.avgRawPrice > 0 ? fmtMoney(r.avgRawPrice) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{fmtMoney(r.evPerPack)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{r.cardCount}</td>
                      <td className="px-4 py-3 text-center">
                        <SourceBadge source={r.source} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border/40">
              <span className="font-semibold">DB</span> = price from PokeIQ market snapshots.{' '}
              <span className="font-semibold">JustTCG</span> = live fallback fetched for rarities missing from our sync.{' '}
              <span className="font-semibold">—</span> = no market data found yet.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Kpi({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'pos' | 'neg' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className={cn(
          'mt-2 text-xl font-bold tabular-nums',
          tone === 'pos' && 'text-success',
          tone === 'neg' && 'text-destructive',
        )}>
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm">{label}</div>
        {sub && <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{sub}</div>}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SourceDot({ source }: { source: 'db' | 'justtcg' | 'none' }) {
  const cls = source === 'db' ? 'bg-primary' : source === 'justtcg' ? 'bg-warning' : 'bg-muted-foreground/40';
  const title = source === 'db' ? 'Price from PokeIQ market snapshots' : source === 'justtcg' ? 'Price fetched live from JustTCG' : 'No price data';
  return <span title={title} className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', cls)} />;
}

function SourceBadge({ source }: { source: 'db' | 'justtcg' | 'none' }) {
  if (source === 'db') return <Badge variant="outline" className="text-[10px] gap-1"><Database className="w-3 h-3" />DB</Badge>;
  if (source === 'justtcg') return <Badge variant="outline" className="text-[10px] gap-1"><Cloud className="w-3 h-3" />JustTCG</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">—</Badge>;
}
