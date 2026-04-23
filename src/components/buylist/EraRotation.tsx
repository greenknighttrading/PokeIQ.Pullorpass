import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Loader2, ArrowUpRight } from 'lucide-react';

/* ── Era Definitions ── */

interface EraConfig {
  key: string;
  label: string;
  years: string;
  keywords: string[];
}

const ERAS: EraConfig[] = [
  {
    key: 'vintage', label: 'Vintage', years: '1996–2006',
    keywords: [
      'base set', 'jungle', 'fossil', 'team rocket', 'gym heroes', 'gym challenge',
      'neo genesis', 'neo discovery', 'neo revelation', 'neo destiny',
      'expedition', 'aquapolis', 'skyridge', 'legendary collection',
      'ex ruby', 'ex sandstorm', 'ex dragon', 'ex team magma', 'ex hidden legends',
      'ex firered', 'ex team rocket returns', 'ex deoxys', 'ex emerald',
      'ex unseen forces', 'ex delta species', 'ex legend maker', 'ex holon phantoms',
      'ex crystal guardians', 'ex dragon frontiers', 'ex power keepers',
      'ex trainer kit', 'ex -',
      'pop series 1', 'pop series 2', 'pop series 3', 'pop series 4', 'pop series 5',
      'wotc', 'wizards', '1st edition', 'shadowless',
    ],
  },
  {
    key: 'mid', label: 'Mid Era', years: '2007–2013',
    keywords: [
      'diamond & pearl', 'dp -', 'dp:', 'dp trainer', 'mysterious treasures', 'secret wonders', 'great encounters',
      'majestic dawn', 'legends awakened', 'stormfront',
      'platinum', 'rising rivals', 'supreme victors', 'arceus',
      'heartgold', 'soulsilver', 'hgss', 'unleashed', 'undaunted', 'triumphant',
      'call of legends',
      'black & white', 'bw -', 'bw:', 'bw trainer', 'bw promos', 'emerging powers', 'noble victories', 'next destinies',
      'dark explorers', 'dragons exalted', 'dragon vault', 'boundaries crossed',
      'plasma storm', 'plasma freeze', 'plasma blast', 'legendary treasures',
      'pop series 6', 'pop series 7', 'pop series 8', 'pop series 9',
      'nintendo promos', 'rumble',
      'kalos starter',
    ],
  },
  {
    key: 'xysm', label: 'XY–SM', years: '2014–2019',
    keywords: [
      'xy -', 'xy:', 'xy base', 'xy promos', 'xy trainer',
      'flashfire', 'furious fists', 'phantom forces', 'primal clash',
      'roaring skies', 'ancient origins', 'breakthrough', 'breakpoint',
      'fates collide', 'steam siege', 'evolutions', 'generations', 'double crisis',
      'sun & moon', 'sm -', 'sm:', 'sm base set', 'sm promos', 'sm trainer',
      'guardians rising', 'burning shadows', 'crimson invasion',
      'ultra prism', 'forbidden light', 'celestial storm', 'lost thunder', 'dragon majesty',
      'team up', 'unbroken bonds', 'unified minds', 'cosmic eclipse',
      'hidden fates', 'shining legends', 'detective pikachu',
      'alternate art promos',
    ],
  },
  {
    key: 'current', label: 'Current', years: '2024–Now',
    keywords: [
      'paldean fates', 'temporal forces', 'twilight masquerade',
      'shrouded fable', 'stellar crown', 'surging sparks',
      'prismatic', 'prismatic evolutions',
      'mega evolution', 'me:', 'me -', 'me0', 'mee:',
      'phantasmal flames', 'ascended heroes', 'perfect order',
      'destined rivals', 'sv10', 'sv: black bolt', 'sv: white flare',
      'black bolt', 'white flare',
      'first partner collection 2026',
    ],
  },
  {
    key: 'ultraModern', label: 'Ultra Modern', years: '2020–2023',
    keywords: [
      'sword & shield', 'swsh', 'rebel clash', 'darkness ablaze', 'vivid voltage',
      'battle styles', 'chilling reign', 'evolving skies', 'fusion strike',
      'brilliant stars', 'astral radiance', 'lost origin', 'silver tempest',
      'crown zenith', 'shining fates', 'celebrations', 'champion\'s path',
      'scarlet & violet', 'sv0', 'sv:', 'sve:', 'paldea evolved', 'obsidian flames',
      '151', 'paradox rift', 'journey together', 'pokemon go',
      'prize pack', 'trick or trade',
    ],
  },
];

function classifySetToEra(setName: string): string {
  const lower = setName.toLowerCase();
  for (const era of ERAS) {
    for (const kw of era.keywords) {
      if (lower.includes(kw)) return era.key;
    }
  }
  return 'ultraModern';
}

/* ── Types ── */

interface SetData {
  name: string;
  set_value_usd: number;
  set_value_change_7d_pct: number | null;
  set_value_change_30d_pct: number | null;
  set_value_change_90d_pct: number | null;
}

interface EraRow {
  key: string;
  label: string;
  years: string;
  totalValue: number;
  median30d: number;
  median90d: number;
  trendScore: number;
  trendColor: 'green' | 'yellow' | 'red';
  itemCount: number;
}

/* ── Calculations ── */

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calcTrendScore(pct7d: number, pct30d: number, pct90d: number): number {
  const s90 = pct90d > 15 ? 40 : pct90d > 5 ? 30 : pct90d > 0 ? 22 : pct90d > -5 ? 12 : 0;
  const s30 = pct30d > 10 ? 30 : pct30d > 3 ? 22 : pct30d > 0 ? 15 : pct30d > -5 ? 8 : 0;
  const s7 = pct7d > 3 ? 20 : pct7d > 0 ? 15 : pct7d > -3 ? 8 : 0;
  return s90 + s30 + s7;
}

function getTrendColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 55) return 'green';
  if (score >= 35) return 'yellow';
  return 'red';
}

const ALL_ERA_KEYS = ['current', 'ultraModern', 'xysm', 'mid', 'vintage'];

function computeEraRows(sets: SetData[]): EraRow[] {
  const eraGroups: Record<string, SetData[]> = {};
  ERAS.forEach(e => { eraGroups[e.key] = []; });
  sets.forEach(s => {
    const era = classifySetToEra(s.name);
    if (eraGroups[era]) eraGroups[era].push(s);
  });

  const eraMap = new Map(ERAS.map(e => [e.key, e]));

  const rows = ALL_ERA_KEYS.map(key => {
    const era = eraMap.get(key)!;
    const items = eraGroups[key];
    if (!items || items.length === 0) {
      return { key: era.key, label: era.label, years: era.years, totalValue: 0, median30d: 0, median90d: 0, trendScore: 0, trendColor: 'red' as const, itemCount: 0 };
    }

    const totalValue = items.reduce((sum, i) => sum + i.set_value_usd, 0);
    const m7d = median(items.map(i => i.set_value_change_7d_pct ?? 0));
    const m30d = median(items.map(i => i.set_value_change_30d_pct ?? 0));
    const m90d = median(items.map(i => i.set_value_change_90d_pct ?? 0));
    const score = calcTrendScore(m7d, m30d, m90d);

    return {
      key: era.key,
      label: era.label,
      years: era.years,
      totalValue,
      median30d: m30d,
      median90d: m90d,
      trendScore: score,
      trendColor: getTrendColor(score),
      itemCount: items.length,
    };
  });

  // Default: era chronological order (oldest first)
  return rows;
}

/* ── Shared UI (matches SetsExplorer) ── */

const barColorMap = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
} as const;

function TrendBar({ color, isTop }: { color: 'green' | 'yellow' | 'red'; isTop?: boolean }) {
  return <div className={cn(
    'rounded-full self-stretch min-h-[28px]',
    barColorMap[color],
    isTop ? 'w-[5px] brightness-125' : 'w-1'
  )} />;
}

function ChangeCell({ value, isTop }: { value: number | null; isTop?: boolean }) {
  if (value == null) return <span className="text-muted-foreground text-xs">—</span>;
  const positive = value >= 0;
  return (
    <span className={cn(
      'font-semibold tabular-nums flex items-center gap-1',
      isTop ? 'text-[13px]' : 'text-xs',
      positive ? (isTop ? 'text-success brightness-125' : 'text-success') : 'text-destructive'
    )}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}


/* ── Component ── */

export default function EraRotation() {
  const [sets, setSets] = useState<SetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState<'era' | '30d' | '90d'>('era');

  useEffect(() => {
    const cacheKey = 'era-rotation-cache';
    let cancelled = false;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.sets?.length > 0 && Date.now() - parsed.cachedAt < 5 * 60 * 1000) {
          setSets(parsed.sets);
          setLoading(false);
          return;
        }
        if (parsed.sets?.length > 0) {
          setSets(parsed.sets);
          setLoading(false);
        }
      }
    } catch {}

    (async () => {
      try {
        const { data } = await supabase.functions.invoke('justtcg', {
          body: { action: 'getSets' },
        });
        const items: SetData[] = Array.isArray(data?.data) ? data.data : [];
        const valid = items.filter(s => s.set_value_usd > 0 && !/^misc/i.test(s.name) && !/miscellaneous/i.test(s.name));
        if (!cancelled) {
          setSets(valid);
          setLoading(false);
          sessionStorage.setItem(cacheKey, JSON.stringify({ sets: valid, cachedAt: Date.now() }));
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const baseRows = useMemo(() => computeEraRows(sets), [sets]);

  const rows = useMemo(() => {
    if (sortCol === 'era') return baseRows; // already in chronological order
    const sorted = [...baseRows];
    if (sortCol === '30d') sorted.sort((a, b) => b.median30d - a.median30d);
    if (sortCol === '90d') sorted.sort((a, b) => b.median90d - a.median90d);
    return sorted;
  }, [baseRows, sortCol]);

  const topEraKey = rows.length > 0 ? rows[0].key : null;

  if (loading) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-center gap-2 py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Loading eras…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <p className="text-sm font-semibold">Era Rotation</p>
        <p className="text-[10px] text-muted-foreground">Median set-level trend by era</p>
      </div>

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-[6px_1fr_75px_75px] gap-2 items-center px-4 py-2 border-b border-border bg-muted/10">
        <span />
        <button onClick={() => setSortCol('era')} className={cn("text-xs font-semibold uppercase tracking-wider text-left", sortCol === 'era' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70 transition-colors cursor-pointer')}>Era</button>
        <button onClick={() => setSortCol('30d')} className={cn("text-xs font-semibold uppercase tracking-wider text-left", sortCol === '30d' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70 transition-colors cursor-pointer')}>30D {sortCol === '30d' ? '▼' : ''}</button>
        <button onClick={() => setSortCol('90d')} className={cn("text-xs font-semibold uppercase tracking-wider text-left", sortCol === '90d' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70 transition-colors cursor-pointer')}>90D {sortCol === '90d' ? '▼' : ''}</button>
      </div>

      {/* Desktop rows */}
      <div className="hidden sm:block divide-y divide-border flex-1">
        {rows.map(era => {
          const isTop = era.key === topEraKey;
          return (
            <div
              key={era.key}
              className={cn(
                "grid grid-cols-[6px_1fr_75px_75px] gap-2 items-center px-4 py-3 border-b border-border last:border-b-0",
                isTop && "bg-primary/[0.06]"
              )}
              style={isTop ? { boxShadow: 'inset 0 0 20px hsl(168 50% 45% / 0.06)' } : undefined}
            >
              <TrendBar color={era.trendColor} isTop={isTop} />
              <div className="min-w-0 flex items-center gap-1.5">
                <p className={cn("text-sm font-semibold truncate", isTop && "text-foreground")}>{era.label}</p>
                {isTop && <ArrowUpRight className="w-3.5 h-3.5 text-success shrink-0" />}
                <div className="flex items-center gap-2 ml-auto">
                  <p className="text-[10px] text-muted-foreground">{era.years}</p>
                  <span className="text-[10px] text-muted-foreground">· {era.itemCount} sets</span>
                </div>
              </div>
              <div><ChangeCell value={era.median30d} isTop={isTop} /></div>
              <div><ChangeCell value={era.median90d} isTop={isTop} /></div>
            </div>
          );
        })}
      </div>

      <div className="sm:hidden divide-y divide-border flex-1">
        {rows.map(era => {
          const isTop = era.key === topEraKey;
          return (
            <div key={era.key} className={cn("px-3 py-3", isTop && "bg-primary/[0.06]")}
              style={isTop ? { boxShadow: 'inset 0 0 20px hsl(168 50% 45% / 0.06)' } : undefined}>
              <div className="flex items-center gap-2 min-w-0">
                <TrendBar color={era.trendColor} isTop={isTop} />
                <p className={cn("text-sm font-semibold truncate flex-1 min-w-0", isTop && "text-foreground")}>{era.label}</p>
                {isTop && <ArrowUpRight className="w-3.5 h-3.5 text-success shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-1 ml-3">
                <span className="text-[10px] text-muted-foreground">{era.itemCount} sets · {era.years}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 ml-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">30D</span>
                  <ChangeCell value={era.median30d} isTop={isTop} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">90D</span>
                  <ChangeCell value={era.median90d} isTop={isTop} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
