import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

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
      'diamond & pearl', 'diamond and pearl', 'dp -', 'dp:', 'dp trainer', 'mysterious treasures', 'secret wonders', 'great encounters',
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
];

const ERA_ORDER = ['vintage', 'mid', 'xysm', 'ultraModern', 'current'];

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

interface SetStats {
  set_name: string;
  cards_count: number;
  total_value: number;
  median_7d: number;
  median_30d: number;
  median_90d: number;
}

interface EraRow {
  key: string;
  label: string;
  years: string;
  median30d: number;
  median90d: number;
  itemCount: number;
}

function weightedMedian(items: { median: number; weight: number }[]): number {
  if (items.length === 0) return 0;
  const sorted = [...items].sort((a, b) => a.median - b.median);
  const totalWeight = sorted.reduce((s, i) => s + i.weight, 0);
  let cumWeight = 0;
  for (const item of sorted) {
    cumWeight += item.weight;
    if (cumWeight >= totalWeight / 2) return item.median;
  }
  return sorted[sorted.length - 1].median;
}

function computeEraRows(sets: SetStats[]): EraRow[] {
  const eraGroups: Record<string, SetStats[]> = {};
  ERAS.forEach(e => { eraGroups[e.key] = []; });
  sets.forEach(s => {
    if (!s || !s.set_name) return;
    const era = classifySetToEra(s.set_name);
    if (eraGroups[era]) eraGroups[era].push(s);
  });

  const eraMap = new Map(ERAS.map(e => [e.key, e]));

  return ERA_ORDER.map(key => {
    const era = eraMap.get(key)!;
    const items = eraGroups[key] || [];
    // Weight by total_value so big sets matter more
    const m30d = weightedMedian(items.map(i => ({ median: i.median_30d, weight: i.total_value })));
    const m90d = weightedMedian(items.map(i => ({ median: i.median_90d, weight: i.total_value })));
    return { key: era.key, label: era.label, years: era.years, median30d: m30d, median90d: m90d, itemCount: items.length };
  });
}

/* Color scale: 5-color diverging palette with gradients */
const ERA_COLORS = {
  strongUp:   { from: 'hsl(152, 65%, 32%)', to: 'hsl(152, 55%, 22%)', label: 'Strong gains' },
  up:         { from: 'hsl(152, 50%, 45%)', to: 'hsl(152, 45%, 35%)', label: 'Gains' },
  neutral:    { from: 'hsl(220, 15%, 55%)', to: 'hsl(220, 15%, 42%)', label: 'Flat' },
  down:       { from: 'hsl(25, 60%, 52%)',  to: 'hsl(25, 55%, 40%)',  label: 'Declining' },
  strongDown: { from: 'hsl(0, 55%, 48%)',   to: 'hsl(0, 50%, 35%)',   label: 'Strong drop' },
};

function getEraStyle(pct: number) {
  if (pct >= 8) return ERA_COLORS.strongUp;
  if (pct >= 2) return ERA_COLORS.up;
  if (pct >= -2) return ERA_COLORS.neutral;
  if (pct >= -8) return ERA_COLORS.down;
  return ERA_COLORS.strongDown;
}

/* ── Component ── */

export default function EraTimeline() {
  const [sets, setSets] = useState<SetStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = 'era-timeline-rpc-cache-v2';
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
        const { data, error } = await supabase.rpc('get_set_stats');
        if (error) throw error;
        const items: SetStats[] = (data ?? []).filter(
          (s: any) => s.total_value > 0 && !/^misc|miscellaneous|league/i.test(s.set_name)
        );
        if (!cancelled) {
          setSets(items);
          setLoading(false);
          sessionStorage.setItem(cacheKey, JSON.stringify({ sets: items, cachedAt: Date.now() }));
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => computeEraRows(sets), [sets]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-center gap-2 py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground text-sm">Loading eras…</span>
        </div>
      </div>
    );
  }

  // Find best/worst era
  const best = [...rows].sort((a, b) => b.median30d - a.median30d)[0];

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 via-muted/30 to-transparent">
        <p className="text-sm font-semibold">Era Rotation</p>
        <p className="text-[10px] text-muted-foreground">
          Value-weighted 30D movement · {best && best.median30d > 0 ? <span className="text-success font-semibold">{best.label} leading +{best.median30d.toFixed(1)}%</span> : 'Mixed market'}
        </p>
      </div>

      {/* Timeline */}
      <div className="px-3 py-4 flex-1 flex flex-col justify-center gap-3">
        {/* Continuous timeline strip */}
        <div className="relative">
          <div className="flex rounded-xl overflow-hidden h-24 sm:h-28 shadow-inner">
            {rows.map((era, idx) => {
              const style = getEraStyle(era.median30d);
              const isBest = best && era.key === best.key && era.median30d > 0;
              const positive = era.median30d >= 0;
              return (
                <div
                  key={era.key}
                  className={cn(
                    'flex-1 flex flex-col items-center justify-center gap-0.5 relative group cursor-default transition-all hover:flex-[1.15]',
                    idx > 0 && 'border-l border-background/30'
                  )}
                  style={{
                    background: `linear-gradient(165deg, ${style.from} 0%, ${style.to} 100%)`,
                  }}
                >
                  {isBest && (
                    <div className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                      ★ Top
                    </div>
                  )}
                  <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-md tracking-tight">
                    {era.label}
                  </span>
                  <div className="flex items-center gap-0.5 text-white drop-shadow-md">
                    {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="text-base sm:text-lg font-extrabold tabular-nums">
                      {positive ? '+' : ''}{era.median30d.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[8px] sm:text-[9px] text-white/70 font-medium">
                    {era.itemCount} sets
                  </span>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 bg-popover border border-border rounded-lg shadow-xl px-3 py-2 whitespace-nowrap">
                    <p className="text-xs font-semibold text-foreground">{era.label}</p>
                    <p className="text-[10px] text-muted-foreground">{era.years} · {era.itemCount} sets</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">30D</span>
                        <span className={cn('text-xs font-bold tabular-nums', era.median30d >= 0 ? 'text-success' : 'text-destructive')}>
                          {era.median30d >= 0 ? '+' : ''}{era.median30d.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">90D</span>
                        <span className={cn('text-xs font-bold tabular-nums', era.median90d >= 0 ? 'text-success' : 'text-destructive')}>
                          {era.median90d >= 0 ? '+' : ''}{era.median90d.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Year markers below */}
          <div className="flex mt-1.5">
            {rows.map((era) => (
              <div key={era.key} className="flex-1 text-center">
                <span className="text-[9px] text-muted-foreground/80 font-medium">{era.years}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Compact legend */}
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1 border-t border-border/40">
          {(['strongUp', 'up', 'neutral', 'down', 'strongDown'] as const).map(k => (
            <div key={k} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `linear-gradient(135deg, ${ERA_COLORS[k].from}, ${ERA_COLORS[k].to})` }} />
              <span className="text-[9px] text-muted-foreground">{ERA_COLORS[k].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
