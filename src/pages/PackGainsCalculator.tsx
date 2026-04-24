import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalNavBar } from '@/components/layout/GlobalNavBar';
import { Seo } from '@/components/seo/Seo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Dice5, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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
}

interface PackStats {
  rows: RarityRow[];
  evPerPack: number;        // total expected value per pack
}

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function buildStats(config: PackOddsConfig, priceByRarity: Map<string, { avg: number; count: number }>): PackStats {
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

  // Fetch avg raw price per rarity for the chosen set
  const { data: priceMap, isLoading } = useQuery({
    queryKey: ['pack-gains-prices', selectedSet],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_snapshots')
        .select('rarity, price, name')
        .eq('set_name', selectedSet)
        .eq('product_type', 'card')
        .gt('price', 0);
      if (error) throw error;

      const byRarity = new Map<string, { sum: number; count: number }>();
      for (const row of data ?? []) {
        if (!row.rarity || !row.price) continue;
        const key = row.rarity;
        const cur = byRarity.get(key) ?? { sum: 0, count: 0 };
        cur.sum += Number(row.price);
        cur.count += 1;
        byRarity.set(key, cur);
      }
      const out = new Map<string, { avg: number; count: number }>();
      byRarity.forEach((v, k) => out.set(k, { avg: v.sum / v.count, count: v.count }));
      return out;
    },
    staleTime: 1000 * 60 * 30,
  });

  const stats = useMemo<PackStats>(
    () => buildStats(config, priceMap ?? new Map()),
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

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Pack Gains Calculator — Estimate Booster Pack EV | PokeIQ"
        description="Estimate expected value, break-even cost, and simulated rip outcomes for Pokémon TCG booster packs using real market prices."
      />
      <GlobalNavBar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Pack Gains Calculator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estimate pack ripping odds and expected gain / loss by set.
          </p>
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
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Actions</Label>
              <Button
                onClick={() => setSimSeed(s => s + 1)}
                className="mt-1.5 h-11 gap-2"
                variant="secondary"
              >
                <RefreshCw className="w-4 h-4" />
                Calculate / Re-roll Simulation
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary + Rip Odds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{config.displayName}</CardTitle>
              <p className="text-xs text-muted-foreground">{config.setCode}</p>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              <Row label="Current expected pack value" value={fmtMoney(stats.evPerPack)} />
              <Row
                label="Current avg gain/loss from ripping"
                value={fmtMoney(avgGainPerPack)}
                tone={avgGainPerPack >= 0 ? 'pos' : 'neg'}
              />
              <Row label="Break-even pack cost" value={fmtMoney(breakEvenPack)} />
              <Row label="Packs opened" value={packsOpened.toLocaleString()} />
              <Row label="Avg cost per pack" value={fmtMoney(costPerPack)} />
            </CardContent>
          </Card>

          {/* Rip odds + simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dice5 className="w-4 h-4" /> Rip Odds & Value Estimates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-3 px-4 py-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                <div />
                <div className="text-right">Expected</div>
                <div className="text-right">Sim</div>
              </div>
              {stats.rows.map(r => {
                const expectedHits = (r.chancePct / 100) * packsOpened;
                const simHits = sim.hits[r.rarity] ?? 0;
                return (
                  <div key={r.rarity} className="grid grid-cols-3 px-4 py-2 text-sm border-b border-border/40 last:border-b-0">
                    <div className="font-medium">{r.shortLabel}</div>
                    <div className="text-right tabular-nums">{expectedHits.toFixed(2)}</div>
                    <div className="text-right tabular-nums">{simHits}</div>
                  </div>
                );
              })}
              <div className="px-4 py-3 border-t border-border/60 space-y-1">
                <div className="grid grid-cols-3 text-sm">
                  <div className="font-semibold">Total value</div>
                  <div className="text-right tabular-nums">{fmtMoney(expectedValueTotal)}</div>
                  <div className="text-right tabular-nums">{fmtMoney(sim.totalValue)}</div>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <div className="font-semibold">Total cost</div>
                  <div className="text-right tabular-nums col-span-2">{fmtMoney(totalCost)}</div>
                </div>
                <div className="grid grid-cols-3 text-base pt-1">
                  <div className="font-bold">Final gain / loss</div>
                  <div className={cn(
                    'text-right tabular-nums font-bold flex items-center justify-end gap-1',
                    expectedGainLoss >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {expectedGainLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {fmtMoney(expectedGainLoss)}
                  </div>
                  <div className={cn(
                    'text-right tabular-nums font-bold flex items-center justify-end gap-1',
                    simGainLoss >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {simGainLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {fmtMoney(simGainLoss)}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  <span className="font-semibold uppercase tracking-wide">Explainer:</span>{' '}
                  Expected = average outcome (packs × odds). Sim = a single random rip outcome (re-roll for a new one).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rarity breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rarity Odds & Value Breakdown</CardTitle>
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
                    <th className="text-center px-4 py-2 font-medium">Cards in DB</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border/40">
              Avg Raw = mean market price across all cards of that rarity in the set in our database. EV Raw / Pack = % chance × avg raw price.
              When new rarities sync into the database, values will populate automatically.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn(
        'text-sm font-semibold tabular-nums',
        tone === 'pos' && 'text-success',
        tone === 'neg' && 'text-destructive',
      )}>
        {value}
      </span>
    </div>
  );
}
