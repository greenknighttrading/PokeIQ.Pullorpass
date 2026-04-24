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
  Loader2, TrendingDown, TrendingUp, Target, Wallet, Zap, Database, Cloud, Dices, X,
} from 'lucide-react';
import {
  PACK_ODDS_REGISTRY, getPackOddsBySetName, type PackOddsConfig,
} from '@/lib/packOdds';
import { cn } from '@/lib/utils';
import setAscendedHeroes from '@/assets/set-ascended-heroes.png';
import setPrismaticEvolutions from '@/assets/set-prismatic-evolutions.png';

const SET_GRAPHICS: Record<string, string> = {
  'ME: Ascended Heroes': setAscendedHeroes,
  'SV: Prismatic Evolutions': setPrismaticEvolutions,
};

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

// Standard normal CDF using Abramowitz & Stegun approximation 7.1.26.
// Returns Φ(z) — the probability a standard normal draw falls at or below z.
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function buildStats(
  config: PackOddsConfig,
  priceByRarity: Map<string, { avg: number; sum: number; count: number; source: 'db' | 'justtcg' }>
): PackStats {
  const rows: RarityRow[] = config.rarities.map(r => {
    const rec = priceByRarity.get(r.rarity);
    const avg = r.fixedValue ?? rec?.avg ?? 0;
    const chancePct = 100 / r.oneIn;
    return {
      rarity: r.rarity,
      shortLabel: r.shortLabel,
      oneIn: r.oneIn,
      chancePct,
      avgRawPrice: avg,
      totalRarityValue: r.fixedValue != null ? 0 : (rec?.sum ?? 0),
      cardCount: r.fixedValue != null ? 0 : (rec?.count ?? 0),
      evPerPack: (chancePct / 100) * avg,
      source: r.fixedValue != null ? 'justtcg' : (rec ? rec.source : 'none'),
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
  const [rollResult, setRollResult] = useState<{
    pulls: { rarity: string; shortLabel: string; value: number }[];
    totalValue: number;
    totalCost: number;
  } | null>(null);
  const [sessionTotals, setSessionTotals] = useState<{
    packs: number;
    value: number;
    cost: number;
    rolls: number;
  }>({ packs: 0, value: 0, cost: 0, rolls: 0 });

  // Reset sim + session when set changes (cost/pack count can change mid-session)
  useEffect(() => {
    setRollResult(null);
    setSessionTotals({ packs: 0, value: 0, cost: 0, rolls: 0 });
  }, [selectedSet]);
  useEffect(() => { setRollResult(null); }, [packsOpened, costPerPack]);

  const config = getPackOddsBySetName(selectedSet)!;

  // 1) Pull what we have from market_snapshots (sum + count by rarity)
  const dbQuery = useQuery({
    queryKey: ['pack-gains-db', selectedSet],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('rarity, price, synced_at')
        .eq('set_name', selectedSet)
        .eq('product_type', 'card')
        .gt('price', 0);
      if (error) throw error;
      const byRarity = new Map<string, { sum: number; count: number }>();
      let latestSync: string | null = null;
      for (const row of data ?? []) {
        if (!row.rarity || !row.price) continue;
        const cur = byRarity.get(row.rarity) ?? { sum: 0, count: 0 };
        cur.sum += Number(row.price);
        cur.count += 1;
        byRarity.set(row.rarity, cur);
        if (row.synced_at && (!latestSync || row.synced_at > latestSync)) {
          latestSync = row.synced_at as string;
        }
      }
      return { byRarity, latestSync };
    },
    staleTime: 1000 * 60 * 30,
  });

  // 2) Always fetch full JustTCG set so we can total every rarity (including ones missing from DB)
  const liveQuery = useQuery({
    queryKey: ['pack-gains-live', selectedSet],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const setParam = config.justTcgSetName ?? config.setName;
      const acc = new Map<string, { sum: number; count: number }>();
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
          if (!rarity) continue;
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

  // 3) Merge — prefer JustTCG for completeness (full set), fall back to DB
  const dbBy = dbQuery.data?.byRarity;
  const latestSync = dbQuery.data?.latestSync ?? null;
  const priceMap = useMemo(() => {
    const out = new Map<string, { avg: number; sum: number; count: number; source: 'db' | 'justtcg' }>();
    if (liveQuery.data) {
      liveQuery.data.forEach((v, k) => {
        if (v.count > 0) out.set(k, { avg: v.sum / v.count, sum: v.sum, count: v.count, source: 'justtcg' });
      });
    }
    if (dbBy) {
      dbBy.forEach((v, k) => {
        if (!out.has(k) && v.count > 0) {
          out.set(k, { avg: v.sum / v.count, sum: v.sum, count: v.count, source: 'db' });
        }
      });
    }
    return out;
  }, [dbBy, liveQuery.data]);

  const isLoading = dbQuery.isLoading || liveQuery.isFetching;

  const stats = useMemo<PackStats>(
    () => buildStats(config, priceMap),
    [config, priceMap]
  );

  // Per-pack standard deviation of pulled value, derived from the rare-slot
  // distribution: Var(X) = Σ p_i * x_i^2 − (Σ p_i * x_i)^2.
  // Used to approximate session outcome percentiles via a normal distribution.
  const perPackStdDev = useMemo(() => {
    const eligible = stats.rows.filter(r => r.avgRawPrice > 0);
    if (eligible.length === 0) return 0;
    const totalWeight = eligible.reduce((s, r) => s + r.chancePct, 0);
    if (totalWeight <= 0) return 0;
    let mean = 0;
    let meanSq = 0;
    for (const r of eligible) {
      const p = r.chancePct / totalWeight;
      mean += p * r.avgRawPrice;
      meanSq += p * r.avgRawPrice * r.avgRawPrice;
    }
    const variance = Math.max(0, meanSq - mean * mean);
    return Math.sqrt(variance);
  }, [stats.rows]);

  const expectedValueTotal = stats.evPerPack * Math.max(0, packsOpened);
  const totalCost = costPerPack * Math.max(0, packsOpened);
  const expectedGainLoss = expectedValueTotal - totalCost;
  const breakEvenPack = stats.evPerPack;
  const avgGainPerPack = stats.evPerPack - costPerPack;
  const evRoiPct = costPerPack > 0 ? (avgGainPerPack / costPerPack) * 100 : 0;
  const dbCount = stats.rows.filter(r => r.source === 'db').length;
  const liveCount = stats.rows.filter(r => r.source === 'justtcg').length;
  const missingCount = stats.rows.filter(r => r.source === 'none').length;

  // Data source + freshness label for the set summary
  const dataSourceLabel = liveCount >= dbCount ? 'JustTCG' : 'PokeIQ market data';
  const freshnessLabel = (() => {
    if (liveCount >= dbCount) return 'Updated live';
    if (!latestSync) return null;
    const ms = Date.now() - new Date(latestSync).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `Updated ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Updated ${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `Updated ${days}d ago`;
  })();

  const handleRoll = () => {
    // Roll one rare slot per pack using weighted pull rates
    const eligible = stats.rows.filter(r => r.avgRawPrice > 0);
    if (eligible.length === 0 || packsOpened <= 0) return;
    const totalWeight = eligible.reduce((s, r) => s + r.chancePct, 0);
    const pulls: { rarity: string; shortLabel: string; value: number }[] = [];
    for (let i = 0; i < packsOpened; i++) {
      let pick = Math.random() * totalWeight;
      let chosen = eligible[0];
      for (const r of eligible) {
        pick -= r.chancePct;
        if (pick <= 0) { chosen = r; break; }
      }
      pulls.push({ rarity: chosen.rarity, shortLabel: chosen.shortLabel, value: chosen.avgRawPrice });
    }
    setRollResult({
      pulls,
      totalValue: pulls.reduce((s, p) => s + p.value, 0),
      totalCost: costPerPack * packsOpened,
    });
    const rollValue = pulls.reduce((s, p) => s + p.value, 0);
    const rollCost = costPerPack * packsOpened;
    setSessionTotals(prev => ({
      packs: prev.packs + packsOpened,
      value: prev.value + rollValue,
      cost: prev.cost + rollCost,
      rolls: prev.rolls + 1,
    }));
  };

  // Aggregated tally for the pulls panel
  const pullTally = useMemo(() => {
    if (!rollResult) return [] as { shortLabel: string; rarity: string; count: number; value: number; isHit: boolean }[];
    const m = new Map<string, { shortLabel: string; rarity: string; count: number; value: number; isHit: boolean }>();
    for (const p of rollResult.pulls) {
      const cur = m.get(p.rarity) ?? {
        shortLabel: p.shortLabel, rarity: p.rarity, count: 0, value: 0,
        isHit: !/no hit/i.test(p.rarity),
      };
      cur.count += 1;
      cur.value += p.value;
      m.set(p.rarity, cur);
    }
    return Array.from(m.values()).sort((a, b) => Number(b.isHit) - Number(a.isHit) || b.value - a.value);
  }, [rollResult]);

  // Hit-rate benchmark for the pulls panel
  const expectedHitRate = useMemo(() => {
    // Sum chance % of every "hit" rarity (anything not the No Hit / basic Rare baseline)
    const hitChancePct = stats.rows
      .filter(r => !/no hit/i.test(r.rarity))
      .reduce((s, r) => s + r.chancePct, 0);
    if (hitChancePct <= 0) return null;
    const oneInN = 100 / hitChancePct;
    return { oneInN, perPack: hitChancePct / 100 };
  }, [stats.rows]);

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

        {/* Select Set — single full-width bar */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
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
            <div className="w-full sm:w-32">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Packs Opened</Label>
              <Input
                type="number" min={0} value={packsOpened}
                onChange={(e) => setPacksOpened(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 h-11"
              />
            </div>
            <div className="w-full sm:w-36">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Cost per Pack ($)</Label>
              <Input
                type="number" min={0} step="0.01" value={costPerPack}
                onChange={(e) => setCostPerPack(Math.max(0, Number(e.target.value) || 0))}
                className="mt-1.5 h-11"
              />
            </div>
            <Button
              onClick={handleRoll}
              disabled={isLoading || stats.rows.every(r => r.avgRawPrice <= 0) || packsOpened <= 0}
              className="h-11 w-full sm:w-auto gap-2 sm:px-6"
            >
              <Dices className="w-4 h-4" />
              {rollResult ? `Re-roll ${packsOpened} packs` : `Simulate ${packsOpened} packs`}
            </Button>
          </CardContent>
        </Card>

        {/* Set summary + pulls (left) + Actual vs Expected (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="flex flex-col gap-4 h-full">
          {(() => {
          const sessionPacks = sessionTotals.packs;
          const avgCostPerPackLive = sessionPacks > 0
            ? sessionTotals.cost / sessionPacks
            : costPerPack;
          const setGraphic = SET_GRAPHICS[config.setName];
          return (
            <Card className="flex-1 flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-4 pb-5 border-b border-border/40">
                  <div className="w-20 h-20 rounded-md bg-muted/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {setGraphic ? (
                      <img
                        src={setGraphic}
                        alt={`${config.displayName} set logo`}
                        loading="lazy"
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Dices className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-foreground truncate">{config.displayName}</div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{config.setCode}</div>
                  </div>
                </div>
                <div className="pt-5 space-y-3 flex-1">
                  <SummaryRow label="Current pack cost" value={fmtMoney(costPerPack)} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm">Expected value</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Prices via {dataSourceLabel}
                        {freshnessLabel ? ` · ${freshnessLabel}` : ''}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{fmtMoney(stats.evPerPack)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expected gain/loss from ripping</span>
                    <span className={cn(
                      'text-sm font-semibold tabular-nums',
                      avgGainPerPack >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {avgGainPerPack >= 0 ? '+' : '-'}{fmtMoney(Math.abs(avgGainPerPack))}
                    </span>
                  </div>
                  <SummaryRow label="Avg cost per pack" value={fmtMoney(avgCostPerPackLive)} />
                </div>
                <div className="mt-5 pt-4 border-t border-border/40">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You need <span className="font-semibold text-foreground">{fmtMoney(costPerPack)}</span> in
                      hits per pack to break even at <span className="font-semibold text-foreground">{fmtMoney(costPerPack)}</span>/pack.
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-3 pt-3 border-t border-border/30 italic">
                    Each session is independent. Past unlucky runs don't make future hits more likely —
                    but over enough packs, results naturally trend toward expected value.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
          })()}

          {/* Your pulls — stacked under Pack Cost */}
          <Card className={cn('flex-1 flex flex-col', rollResult && 'border-primary/40 bg-primary/5')}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Your simulated Pulls</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {rollResult
                    ? (() => {
                        const hits = pullTally.filter(t => t.isHit).reduce((s, t) => s + t.count, 0);
                        const packs = rollResult.pulls.length;
                        const expected = expectedHitRate
                          ? ` · Expected: 1 hit per ${expectedHitRate.oneInN.toFixed(1)} packs`
                          : '';
                        return `${hits} hit${hits === 1 ? '' : 's'} in ${packs} pack${packs === 1 ? '' : 's'}${expected}`;
                      })()
                    : 'Hit Simulate to roll the rare slot for every pack.'}
                </p>
              </div>
              {rollResult && (
                <Button variant="ghost" size="icon" onClick={() => setRollResult(null)} className="shrink-0">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-1 flex-1 flex flex-col">
              {!rollResult ? (
                <div className="flex-1 min-h-[120px] flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-md">
                  No simulation yet
                </div>
              ) : (
                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                  {pullTally.map(t => (
                    <div
                      key={t.rarity}
                      className={cn(
                        'flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md',
                        t.isHit ? 'bg-success/10 text-foreground' : 'bg-muted/40 text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">{t.shortLabel}</Badge>
                        <span className="truncate">{t.rarity}</span>
                      </div>
                      <div className="flex items-center gap-3 tabular-nums shrink-0">
                        <span className="text-muted-foreground">×{t.count}</span>
                        <span className="font-semibold">{fmtMoney(t.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {(() => {
            const sessSpend = sessionTotals.cost;
            const sessValue = sessionTotals.value;
            const sessPnL = sessValue - sessSpend;
            const expPacks = sessionTotals.rolls > 0 ? sessionTotals.packs : Math.max(0, packsOpened);
            const expSpend = sessionTotals.rolls > 0 ? sessionTotals.cost : totalCost;
            const expReturn = stats.evPerPack * expPacks;
            const expPnL = expReturn - expSpend;
            const hasSession = sessionTotals.rolls > 0;
            const Cell = ({ value, tone, muted }: { value: string; tone?: 'pos' | 'neg'; muted?: boolean }) => (
              <td className={cn(
                'px-3 py-2.5 text-right tabular-nums text-sm font-semibold',
                tone === 'pos' && 'text-success',
                tone === 'neg' && 'text-destructive',
                muted && 'text-muted-foreground font-normal',
              )}>{value}</td>
            );
            return (
              <Card className={cn('h-full flex flex-col', hasSession && 'border-primary/40')}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Actual vs Expected</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {hasSession
                        ? `${sessionTotals.rolls} ${sessionTotals.rolls === 1 ? 'run' : 'runs'} · ${sessionTotals.packs} packs ripped`
                        : `Run a simulation to populate actuals`}
                    </p>
                  </div>
                  {hasSession && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSessionTotals({ packs: 0, value: 0, cost: 0, rolls: 0 })}
                      className="shrink-0 -mt-1 -mr-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/40">
                        <th className="text-left px-3 py-2.5 font-medium">Metric</th>
                        <th className="text-right px-3 py-2.5 font-medium">Actual</th>
                        <th className="text-right px-3 py-2.5 font-medium">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/30">
                        <td className="px-3 py-3 text-sm"># of packs ripped</td>
                        {hasSession ? <Cell value={String(sessionTotals.packs)} /> : <Cell value="—" muted />}
                        <Cell value={String(expPacks)} />
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="px-3 py-3 text-sm">Total spend</td>
                        {hasSession ? <Cell value={fmtMoney(sessSpend)} /> : <Cell value="—" muted />}
                        <Cell value={fmtMoney(expSpend)} />
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="px-3 py-3 text-sm">Total pulled value</td>
                        {hasSession ? <Cell value={fmtMoney(sessValue)} /> : <Cell value="—" muted />}
                        <Cell value={fmtMoney(expReturn)} />
                      </tr>
                      <tr>
                        <td className="px-3 py-3 text-sm font-medium">P&L</td>
                        {hasSession
                          ? <Cell value={`${sessPnL >= 0 ? '+' : ''}${fmtMoney(sessPnL)}`} tone={sessPnL >= 0 ? 'pos' : 'neg'} />
                          : <Cell value="—" muted />}
                        <Cell value={`${expPnL >= 0 ? '+' : ''}${fmtMoney(expPnL)}`} tone={expPnL >= 0 ? 'pos' : 'neg'} />
                      </tr>
                      {hasSession && (() => {
                        const delta = sessPnL - expPnL;
                        const tone = delta >= 0 ? 'pos' : 'neg';
                        const arrow = delta >= 0 ? '↑' : '↓';
                        return (
                          <tr className="border-t border-border/30 bg-muted/20">
                            <td className="px-3 py-3 text-sm text-muted-foreground">vs. expected</td>
                            <td colSpan={2} className={cn(
                              'px-3 py-3 text-right tabular-nums text-base font-semibold',
                              tone === 'pos' && 'text-success',
                              tone === 'neg' && 'text-destructive',
                            )}>
                              {delta >= 0 ? 'Beat expected by ' : 'Trailed expected by '}
                              {delta >= 0 ? '+' : '-'}{fmtMoney(Math.abs(delta))} {arrow}
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                  {hasSession && (() => {
                    // Distribution math
                    const sigma = perPackStdDev > 0 ? perPackStdDev * Math.sqrt(sessionTotals.packs) : 0;
                    const meanValue = stats.evPerPack * sessionTotals.packs;
                    const z = sigma > 0 ? (sessValue - meanValue) / sigma : 0;
                    const pctBelow = sigma > 0 ? normalCdf(z) * 100 : 50;
                    const beatPct = sessPnL - expPnL >= 0;
                    const percentile = beatPct
                      ? Math.max(1, Math.min(99, Math.round(100 - pctBelow)))
                      : Math.max(1, Math.min(99, Math.round(pctBelow)));
                    const percentileSentence = beatPct
                      ? `These total sessions landed in the top ${percentile}% of outcomes for ${sessionTotals.packs} packs.`
                      : `These total sessions landed in the bottom ${percentile}% of outcomes for ${sessionTotals.packs} packs.`;

                    // Convergence note
                    const cumReturnPct = expReturn > 0 ? ((sessValue - expReturn) / expReturn) * 100 : 0;
                    const fromExpected = `${cumReturnPct >= 0 ? '+' : ''}${cumReturnPct.toFixed(1)}%`;

                    // Variance shrink
                    const swing = sigma; // 1σ in $ at current pack count
                    const swing10x = perPackStdDev * Math.sqrt(sessionTotals.packs * 10);

                    // Milestone
                    let milestone: { label: string; tone: 'warn' | 'info' | 'good' } | null = null;
                    if (sessionTotals.packs >= 1000) {
                      milestone = { label: 'Strong sample — 90% of collectors are within 8% of expected at this volume.', tone: 'good' };
                    } else if (sessionTotals.packs >= 500) {
                      milestone = { label: 'Solid sample. Results are starting to stabilize.', tone: 'info' };
                    } else if (sessionTotals.packs >= 180) {
                      milestone = { label: 'Early sample — variance is still high at this volume.', tone: 'warn' };
                    }

                    return (
                      <div className="border-t border-border/40 px-3 py-4 space-y-4 flex-1">
                        {/* Percentile sentence + mini bell curve */}
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {percentileSentence}
                          </p>
                          <BellCurve z={z} />
                        </div>

                        {/* Convergence + variance */}
                        <div className="space-y-2 pt-3 border-t border-border/30">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            After <span className="text-foreground font-medium">{sessionTotals.packs}</span> packs,
                            your cumulative return is{' '}
                            <span className={cn(
                              'font-medium',
                              cumReturnPct >= 0 ? 'text-success' : 'text-destructive'
                            )}>{fromExpected}</span> from expected. The more you rip, the closer this trends toward{' '}
                            <span className="text-foreground font-medium">{fmtMoney(stats.evPerPack)}</span>/pack.
                          </p>
                          {sigma > 0 && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              At {sessionTotals.packs} packs, a ±{fmtMoney(swing)} swing is completely normal.
                              At {sessionTotals.packs * 10} packs, that band tightens to ±{fmtMoney(swing10x / 3)}.
                            </p>
                          )}
                        </div>

                        {/* Milestone badge */}
                        {milestone && (
                          <div className={cn(
                            'flex items-start gap-2 rounded-md px-3 py-2.5 text-sm leading-relaxed',
                            milestone.tone === 'good' && 'bg-success/10 text-success-foreground',
                            milestone.tone === 'info' && 'bg-primary/10 text-foreground',
                            milestone.tone === 'warn' && 'bg-warning/10 text-foreground',
                          )}>
                            <Target className={cn(
                              'w-4 h-4 shrink-0 mt-0.5',
                              milestone.tone === 'good' && 'text-success',
                              milestone.tone === 'info' && 'text-primary',
                              milestone.tone === 'warn' && 'text-warning',
                            )} />
                            <span>{milestone.label}</span>
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            );
          })()}

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
                    <th className="text-center px-4 py-2 font-medium">Total Value</th>
                    <th className="text-center px-4 py-2 font-medium">EV Raw / Pack</th>
                    <th className="text-center px-4 py-2 font-medium">Sample</th>
                    <th className="text-center px-4 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map(r => (
                    <tr key={r.rarity} className="border-t border-border/40">
                      <td className="px-4 py-3">{r.rarity}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        1 / {r.oneIn < 2 ? r.oneIn.toFixed(2) : r.oneIn}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{r.chancePct.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {r.avgRawPrice > 0 ? fmtMoney(r.avgRawPrice) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-medium">
                        {r.totalRarityValue > 0 ? fmtMoney(r.totalRarityValue) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{fmtMoney(r.evPerPack)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{r.cardCount}</td>
                      <td className="px-4 py-3 text-center">
                        <SourceBadge source={r.source} />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-center tabular-nums">{fmtMoney(stats.totalSetValue)}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{fmtMoney(stats.evPerPack)}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                      {stats.rows.reduce((s, r) => s + r.cardCount, 0)}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
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

/**
 * Mini bell curve visualization. Plots a standard-normal density curve and
 * marks the user's session position (clamped to ±3σ) with a labeled dot.
 */
function BellCurve({ z }: { z: number }) {
  const W = 280;
  const H = 64;
  const padX = 8;
  const padY = 14; // extra top room so the "Your session" label is never clipped
  const minZ = -3;
  const maxZ = 3;
  const clampedZ = Math.max(minZ, Math.min(maxZ, z));
  // Standard normal density φ(z) = (1/√2π) e^(-z²/2). Peak ≈ 0.3989.
  const phi = (t: number) => Math.exp(-(t * t) / 2) / Math.sqrt(2 * Math.PI);
  const peak = phi(0);
  const xFor = (zVal: number) => padX + ((zVal - minZ) / (maxZ - minZ)) * (W - padX * 2);
  const yFor = (zVal: number) => padY + (1 - phi(zVal) / peak) * (H - padY * 2);
  const points: string[] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const zVal = minZ + (i / steps) * (maxZ - minZ);
    points.push(`${xFor(zVal).toFixed(1)},${yFor(zVal).toFixed(1)}`);
  }
  const areaPath = `M${xFor(minZ).toFixed(1)},${(H - padY).toFixed(1)} L` +
    points.join(' L') +
    ` L${xFor(maxZ).toFixed(1)},${(H - padY).toFixed(1)} Z`;
  const linePath = 'M' + points.join(' L');
  const dotX = xFor(clampedZ);
  const dotY = yFor(clampedZ);
  // Pick anchor based on space; if too close to either edge, fall back to middle.
  const labelText = 'Your session';
  const approxLabelWidth = labelText.length * 5; // ~5px per char at fontSize 9
  const spaceRight = W - padX - dotX;
  const spaceLeft = dotX - padX;
  let anchor: 'start' | 'end' | 'middle' = 'start';
  let labelX = dotX + 6;
  if (spaceRight < approxLabelWidth && spaceLeft >= approxLabelWidth) {
    anchor = 'end';
    labelX = dotX - 6;
  } else if (spaceRight < approxLabelWidth && spaceLeft < approxLabelWidth) {
    anchor = 'middle';
    labelX = Math.max(padX + approxLabelWidth / 2, Math.min(W - padX - approxLabelWidth / 2, dotX));
  }
  const labelY = Math.max(padY - 2, dotY - 8);
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* baseline */}
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="hsl(var(--border))" strokeWidth="1" />
        {/* mean line */}
        <line x1={xFor(0)} y1={padY} x2={xFor(0)} y2={H - padY} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 2" />
        {/* curve fill */}
        <path d={areaPath} fill="hsl(var(--muted-foreground) / 0.15)" />
        {/* curve line */}
        <path d={linePath} fill="none" stroke="hsl(var(--muted-foreground) / 0.6)" strokeWidth="1.25" />
        {/* user dot */}
        <circle cx={dotX} cy={dotY} r="4" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="1.5" />
        {/* user label */}
        <text
          x={labelX}
          y={labelY}
          textAnchor={anchor}
          fontSize="9"
          fill="hsl(var(--foreground))"
          className="font-medium"
        >
          {labelText}
        </text>
      </svg>
    </div>
  );
}
