import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatisticsByPeriod from './StatisticsByPeriod';
import HistoricalExtremes from './HistoricalExtremes';
import PriceMovementTable from './PriceMovementTable';
import PriceHistoryChart from './PriceHistoryChart';
import WatchlistButton from './WatchlistButton';
import { getBuyScore, getRecommendation, type MoverCard } from './shared/signalHelpers';
import CollectrPricingSection from './CollectrPricingSection';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PriceHistoryPoint {
  p: number;
  t: number;
}

interface JustTCGPriceHistory {
  priceHistory: PriceHistoryPoint[];
}

interface JustTCGVariant extends JustTCGPriceHistory {
  condition: string;
  printing: string;
  language: string;
  price: number | null;
  avgPrice: number | null;
  avgPrice30d: number | null;
  priceChange24hr: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  minPrice7d: number | null;
  maxPrice7d: number | null;
  minPrice30d: number | null;
  maxPrice30d: number | null;
  trendSlope7d: number | null;
  trendSlope30d: number | null;
  stddevPopPrice7d: number | null;
  stddevPopPrice30d: number | null;
  covPrice7d: number | null;
  covPrice30d: number | null;
  iqrPrice7d: number | null;
  iqrPrice30d: number | null;
  priceChangesCount7d: number | null;
  priceChangesCount30d: number | null;
  priceRelativeTo30dRange: number | null;
  lastUpdated: number | null;
}

interface JustTCGCard {
  name: string;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  tcgplayerId: string | null;
  variants: JustTCGVariant[];
}

interface Props {
  tcgApiId: string;
  cardId?: string;
  category: string;
  buyPrice: number | null;
  buyLow: number | null;
  buyHigh: number | null;
  buyZoneType: 'threshold' | 'range';
  currentPrice: number | null;
  imageElement?: React.ReactNode;
  commentary?: string | null;
  preferredPrinting?: string;
  preferredCondition?: string;
}

// ─── Signal Helpers ─────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getTrend(slope: number | null) {
  if (slope == null) return { label: 'No data', score: 12 };
  if (slope < -1.0) return { label: 'Strong Downtrend', score: 25 };
  if (slope < -0.3) return { label: 'Downtrend', score: 20 };
  if (slope <= 0.3) return { label: 'Sideways', score: 12 };
  if (slope <= 1.0) return { label: 'Uptrend', score: 5 };
  return { label: 'Strong Uptrend', score: 0 };
}

function getMomentum(c7: number | null, c30: number | null) {
  const avg = ((c7 ?? 0) + (c30 ?? 0)) / 2;
  if (avg < -5) return { label: 'Falling', score: 25 };
  if (avg < -1) return { label: 'Cooling', score: 20 };
  if (avg <= 1) return { label: 'Stable', score: 15 };
  if (avg <= 5) return { label: 'Rising', score: 8 };
  return { label: 'Surging', score: 2 };
}

function getMomentumLabel(pct: number | null) {
  if (pct == null) return 'No data';
  if (Math.abs(pct) < 3) return 'Flat';
  if (pct >= 20) return 'Surging';
  if (pct >= 5) return 'Rising';
  if (pct <= -20) return 'Crashing';
  if (pct <= -5) return 'Falling';
  return pct > 0 ? 'Rising' : 'Cooling';
}

function getPosition(pos: number | null) {
  if (pos == null) return { label: 'Unknown', score: 15 };
  const p = pos * 100;
  if (p <= 25) return { label: 'Bottom of range', score: 30 };
  if (p <= 50) return { label: 'Lower-mid', score: 22 };
  if (p <= 75) return { label: 'Upper-mid', score: 12 };
  return { label: 'Near top of range', score: 3 };
}

function getVolatility(cov: number | null) {
  if (cov == null) return { label: 'Unknown', score: 10 };
  if (cov < 0.02) return { label: 'Low', score: 18 };
  if (cov < 0.06) return { label: 'Medium', score: 10 };
  return { label: 'High', score: 3 };
}

function getActionFromRec(rec: { label: string; color: string; tooltip?: string }): { label: string; scoreColor: string; badgeBg: string; badgeText: string; tooltip?: string } {
  const colorMap: Record<string, { scoreColor: string; badgeBg: string; badgeText: string }> = {
    'text-success': { scoreColor: 'text-success', badgeBg: 'bg-success/20', badgeText: 'text-success' },
    'text-teal-400': { scoreColor: 'text-teal-400', badgeBg: 'bg-teal-400/20', badgeText: 'text-teal-400' },
    'text-blue-400': { scoreColor: 'text-blue-400', badgeBg: 'bg-blue-400/20', badgeText: 'text-blue-400' },
    'text-yellow-400': { scoreColor: 'text-yellow-400', badgeBg: 'bg-yellow-400/20', badgeText: 'text-yellow-400' },
    'text-orange-400': { scoreColor: 'text-orange-400', badgeBg: 'bg-orange-400/20', badgeText: 'text-orange-400' },
  };
  const colors = colorMap[rec.color] ?? colorMap['text-yellow-400'];
  return { label: rec.label, ...colors, tooltip: rec.tooltip };
}

function getBarColor(score: number) {
  if (score >= 80) return 'from-success/70 to-success';
  if (score >= 65) return 'from-success/50 to-success/80';
  if (score >= 50) return 'from-blue-400/70 to-blue-400';
  if (score >= 35) return 'from-yellow-400/70 to-yellow-400';
  return 'from-orange-400/70 to-orange-400';
}

function getSignalBarColor(label: string, type: 'trend' | 'momentum' | 'risk') {
  if (type === 'trend') {
    if (label.includes('Downtrend')) return 'bg-success';
    if (label === 'Sideways') return 'bg-warning';
    if (label.includes('Uptrend')) return 'bg-destructive';
    return 'bg-muted-foreground/30';
  }
  if (type === 'momentum') {
    if (label === 'Falling' || label === 'Cooling') return 'bg-success';
    if (label === 'Stable') return 'bg-warning';
    if (label === 'Rising' || label === 'Surging') return 'bg-destructive';
    return 'bg-muted-foreground/30';
  }
  if (label === 'Low') return 'bg-success';
  if (label === 'Medium') return 'bg-warning';
  if (label === 'High') return 'bg-destructive';
  return 'bg-muted-foreground/30';
}

function getSignalBarWidth(label: string, type: 'trend' | 'momentum' | 'risk') {
  if (type === 'trend') {
    if (label === 'Strong Downtrend') return 95;
    if (label === 'Downtrend') return 70;
    if (label === 'Sideways') return 45;
    if (label === 'Uptrend') return 70;
    if (label === 'Strong Uptrend') return 95;
    return 45;
  }
  if (type === 'momentum') {
    if (label === 'Falling') return 95;
    if (label === 'Cooling') return 65;
    if (label === 'Stable') return 35;
    if (label === 'Rising') return 70;
    if (label === 'Surging') return 95;
    return 40;
  }
  if (label === 'Low') return 90;
  if (label === 'Medium') return 55;
  if (label === 'High') return 90;
  return 45;
}

function getWhySentence(trend: { label: string }, momentum: { label: string }, position: { label: string }) {
  const parts: string[] = [];

  // Trend in plain English
  if (trend.label === 'Strong Downtrend') parts.push('price has been dropping sharply');
  else if (trend.label === 'Downtrend') parts.push('price has been trending down');
  else if (trend.label === 'Sideways') parts.push('price has been stable');
  else if (trend.label === 'Uptrend') parts.push('price has been climbing');
  else if (trend.label === 'Strong Uptrend') parts.push('price has been surging');

  // Position in plain English
  if (position.label === 'Bottom of range') parts.push('currently near its lowest recent price');
  else if (position.label === 'Lower-mid') parts.push('sitting in the lower half of its range');
  else if (position.label === 'Upper-mid') parts.push('in the upper half of its range');
  else if (position.label === 'Near top of range') parts.push('near its recent high');

  // Momentum in plain English
  if (momentum.label === 'Falling') parts.push('and losing steam');
  else if (momentum.label === 'Cooling') parts.push('and starting to cool off');
  else if (momentum.label === 'Rising') parts.push('and picking up speed');
  else if (momentum.label === 'Surging') parts.push('and moving fast');

  if (parts.length === 0) return 'Not enough data to analyze yet.';
  const sentence = parts.join(', ') + '.';
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// ─── Graded Pricing Section ─────────────────────────────────────────────────

interface GradeEntry { company: string; grade: string; price: number; population?: number | null; }

function GradedPricingSection({ cardName, cardNumber, setName, rawPrice }: { cardName: string | null; cardNumber: string | null; setName: string | null; rawPrice: number | null }) {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [collectrRawPrice, setCollectrRawPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!cardName) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // ── Use Collectr API for graded pricing ──
        // Collectr search returns [] for verbose queries; try simpler ones too.
        const candidates = [
          cardNumber ? `${cardName} ${cardNumber}` : null,
          cardName,
        ].filter(Boolean) as string[];

        let hits: any[] = [];
        for (const q of candidates) {
          const { data: searchData, error: searchErr } = await supabase.functions.invoke('collectr', {
            body: { action: 'search', params: { searchString: q, categories: 'pokemon' } },
          });
          if (cancelled) return;
          if (searchErr) throw new Error(searchErr.message);
          const arr: any[] = Array.isArray(searchData)
            ? searchData
            : (searchData?.results || searchData?.data || searchData?.products || []);
          if (arr.length > 0) { hits = arr; break; }
        }

        if (setName && hits.length > 1) {
          const wanted = setName.toLowerCase();
          const filt = hits.filter(r => {
            const s = String(r.setName || r.set_name || '').toLowerCase();
            return s && (s.includes(wanted) || wanted.includes(s));
          });
          if (filt.length > 0) hits = filt;
        }

        const top = hits[0];
        const productId = top?.id || top?.productId || top?.product_id || top?.uuid;
        if (!productId) { setGrades([]); setFetched(true); return; }

        const { data: prodResp, error: prodErr } = await supabase.functions.invoke('collectr', {
          body: { action: 'getProduct', params: { productId, gradingData: true } },
        });
        if (cancelled) return;
        if (prodErr) throw new Error(prodErr.message);
        if (prodResp?.error) throw new Error(prodResp.error);

        const product: any = prodResp?.data || prodResp;
        setMatchedName(product?.productName || product?.name || top?.productName || top?.name || null);

        // ── Raw market price comes from Collectr's `marketPrice[0].price` ──
        const mp = product?.marketPrice;
        let rawFromCollectr: number | null = null;
        if (Array.isArray(mp) && mp.length > 0) {
          // Prefer Holofoil if multiple types are present, else first entry.
          const preferred = mp.find((m: any) => String(m?.type ?? '').toLowerCase().includes('holo')) || mp[0];
          const v = typeof preferred?.price === 'string' ? parseFloat(preferred.price) : Number(preferred?.price);
          if (Number.isFinite(v) && v > 0) rawFromCollectr = v;
        } else if (mp && typeof mp === 'object') {
          const v = typeof (mp as any).price === 'string' ? parseFloat((mp as any).price) : Number((mp as any).price);
          if (Number.isFinite(v) && v > 0) rawFromCollectr = v;
        }
        if (!cancelled) setCollectrRawPrice(rawFromCollectr);

        // Collectr returns a flat `gradedPrices` array. Each row looks like:
        //   { grade: "PSA 9.0 (MINT)", population: "86", price: "843.0000", type: "Holofoil" }
        // The grading company is embedded in the `grade` string prefix.
        const gradedRaw =
          product?.gradedPrices ||
          product?.gradingData ||
          product?.graded ||
          product?.grades ||
          product?.gradedPricing;
        const entries: GradeEntry[] = [];

        const parseCompanyAndGrade = (raw: string): { company: string; grade: string } | null => {
          const s = String(raw).trim();
          // Match "PSA 10", "BGS 9.5", "CGC 8.0 (Mint)", "SGC 9", "ACE 7.0 (NM)" etc.
          const m = s.match(/^([A-Za-z]{2,5})\s+([0-9]+(?:\.[0-9]+)?)/);
          if (!m) return null;
          return { company: m[1].toUpperCase(), grade: m[2] };
        };

        const pushEntry = (company: string, grade: string | number, info: any) => {
          const inf = (info && typeof info === 'object' && !Array.isArray(info)) ? info : { price: info };
          const priceRaw = inf.price ?? inf.marketPrice ?? inf.market ?? inf.value ?? inf.lastSale;
          const price = typeof priceRaw === 'string' ? parseFloat(priceRaw) : Number(priceRaw);
          if (!Number.isFinite(price) || price <= 0) return;
          const popRaw = inf.population ?? inf.pop ?? inf.count ?? null;
          const pop = popRaw != null ? Number(popRaw) : null;
          entries.push({
            company: String(company).toUpperCase(),
            grade: String(grade),
            price,
            population: Number.isFinite(pop as number) ? pop : null,
          });
        };

        if (Array.isArray(gradedRaw)) {
          for (const row of gradedRaw as any[]) {
            // Prefer explicit company field if present, else parse from grade label.
            let company = row.grader || row.company || row.gradingCompany || '';
            let grade = row.grade ?? row.gradeLabel ?? '';
            if (!company && typeof grade === 'string') {
              const parsed = parseCompanyAndGrade(grade);
              if (parsed) {
                company = parsed.company;
                grade = parsed.grade;
              }
            }
            if (company) pushEntry(company, grade, row);
          }
        } else if (gradedRaw && typeof gradedRaw === 'object') {
          for (const [company, val] of Object.entries(gradedRaw as Record<string, any>)) {
            if (val && typeof val === 'object' && !Array.isArray(val)) {
              for (const [grade, info] of Object.entries(val as Record<string, any>)) {
                pushEntry(company, grade, info);
              }
            }
          }
        }

        // Deduplicate: keep highest price per (company, grade) pair.
        const dedup = new Map<string, GradeEntry>();
        for (const e of entries) {
          const key = `${e.company}|${e.grade}`;
          const cur = dedup.get(key);
          if (!cur || e.price > cur.price) dedup.set(key, e);
        }
        const finalEntries = Array.from(dedup.values()).sort((a, b) => b.price - a.price);
        setGrades(finalEntries);
        setFetched(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
        setFetched(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [cardName, cardNumber, setName]);

  if (!cardName) return null;

  const isEmpty = !loading && fetched && grades.length === 0 && !error;

  // Prefer Collectr's marketPrice as the raw baseline (it's the source of truth
  // matching the graded prices). Fall back to the upstream price prop if missing.
  const effectiveRaw = collectrRawPrice ?? rawPrice;
  const rawSource: 'collectr' | 'market' | null =
    collectrRawPrice != null ? 'collectr' : (rawPrice != null && rawPrice > 0 ? 'market' : null);

  const byCompany: Record<string, { grade: string; price: number; population?: number | null }[]> = {};
  for (const g of grades) {
    const key = g.company.toUpperCase();
    if (!byCompany[key]) byCompany[key] = [];
    byCompany[key].push({ grade: g.grade, price: g.price, population: g.population });
  }

  // Find PSA 10 specifically for the hero display
  const psa10 = grades.find(g => g.company.toLowerCase() === 'psa' && g.grade.toLowerCase().includes('10'));
  const heroGrade = psa10 || grades[0] || null;
  const heroPremium = heroGrade && effectiveRaw && effectiveRaw > 0
    ? ((heroGrade.price / effectiveRaw - 1) * 100)
    : null;

  // Sort helper: extract numeric grade value, higher first
  const gradeOrder = (g: string) => {
    const num = parseFloat(g.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Multiplier (e.g. 4.2× the raw)
  const heroMultiple = heroGrade && effectiveRaw && effectiveRaw > 0
    ? heroGrade.price / effectiveRaw
    : null;

  // Build a "best price per grade across all companies" comparison table.
  // For each numeric grade (10, 9.5, 9, 8.5, …) we pick the highest price
  // available across PSA / BGS / CGC so we can show how value scales by grade.
  const bestByGrade = new Map<number, { grade: string; price: number; company: string; population?: number | null }>();
  for (const g of grades) {
    const n = parseFloat(g.grade.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(n)) continue;
    const cur = bestByGrade.get(n);
    if (!cur || g.price > cur.price) {
      bestByGrade.set(n, { grade: g.grade, price: g.price, company: g.company, population: g.population });
    }
  }
  const gradeProgression = Array.from(bestByGrade.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([n, v]) => ({
      gradeNum: n,
      ...v,
      premium: effectiveRaw && effectiveRaw > 0 ? (v.price / effectiveRaw - 1) * 100 : null,
      multiple: effectiveRaw && effectiveRaw > 0 ? v.price / effectiveRaw : null,
    }));
  const maxGradePrice = gradeProgression.reduce((m, r) => Math.max(m, r.price), 0);

  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/70 backdrop-blur-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <Award className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Graded Pricing</h2>
        <Badge variant="secondary" className="text-[10px]">PSA / BGS / CGC</Badge>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Collectr</Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6 justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading graded data…</span>
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground py-4">{error}</p>
      ) : isEmpty ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No graded pricing data available for this card yet.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Collectr does not currently track PSA / BGS / CGC sales for this exact product.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ─── Hero: Raw vs PSA 10 side-by-side comparison ─── */}
          {heroGrade && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                {/* Raw */}
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Raw / Ungraded</p>
                  <p className="text-2xl md:text-3xl font-black tabular-nums text-foreground mt-2">
                    {rawPrice != null && rawPrice > 0
                      ? `$${rawPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">market price</p>
                </div>

                {/* Arrow + multiple */}
                <div className="flex flex-col items-center justify-center px-2">
                  <div className="hidden sm:block text-2xl text-muted-foreground/60">→</div>
                  {heroMultiple != null && (
                    <p className="text-xs font-bold text-primary tabular-nums mt-1">
                      {heroMultiple.toFixed(1)}×
                    </p>
                  )}
                </div>

                {/* PSA 10 (or best) */}
                <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                    {heroGrade.company.toUpperCase()} {heroGrade.grade}
                  </p>
                  <p className="text-2xl md:text-3xl font-black tabular-nums text-foreground mt-2">
                    ${heroGrade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {heroPremium != null && (
                    <p className={cn(
                      'text-[11px] font-bold mt-1 tabular-nums',
                      heroPremium > 0 ? 'text-success' : 'text-warning'
                    )}>
                      {heroPremium > 0 ? '+' : ''}{heroPremium.toFixed(0)}% gain on grading
                    </p>
                  )}
                </div>
              </div>

              {/* Plain-language summary */}
              {rawPrice != null && rawPrice > 0 && heroPremium != null && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  A {heroGrade.company.toUpperCase()} {heroGrade.grade} sells for{' '}
                  <span className="font-bold text-foreground">
                    ${(heroGrade.price - rawPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>{' '}
                  more than a raw copy
                  {heroMultiple != null && <> — that&apos;s <span className="font-bold text-primary">{heroMultiple.toFixed(1)}×</span> the raw price.</>}
                </p>
              )}
              {matchedName && (
                <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">Data from: {matchedName}</p>
              )}
            </div>
          )}

          {/* ─── Grade-by-grade value progression (best price per grade across companies) ─── */}
          {gradeProgression.length > 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                How value scales by grade
              </p>
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Grade</th>
                      <th className="text-right px-3 py-2 font-semibold">Price</th>
                      <th className="text-right px-3 py-2 font-semibold hidden sm:table-cell">vs Raw</th>
                      <th className="text-right px-3 py-2 font-semibold hidden md:table-cell">Multiple</th>
                      <th className="px-3 py-2 font-semibold w-[35%]">Relative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Raw row first as baseline */}
                    {rawPrice != null && rawPrice > 0 && (
                      <tr className="border-t border-border/30 bg-muted/10">
                        <td className="px-3 py-2 font-bold text-foreground">Raw</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">
                          ${rawPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden sm:table-cell">—</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">1.0×</td>
                        <td className="px-3 py-2">
                          <div className="h-1.5 rounded-full bg-muted-foreground/30" style={{ width: `${maxGradePrice > 0 ? (rawPrice / maxGradePrice) * 100 : 0}%` }} />
                        </td>
                      </tr>
                    )}
                    {gradeProgression.map((row) => {
                      const widthPct = maxGradePrice > 0 ? (row.price / maxGradePrice) * 100 : 0;
                      const isTop = row.gradeNum === gradeProgression[0].gradeNum;
                      return (
                        <tr key={`prog-${row.gradeNum}`} className={cn('border-t border-border/30', isTop && 'bg-primary/5')}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={cn(
                                'text-[10px] px-1.5 py-0 font-bold',
                                isTop ? 'border-primary/50 text-primary' : 'border-border/50'
                              )}>
                                {row.grade}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground uppercase">{row.company}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">
                            ${row.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={cn(
                            'px-3 py-2 text-right tabular-nums hidden sm:table-cell font-medium',
                            row.premium != null && row.premium > 0 ? 'text-success' : 'text-warning'
                          )}>
                            {row.premium != null ? `${row.premium > 0 ? '+' : ''}${row.premium.toFixed(0)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                            {row.multiple != null ? `${row.multiple.toFixed(1)}×` : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div
                              className={cn('h-1.5 rounded-full', isTop ? 'bg-primary' : 'bg-primary/40')}
                              style={{ width: `${widthPct}%` }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                Showing the highest price available at each grade across PSA, BGS, and CGC.
              </p>
            </div>
          )}

          {/* Expandable: all other grades */}
          {grades.length > 1 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {expanded
                  ? <>Hide full breakdown by company <ChevronUp className="w-3.5 h-3.5" /></>
                  : <>View full breakdown by company ({grades.length}) <ChevronDown className="w-3.5 h-3.5" /></>}
              </button>

              {expanded && (
                <div className="space-y-5 pt-2">
                  {Object.entries(byCompany).map(([company, gs]) => (
                    <div key={company}>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{company}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {gs
                          .sort((a, b) => gradeOrder(b.grade) - gradeOrder(a.grade))
                          .map((g) => {
                            const premium = rawPrice && rawPrice > 0 ? ((g.price / rawPrice - 1) * 100) : null;
                            return (
                              <div key={`${company}-${g.grade}`} className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary font-bold">
                                    {g.grade}
                                  </Badge>
                                  <span className="text-sm font-bold tabular-nums text-foreground">
                                    ${g.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {premium != null && (
                                  <p className={cn(
                                    'text-[10px] tabular-nums mt-0.5 text-right font-medium',
                                    premium > 0 ? 'text-success' : 'text-warning'
                                  )}>
                                    {premium > 0 ? '+' : ''}{premium.toFixed(0)}% vs raw
                                  </p>
                                )}
                                {g.population != null && g.population > 0 && (
                                  <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 text-right">
                                    Pop {g.population.toLocaleString()}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BuySignalPanel({ tcgApiId, cardId, category, buyPrice, buyLow, buyHigh, buyZoneType, currentPrice, imageElement, commentary, preferredPrinting, preferredCondition }: Props) {
  const [card, setCard] = useState<JustTCGCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [snapshotData, setSnapshotData] = useState<{ price_change_90d: number | null; min_price_90d: number | null; max_price_90d: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCard = async (retries = 2) => {
      setLoading(true);
      setError(null);
      try {
        // Try JustTCG by tcgplayerId first (works for both sources), plus snapshot data
        const [jtcgByTcgRes, snapRes] = await Promise.all([
          supabase.functions.invoke('justtcg', {
            body: { action: 'getCardByTcgPlayerId', cardId: tcgApiId },
          }),
          supabase
            .from('market_snapshots')
            .select('price_change_90d, price_change_30d, price_change_7d')
            .or(`card_id.eq.${cardId || tcgApiId},tcgplayer_id.eq.${tcgApiId}`)
            .not('price_change_90d', 'is', null)
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        let foundCard = jtcgByTcgRes.data?.data?.[0];

        // If tcgplayerId lookup failed, try JustTCG internal cardId
        if (!foundCard) {
          if (jtcgByTcgRes.data?.error?.includes('429') && retries > 0) {
            await new Promise(r => setTimeout(r, 2000));
            return fetchCard(retries - 1);
          }
          const jtcgByIdRes = await supabase.functions.invoke('justtcg', {
            body: { action: 'getCard', cardId: tcgApiId },
          });
          if (cancelled) return;
          if (jtcgByIdRes.data?.error?.includes('429') && retries > 0) {
            await new Promise(r => setTimeout(r, 2000));
            return fetchCard(retries - 1);
          }
          foundCard = jtcgByIdRes.data?.data?.[0];
        }

        if (foundCard) {
          setCard(foundCard);
        } else {
          // Neither JustTCG lookup worked — fall back to PPT API
          try {
            const pptRes = await supabase.functions.invoke('pokemon-price-tracker', {
              body: { action: 'getCardById', params: { tcgPlayerId: tcgApiId, includeHistory: true, days: 180 } },
            });
            if (cancelled) return;
            const pptCard = pptRes.data?.data?.[0] || pptRes.data?.data;
            if (pptCard) {
              const market = pptCard.prices?.market ?? pptCard.price ?? null;
              const primaryPrinting = pptCard.prices?.primaryPrinting || Object.keys(pptCard.prices?.variants || {})[0] || 'Normal';

              const priceHistory: PriceHistoryPoint[] = [];
              const nmHistory = pptCard.priceHistory?.conditions?.['Near Mint']?.history;
              if (Array.isArray(nmHistory)) {
                for (const h of nmHistory) {
                  if (h.market != null && h.date) {
                    priceHistory.push({ p: h.market, t: new Date(h.date).getTime() / 1000 });
                  }
                }
              }

              const mappedCard: JustTCGCard = {
                name: pptCard.name || 'Unknown',
                number: pptCard.cardNumber || null,
                rarity: pptCard.rarity || null,
                set_name: pptCard.setName || null,
                tcgplayerId: String(pptCard.tcgPlayerId || tcgApiId),
                variants: [{
                  condition: 'Near Mint',
                  printing: primaryPrinting,
                  language: 'English',
                  price: market,
                  avgPrice: null,
                  avgPrice30d: null,
                  priceChange24hr: null,
                  priceChange7d: null,
                  priceChange30d: null,
                  minPrice7d: null,
                  maxPrice7d: null,
                  minPrice30d: null,
                  maxPrice30d: null,
                  trendSlope7d: null,
                  trendSlope30d: null,
                  stddevPopPrice7d: null,
                  stddevPopPrice30d: null,
                  covPrice7d: null,
                  covPrice30d: null,
                  iqrPrice7d: null,
                  iqrPrice30d: null,
                  priceChangesCount7d: null,
                  priceChangesCount30d: null,
                  priceRelativeTo30dRange: null,
                  lastUpdated: null,
                  priceHistory,
                }],
              };
              setCard(mappedCard);
            } else {
              setError('Not found');
            }
          } catch {
            setError('Not found');
          }
        }

        if (snapRes.data) {
          setSnapshotData({
            price_change_90d: snapRes.data.price_change_90d,
            min_price_90d: null,
            max_price_90d: null,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCard();
    return () => { cancelled = true; };
  }, [tcgApiId, cardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Analyzing…</span>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">{error === 'Not found' ? 'No market data available for this card.' : error || 'No market data available'}</p>
        {error && error !== 'Not found' && (
          <button onClick={() => { setError(null); setLoading(true); }} className="mt-3 text-xs text-accent hover:underline">Try again</button>
        )}
      </div>
    );
  }

  const preferredCond = preferredCondition || (category === 'Sealed' ? 'Sealed' : 'Near Mint');
  // Pick the best variant: prefer matching printing + condition
  const matchingVariants = card.variants?.filter(x => x.condition === preferredCond) || [];
  
  // If a specific printing was requested, try to match it first
  let v: JustTCGVariant | undefined;
  if (preferredPrinting && matchingVariants.length > 0) {
    v = matchingVariants.find(x => x.printing === preferredPrinting);
  }
  // Fall back to highest-priced variant with matching condition
  if (!v && matchingVariants.length > 0) {
    v = matchingVariants.reduce((best, cur) => {
      const bestPrice = best.price ?? 0;
      const curPrice = cur.price ?? 0;
      if (curPrice > bestPrice) return cur;
      if (curPrice === bestPrice && (cur.lastUpdated ?? 0) > (best.lastUpdated ?? 0)) return cur;
      return best;
    });
  }
  // Final fallback
  if (!v) v = card.variants?.[0];
  if (!v) return null;

  const displayPrice = currentPrice ?? v.price;

  // Use the shared v2 Buy Score engine for consistency with list cards
  const moverCard: MoverCard = {
    id: tcgApiId,
    card_id: cardId || tcgApiId,
    name: card.name,
    set_name: card.set_name,
    rarity: card.rarity,
    tcgplayer_id: card.tcgplayerId,
    price: displayPrice ?? null,
    price_change_7d: v.priceChange7d,
    price_change_30d: v.priceChange30d,
    price_change_90d: snapshotData?.price_change_90d ?? null,
    product_type: category,
    min_price_7d: v.minPrice7d,
    max_price_7d: v.maxPrice7d,
    min_price_30d: v.minPrice30d,
    max_price_30d: v.maxPrice30d,
    trend_slope_30d: v.trendSlope30d,
    cov_price_30d: v.covPrice30d,
  };
  const { buyScore: score } = getBuyScore(moverCard);
  const action = getActionFromRec(getRecommendation(score, moverCard));

  // Keep these for the signal breakdown UI
  const trend = getTrend(v.trendSlope30d);
  const momentum = getMomentum(v.priceChange7d, v.priceChange30d);
  const position = getPosition(v.priceRelativeTo30dRange);
  const volatility = getVolatility(v.covPrice30d);

  // Auto-calculate buy zone from market data when none provided
  const explicitTarget = buyZoneType === 'threshold' ? buyPrice : buyHigh;
   // Smart Offer = tiered discount below market max (maxPrice30d), never above current price
   // $1000+ → 10-12% off, $100+ → 15% off, under $100 → 20% off
   const autoTarget = explicitTarget == null && v.maxPrice30d != null
     ? (() => {
         const max = v.maxPrice30d!;
         const discount = max >= 1000 ? 0.88 : max >= 100 ? 0.85 : 0.80;
         return Math.round(max * discount * 100) / 100;
       })()
     : null;
  let target = explicitTarget ?? autoTarget;
  // Smart Offer should never be above the current price
  if (target != null && displayPrice != null && target > displayPrice) {
    target = displayPrice;
  }
  const explicitLow = buyZoneType === 'range' && buyLow ? buyLow : null;
  const autoLow = explicitLow == null && target != null && v.minPrice30d != null
    ? Math.min(v.minPrice30d, target * 0.92)
    : null;
  let bestLow = explicitLow ?? autoLow ?? (target ? target * 0.95 : null);
  // If lower end of range is below current price and target equals current, use the lower price as smart offer
  if (bestLow != null && target != null && bestLow < target) {
    // keep range as is
  } else if (bestLow != null && target != null) {
    bestLow = target * 0.95;
  }

  const whySentence = getWhySentence(trend, momentum, position);

  const momentumRows: { period: string; label: string; pct: number | null }[] = [
    { period: '24h', label: getMomentumLabel(v.priceChange24hr), pct: v.priceChange24hr },
    { period: '7d', label: getMomentumLabel(v.priceChange7d), pct: v.priceChange7d },
    { period: '30d', label: getMomentumLabel(v.priceChange30d), pct: v.priceChange30d },
  ];

  const riskLabel = volatility.label === 'Low' ? 'Low Risk' : volatility.label === 'High' ? 'High Risk' : 'Medium Risk';
  const riskEmoji = volatility.label === 'Low' ? '🟢' : volatility.label === 'High' ? '🔴' : '🟡';
  const riskColor = volatility.label === 'Low' ? 'text-success' : volatility.label === 'High' ? 'text-destructive' : 'text-warning';

  const signalRows: { label: string; value: string; type: 'trend' | 'momentum' | 'risk'; emoji: string }[] = [
    { label: 'Trend', value: trend.label, type: 'trend', emoji: trend.label === 'Sideways' ? '—' : trend.label.includes('Downtrend') ? '📉' : '📈' },
    { label: 'Momentum', value: momentum.label, type: 'momentum', emoji: momentum.label === 'Surging' ? '🚀' : momentum.label === 'Rising' ? '📈' : momentum.label === 'Falling' ? '📉' : '' },
    { label: 'Volatility', value: volatility.label, type: 'risk', emoji: volatility.label === 'Low' ? '🟢' : volatility.label === 'High' ? '🔴' : '🟡' },
  ];

  // Build image if none provided externally
  const imgUrl = card.tcgplayerId ? `https://product-images.tcgplayer.com/fit-in/437x437/${card.tcgplayerId}.jpg` : null;
  const showHero = !imageElement;

  return (
    <div className="space-y-5">
      {/* ═══ PRODUCT HEADER (when no external image/title) ═══ */}
      {showHero && (
        <div className="mb-1">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-foreground">{card.name}</h1>
            <WatchlistButton
              card={{ card_id: cardId || tcgApiId, name: card.name, set_name: card.set_name, rarity: card.rarity }}
              showLabel
            />
          </div>
          <p className="text-base text-muted-foreground mt-1">
            {card.set_name}{card.number ? ` · #${card.number}` : ''}{card.rarity ? ` · ${card.rarity}` : ''}{v.printing ? ` · ${v.printing}` : ''}{v.condition ? ` · ${v.condition}` : ''}
          </p>
        </div>
      )}

      {/* ═══ HERO ROW: Image + Buy Signal + Momentum ═══ */}
      <div className={cn('grid gap-5', (imageElement || imgUrl) ? 'grid-cols-1 lg:grid-cols-[180px_1fr]' : 'grid-cols-1')}>
        {(imageElement || imgUrl) && (
          <div className="flex flex-col items-center lg:items-start gap-3">
            {imageElement || (imgUrl && (
              <img
                src={imgUrl}
                alt={card.name}
                className="w-32 h-44 lg:w-40 lg:h-56 object-contain rounded-xl flex-shrink-0"
                style={{ filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.35))' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ))}
            {commentary && (
              <p className="text-xs text-foreground/60 leading-relaxed text-center lg:text-left">{commentary}</p>
            )}
          </div>
        )}

        <div>
          {/* Buy Signal */}
          <div className="rounded-xl border border-border/50 bg-card/40 p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Buy Signal</p>
            <div className="flex items-end gap-3 mb-3">
              <span className={cn('text-6xl font-black tabular-nums leading-none', action.scoreColor)}>{score}</span>
              <span className="text-base text-muted-foreground font-medium pb-1">/ 100</span>
              <span className={cn('inline-block px-4 py-1.5 rounded-full text-base font-bold tracking-wide', action.badgeBg, action.badgeText)}>
                {action.label}
              </span>
            </div>
            <div className="w-[85%] mb-3">
              <div className="relative h-3.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', getBarColor(score))}
                  style={{
                    width: `${score}%`,
                    boxShadow: score >= 65
                      ? '0 0 16px hsl(var(--success) / 0.35)'
                      : score >= 50
                        ? '0 0 16px rgba(96, 165, 250, 0.35)'
                        : score >= 35
                          ? '0 0 16px rgba(250, 204, 21, 0.35)'
                          : '0 0 16px rgba(251, 146, 60, 0.35)',
                  }}
                />
              </div>
            </div>
            {action.tooltip && (
              <p className="text-sm text-muted-foreground leading-relaxed">{action.tooltip}</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CURRENT PRICE + BUY ZONE — full width ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayPrice != null && (
          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Current Price</p>
            <p className="text-4xl font-black tabular-nums text-foreground">${displayPrice.toFixed(2)}</p>
          </div>
        )}
        {target != null && (
          <div className="rounded-xl border-2 border-success/50 bg-success/5 p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Smart Offer</p>
            <p className="text-3xl font-black tabular-nums text-foreground">${target.toFixed(2)}</p>
            {bestLow && (
              <p className="text-sm text-muted-foreground mt-1">Range: ${bestLow.toFixed(2)} – ${target.toFixed(2)}</p>
            )}
            {displayPrice != null && (
              <p className={cn('text-sm font-semibold mt-1.5', displayPrice <= target ? 'text-success' : 'text-success/70')}>
                {displayPrice <= target
                  ? '✅ In the Smart Offer zone!'
                  : `$${(displayPrice - target).toFixed(2)} under market`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ SIGNAL BREAKDOWN + MOMENTUM — 2-col on desktop ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Signal Breakdown — vertical rows */}
        <div className="rounded-xl border border-border/50 bg-card/40 p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/80 font-semibold mb-4">Signal Breakdown</p>
          <div className="space-y-4">
            {signalRows.map(({ label, value, type, emoji }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base font-semibold text-foreground">{label}</span>
                  <span className="text-base text-foreground/80">{value} {emoji}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getSignalBarColor(value, type))}
                    style={{ width: `${getSignalBarWidth(value, type)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Momentum Snapshot + Risk */}
        <div className="rounded-xl border border-border/50 bg-card/40 p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/80 font-semibold mb-3">Momentum Snapshot</p>
          <div className="space-y-2">
            {momentumRows.map(({ period, label, pct }) => (
              <div key={period} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-foreground w-8">{period}</span>
                  <span className="text-base text-muted-foreground">{label}</span>
                </div>
                <span className={cn('text-base tabular-nums font-semibold', pct != null && pct >= 0 ? 'text-success' : 'text-destructive')}>
                  {pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/40 mt-3 pt-3 flex items-center justify-between">
            <span className="text-base font-semibold text-foreground">⚡ Risk Level</span>
            <span className={cn('text-base font-semibold', riskColor)}>{riskLabel} {riskEmoji}</span>
          </div>
        </div>
      </div>

      {/* ═══ PRICE HISTORY CHART — full width ═══ */}
      <PriceHistoryChart priceHistory={(v as unknown as Record<string, unknown>).priceHistory as { p: number; t: number }[] ?? []} />

      {/* ═══ STATISTICS + HISTORICAL EXTREMES — 2-col on desktop ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StatisticsByPeriod variant={v} />
        <HistoricalExtremes priceHistory={(v as unknown as Record<string, unknown>).priceHistory as { p: number; t: number }[] ?? []} />
      </div>

      {/* ═══ GRADED PRICING — above 30-day movement ═══ */}
      <GradedPricingSection cardName={card.name} cardNumber={card.number} setName={card.set_name} rawPrice={displayPrice ?? null} />

      {/* ═══ COLLECTR PRICING — cross-source verification ═══ */}
      <CollectrPricingSection cardName={card.name} setName={card.set_name} cardNumber={card.number} />

      {/* ═══ 30-DAY PRICE MOVEMENT — full width ═══ */}
      <PriceMovementTable priceHistory={(v as unknown as Record<string, unknown>).priceHistory as { p: number; t: number }[] ?? []} />

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
        Not a buy or sell recommendation. Signals are informational — always buy what you love. ❤️
      </p>
    </div>
  );
}
