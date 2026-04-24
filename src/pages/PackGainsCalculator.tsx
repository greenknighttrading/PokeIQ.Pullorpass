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
  avgRawPrice: number;      // mean price for this rarity in DB
  cardCount: number;        // # of cards we found for this rarity
  evPerPack: number;        // chancePct/100 * avgRawPrice
  source: 'db' | 'justtcg' | 'none';
}

interface PackStats {
  rows: RarityRow[];
  evPerPack: number;        // total expected value per pack
}

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function buildStats(
  config: PackOddsConfig,
  priceByRarity: Map<string, { avg: number; count: number; source: 'db' | 'justtcg' }>
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
      cardCount: rec?.count ?? 0,
      evPerPack: (chancePct / 100) * avg,
      source: rec ? rec.source : 'none',
    };
  });
  const evPerPack = rows.reduce((s, r) => s + r.evPerPack, 0);
  return { rows, evPerPack };
}

/** Simulate one pack rip — returns a per-rarity hit count. */
function simulatePack(config: PackOddsConfig): Record<string, number> {
  const hits: Record<string, number> = {};
  for (const r of config.rarities) {
    // Each rarity is treated as an independent Bernoulli trial per pack.
    // (Matches the reference calculator's "expected vs sim" comparison style.)
    hits[r.rarity] = Math.random() < 1 / r.oneIn ? 1 : 0;
  }
  return hits;
}

export default function PackGainsCalculator() {
  const [selectedSet, setSelectedSet] = useState<string>(PACK_ODDS_REGISTRY[0].setName);
  const [packsOpened, setPacksOpened] = useState<number>(10);
  const [costPerPack, setCostPerPack] = useState<number>(10);
  const [simSeed, setSimSeed] = useState<number>(0); // bumps to trigger re-simulation

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

  // Simulated rip — re-rolled when simSeed or inputs change
  const sim = useMemo(() => {
    const totals: Record<string, number> = {};
    config.rarities.forEach(r => { totals[r.rarity] = 0; });
    for (let i = 0; i < Math.max(0, Math.floor(packsOpened)); i++) {
      const pack = simulatePack(config);
      for (const k of Object.keys(pack)) totals[k] += pack[k];
    }
    let simValue = 0;
    for (const r of stats.rows) simValue += totals[r.rarity] * r.avgRawPrice;
    return { hits: totals, totalValue: simValue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simSeed, packsOpened, stats.rows]);

  const expectedValueTotal = stats.evPerPack * Math.max(0, packsOpened);
  const totalCost = costPerPack * Math.max(0, packsOpened);
  const expectedGainLoss = expectedValueTotal - totalCost;
  const simGainLoss = sim.totalValue - totalCost;
  const breakEvenPack = stats.evPerPack;
  const avgGainPerPack = stats.evPerPack - costPerPack;
  const evRoiPct = costPerPack > 0 ? (avgGainPerPack / costPerPack) * 100 : 0;
  const dbCount = stats.rows.filter(r => r.source === 'db').length;
  const liveCount = stats.rows.filter(r => r.source === 'justtcg').length;
  const missingCount = stats.rows.filter(r => r.source === 'none').length;
  // Sort rarities by EV contribution (most valuable first) for the visual breakdown
  const rarityRanked = useMemo(
    () => [...stats.rows].sort((a, b) => b.evPerPack - a.evPerPack),
    [stats.rows]
  );
  const maxEv = Math.max(...rarityRanked.map(r => r.evPerPack), 0.0001);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Pack Gains Calculator — Estimate Booster Pack EV | PokeIQ"
        description="Estimate expected value, break-even cost, and simulated rip outcomes for Pokémon TCG booster packs using real market prices."
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
            <div className="flex flex-col">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Simulate</Label>
              <Button
                onClick={() => setSimSeed(s => s + 1)}
                className="mt-1.5 h-11 gap-2"
                variant="secondary"
              >
                <Dice5 className="w-4 h-4" />
                Re-roll {packsOpened} {packsOpened === 1 ? 'pack' : 'packs'}
              </Button>
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

        {/* Visual rarity breakdown — bars by EV contribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Where the value lives</CardTitle>
              <span className="text-[11px] text-muted-foreground">Sorted by EV contribution per pack</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              rarityRanked.map(r => {
                const widthPct = (r.evPerPack / maxEv) * 100;
                const evShare = stats.evPerPack > 0 ? (r.evPerPack / stats.evPerPack) * 100 : 0;
                return (
                  <div key={r.rarity} className="grid grid-cols-12 items-center gap-3">
                    <div className="col-span-4 sm:col-span-3 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {r.rarity}
                        <SourceDot source={r.source} />
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        1 / {r.oneIn} · {r.chancePct.toFixed(2)}%
                      </div>
                    </div>
                    <div className="col-span-5 sm:col-span-6">
                      <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            r.source === 'none' ? 'bg-muted' : 'bg-primary/70'
                          )}
                          style={{ width: `${Math.max(2, widthPct)}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-3 text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {r.avgRawPrice > 0 ? fmtMoney(r.evPerPack) : '—'}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {r.avgRawPrice > 0 ? `${evShare.toFixed(0)}% of pack EV` : 'no price'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Two-column: rip simulation + run breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Dice5 className="w-4 h-4" /> Single rip simulation
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setSimSeed(s => s + 1)} className="gap-1.5 h-7 text-xs">
                  <RefreshCw className="w-3 h-3" /> Re-roll
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Random outcome from {packsOpened} packs. Compare to expected.</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                <div className="col-span-4">Rarity</div>
                <div className="col-span-4 text-right">Expected hits</div>
                <div className="col-span-4 text-right">Sim hits</div>
              </div>
              {stats.rows.map(r => {
                const expectedHits = (r.chancePct / 100) * packsOpened;
                const simHits = sim.hits[r.rarity] ?? 0;
                const delta = simHits - expectedHits;
                return (
                  <div key={r.rarity} className="grid grid-cols-12 px-4 py-2 text-sm border-b border-border/40 last:border-b-0">
                    <div className="col-span-4 font-medium">{r.shortLabel}</div>
                    <div className="col-span-4 text-right tabular-nums text-muted-foreground">{expectedHits.toFixed(2)}</div>
                    <div className={cn(
                      'col-span-4 text-right tabular-nums font-medium',
                      delta > 0.5 ? 'text-success' : delta < -0.5 ? 'text-destructive' : 'text-foreground'
                    )}>
                      {simHits}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Run summary</CardTitle>
              <p className="text-[11px] text-muted-foreground">{packsOpened} packs × {fmtMoney(costPerPack)} each</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryRow label="Spend" value={fmtMoney(totalCost)} />
              <SummaryRow label="Expected return" value={fmtMoney(expectedValueTotal)} />
              <SummaryRow label="Sim return" value={fmtMoney(sim.totalValue)} sub="this rip" />
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
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sim P&L (this rip)</span>
                  <span className={cn(
                    'text-base font-bold tabular-nums',
                    simGainLoss >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {simGainLoss >= 0 ? '+' : ''}{fmtMoney(simGainLoss)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Expected uses statistical odds (packs × pull rate × avg raw price). Sim is a single random outcome — re-roll to feel the variance.
              </p>
            </CardContent>
          </Card>
        </div>

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
