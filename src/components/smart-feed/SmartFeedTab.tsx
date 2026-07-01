import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, TrendingUp, TrendingDown, Eye,
  Zap, PlusCircle, CheckCircle,
  SlidersHorizontal, ChevronDown, Newspaper, ExternalLink, Layers, CreditCard,
  Briefcase, Star, ChevronLeft, ChevronRight, Flame, ShoppingCart,
  Lock, AlertTriangle, ArrowUpRight, ArrowDownRight, ImageOff,
} from 'lucide-react';
import tcgplayerLogo from '@/assets/tcgplayer-logo.png';
import ebayLogo from '@/assets/ebay-logo.svg';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoverCard, getImageUrl, getChangeForTime } from '@/components/buylist/shared/signalHelpers';
import { useWatchlist } from '@/hooks/useWatchlist';
import { matchPokemonCharacter } from '@/lib/pokemonNames';
import SetsExplorer from '@/components/buylist/SetsExplorer';
import EraRotation from '@/components/buylist/EraRotation';
import { Masthead, SectionRule, MarketOverviewBanner, getTrendDotColor, SEALED_NAME_RE } from '@/components/pulse/PulseShared';
import { PokemonEra } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SmartFeedNewsBrief from '@/components/smart-feed/SmartFeedNewsBrief';

/* ── Types ── */
interface Headline { title: string; url: string; excerpt: string; date: string; category: string; }

/* ── CODE card exclusion regex ── */
const CODE_CARD_RE = /\bcode\s*card\b/i;

/* ── Helper: check if a card name is a code card ── */
function isCodeCard(name: string): boolean {
  return CODE_CARD_RE.test(name);
}

/* ── Helper: read rebalance settings from localStorage ── */
function getRebalancePreferences() {
  try {
    const raw = localStorage.getItem('smartFeedRebalanceSettings');
    if (!raw) return { monthlyBudget: 250, assetAllocation: null as { sealed: number; graded: number; raw: number } | null, top2RebalanceEras: [] as PokemonEra[], eraAllocations: {} as Record<string, number> };
    const parsed = JSON.parse(raw);
    const budget = parsed.monthlyBudget ?? 250;
    const assetAllocation = parsed.assetAllocation ?? null;
    const top2RebalanceEras: PokemonEra[] = parsed.top2RebalanceEras ?? [];
    const eraAllocations: Record<string, number> = parsed.eraAllocation ?? {};
    return { monthlyBudget: budget, assetAllocation, top2RebalanceEras, eraAllocations };
  } catch {
    return { monthlyBudget: 250, assetAllocation: null as { sealed: number; graded: number; raw: number } | null, top2RebalanceEras: [] as PokemonEra[], eraAllocations: {} as Record<string, number> };
  }
}

/* ── Helper: fallback to simulator state if no rebalance settings ── */
function getSimulatorPreferences() {
  try {
    const raw = localStorage.getItem('simulatorState');
    if (!raw) return { monthlyBudget: 250, targetEra: null as PokemonEra | null, eraAllocations: {} as Record<string, number> };
    const parsed = JSON.parse(raw);
    const budget = parsed.monthlyBudget ?? 250;

    const era = parsed.era as Record<string, number> | undefined;
    let targetEra: PokemonEra | null = null;
    const eraAllocations: Record<string, number> = {};
    if (era) {
      let maxPct = 0;
      for (const [key, val] of Object.entries(era)) {
        eraAllocations[key] = val;
        if (val > maxPct) { maxPct = val; targetEra = key as PokemonEra; }
      }
    }
    return { monthlyBudget: budget, targetEra, eraAllocations };
  } catch {
    return { monthlyBudget: 250, targetEra: null as PokemonEra | null, eraAllocations: {} as Record<string, number> };
  }
}

/* ── Helper: determine collecting style from allocation ── */
function getCollectingStyle(allocation: { sealed: { percent: number }; slabs: { percent: number }; rawCards: { percent: number } } | null) {
  if (!allocation) return 'balanced';
  const { sealed, slabs, rawCards } = allocation;
  if (sealed.percent >= 50) return 'sealed-heavy';
  if (slabs.percent >= 40) return 'slab-heavy';
  if (rawCards.percent >= 40) return 'raw-heavy';
  return 'balanced';
}

/* ── Helper: extract set exposure from portfolio items ── */
function getSetExposure(items: any[]) {
  const setMap = new Map<string, number>();
  for (const item of items) {
    const setName = item.setName || item.set_name || 'Unknown';
    if (isCodeCard(item.productName || '')) continue;
    setMap.set(setName, (setMap.get(setName) || 0) + (item.totalMarketValue || 0));
  }
  return Array.from(setMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/* ── Helper: extract Pokemon character name from card name (uses canonical list) ── */
function extractPokemonCharacter(cardName: string): string | null {
  return matchPokemonCharacter(cardName);
}

/* ── Helper: build Pokemon character indexes from portfolio ── */
function buildPokemonIndexes(items: any[]) {
  const charMap = new Map<string, { count: number; totalValue: number; cardNames: string[] }>();

  for (const item of items) {
    const name = item.productName || '';
    if (isCodeCard(name)) continue;
    if (SEALED_NAME_RE.test(name)) continue;

    const character = extractPokemonCharacter(name);
    if (!character) continue;

    const existing = charMap.get(character) || { count: 0, totalValue: 0, cardNames: [] };
    existing.count += (item.quantity || 1);
    existing.totalValue += (item.totalMarketValue || 0);
    existing.cardNames.push(name);
    charMap.set(character, existing);
  }

  return Array.from(charMap.entries())
    .filter(([_, data]) => data.count >= 2)
    .map(([name, data]) => ({ name, count: data.count, totalValue: data.totalValue }))
    .sort((a, b) => b.count - a.count);
}

/* ── ERA_SETS mapping for filtering (uses DB set_name conventions) ── */
const ERA_SET_KEYWORDS: Record<PokemonEra, string[]> = {
  vintage: [
    'base set', 'jungle', 'fossil', 'team rocket', 'gym heroes', 'gym challenge',
    'neo genesis', 'neo discovery', 'neo revelation', 'neo destiny',
    'expedition', 'aquapolis', 'skyridge', 'legendary collection', 'southern islands',
    'ruby and sapphire', 'ruby & sapphire', 'sandstorm', 'dragon', 'hidden legends', 'firered & leafgreen', 'firered and leafgreen',
    'deoxys', 'emerald', 'delta species', 'legend maker', 'holon phantoms',
    'crystal guardians', 'dragon frontiers', 'power keepers',
    'pop series 1', 'pop series 2', 'pop series 3', 'pop series 4', 'pop series 5',
  ],
  classic: [
    'diamond and pearl', 'diamond & pearl', 'dp -', 'dp:', 'mysterious treasures', 'secret wonders', 'great encounters',
    'majestic dawn', 'legends awakened', 'stormfront', 'platinum', 'rising rivals',
    'supreme victors', 'arceus',
    'heartgold soulsilver', 'heartgold & soulsilver', 'hgss', 'call of legends',
    'black and white', 'black & white', 'bw -', 'bw:', 'emerging powers', 'noble victories', 'next destinies',
    'dark explorers', 'dragons exalted', 'boundaries crossed',
    'plasma storm', 'plasma freeze', 'plasma blast', 'legendary treasures',
    'pop series 6', 'pop series 7', 'pop series 8', 'pop series 9',
  ],
  modern: [
    'xy base', 'xy -', 'xy:', 'xy promos', 'generations', 'double crisis',
    'sm base', 'sm -', 'sm:', 'sm promos', 'shining legends', 'dragon majesty',
    'detective pikachu', 'hidden fates',
  ],
  ultraModern: [
    'swsh', 'sword & shield', 'sword and shield', 'shining fates', 'celebrations',
    'champion\'s path', 'vivid voltage', 'evolving skies', 'chilling reign',
    'brilliant stars', 'fusion strike', 'astral radiance', 'lost origin',
    'silver tempest', 'crown zenith', 'pokemon go',
    'sv01', 'sv02', 'sv03', 'sv04', 'sv:', 'sv -',
    'scarlet & violet', 'scarlet and violet', 'paldea evolved',
    'obsidian flames', '151', 'paradox rift',
  ],
  current: [
    'paldean fates', 'sv05', 'sv06', 'sv07', 'sv08', 'sv09', 'sv10',
    'temporal forces', 'twilight masquerade', 'shrouded fable',
    'stellar crown', 'surging sparks', 'prismatic evolutions', 'journey together',
    'destined rivals', 'me01', 'me02', 'me03', 'me:',
  ],
};

function isInTargetEra(setName: string, targetEra: PokemonEra): boolean {
  const keywords = ERA_SET_KEYWORDS[targetEra] || [];
  const lower = (setName || '').toLowerCase();
  // Strip common DB prefixes like "SV01:", "SWSH08:", "SV:" for better matching
  const stripped = lower.replace(/^(sv\d*|swsh\d*|me\d*|sve|mee):\s*/i, '').trim();
  return keywords.some(k => lower.includes(k) || stripped.includes(k));
}

function isInAnyAllocatedEra(setName: string, eraAllocations: Record<string, number>): boolean {
  for (const [era, pct] of Object.entries(eraAllocations)) {
    if (pct > 0 && isInTargetEra(setName, era as PokemonEra)) return true;
  }
  return false;
}

/* ── Personalized Sets Snapshot ── */
function PersonalizedSetsSnapshot({ items, topSets7d }: { items: any[]; topSets7d: Map<string, number> }) {
  const exposure = useMemo(() => {
    const raw = getSetExposure(items).slice(0, 8);
    // Fuzzy-match 7d % — portfolio set names may differ from API set names
    const findPct = (name: string): number | null => {
      const lower = name.toLowerCase();
      // Exact match first
      if (topSets7d.has(lower)) return topSets7d.get(lower)!;
      // Includes-based match
      for (const [apiName, pct] of topSets7d.entries()) {
        if (lower.includes(apiName) || apiName.includes(lower)) return pct;
      }
      return null;
    };
    return raw.map(s => ({
      ...s,
      pct7d: findPct(s.name),
    })).sort((a, b) => (b.pct7d ?? -999) - (a.pct7d ?? -999)).slice(0, 4);
  }, [items, topSets7d]);

  return (
    <div className="glass-card rounded-xl p-2 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Sets · 7D Gain</span>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-0.5 px-0.5">
        {exposure.length > 0 ? exposure.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded-md">
            <span className="text-sm text-foreground font-medium truncate max-w-[200px]">{s.name}</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                ${s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value.toFixed(0)}
              </span>
              {s.pct7d != null ? (
                <span className={cn('text-xs font-bold tabular-nums', s.pct7d >= 0 ? 'text-success' : 'text-destructive')}>
                  {s.pct7d >= 0 ? '+' : ''}{s.pct7d.toFixed(1)}%
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </span>
          </div>
        )) : (
          <p className="text-xs text-muted-foreground text-center py-2">No set data available</p>
        )}
      </div>
    </div>
  );
}

/* ── Pokemon Character Indexes ── */
function PokemonCharacterIndexes({ items }: { items: any[] }) {
  const indexes = useMemo(() => buildPokemonIndexes(items), [items]);
  const topIndexes = indexes.slice(0, 6);
  const [marketData, setMarketData] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (topIndexes.length === 0) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const changeMap = new Map<string, number>();

      // For each character, look up avg 7d change from market_snapshots
      for (const idx of topIndexes) {
        const { data } = await supabase
          .from('market_snapshots')
          .select('price_change_7d')
          .ilike('name', `%${idx.name.toLowerCase()}%`)
          .eq('product_type', 'card')
          .eq('game', 'Pokemon')
          .not('price_change_7d', 'is', null)
          .not('name', 'ilike', '%code card%')
          .gt('price', 1)
          .limit(30);

        if (data && data.length > 0) {
          const avg = data.reduce((s, c) => s + (c.price_change_7d ?? 0), 0) / data.length;
          changeMap.set(idx.name, avg);
        }
      }

      if (!cancelled) {
        setMarketData(changeMap);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topIndexes.map(i => i.name).join(',')]);

  return (
    <div className="glass-card rounded-xl p-2 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Pokémon Indexes</span>
      </div>
      <p className="text-[10px] text-muted-foreground mb-1">Custom indexes based on your collection</p>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : topIndexes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No Pokémon cards found in collection</p>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-[1fr_50px_60px] gap-1 px-2 pb-0.5 border-b border-border/40">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">Index</span>
            <span className="text-[9px] font-semibold uppercase text-muted-foreground text-right">Cards</span>
            <span className="text-[9px] font-semibold uppercase text-muted-foreground text-right">7D Avg</span>
          </div>
          <div className="flex-1 flex flex-col justify-evenly">
            {topIndexes.map((idx, i) => {
              const change = marketData.get(idx.name) ?? 0;
              const isUp = change >= 0;
              return (
                <div key={i} className="w-full grid grid-cols-[1fr_50px_60px] gap-1 px-2 py-0.5 rounded-md items-center">
                  <span className="text-xs font-bold text-left truncate">{idx.name} Index</span>
                  <span className="text-xs text-muted-foreground tabular-nums text-right">{idx.count}</span>
                  <span className={cn('text-xs font-bold tabular-nums text-right', isUp ? 'text-success' : 'text-destructive')}>
                    {isUp ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Budget-filtered Spotlight Card (Card Picks UI with TCG + eBay links) ── */
function SpotlightCard({ card, navigate }: { card: MoverCard; navigate: (path: string) => void }) {
  const imgUrl = getImageUrl(card);
  const [imgFailed, setImgFailed] = useState(false);
  const change7d = card.price_change_7d ?? 0;
  const dotColor = getTrendDotColor(card);
  const tcgplayerRaw = card.tcgplayer_id
    ? `https://www.tcgplayer.com/product/${card.tcgplayer_id}`
    : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name)}`;
  const tcgplayerUrl = getAffiliateUrl(tcgplayerRaw);
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.name + (card.set_name ? ' ' + card.set_name : ''))}`;

  return (
    <button
      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
      className="glass-card rounded-xl overflow-hidden flex flex-col hover:border-primary/30 transition-all group border-2 border-border w-full"
    >
      <div className="relative w-full">
        {imgUrl && !imgFailed ? (
          <img src={imgUrl} alt="" className="w-full h-44 sm:h-48 object-contain bg-muted/30 pt-2 mx-auto"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="w-full h-44 sm:h-48 bg-muted/30 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageOff className="w-8 h-8 opacity-30" />
            <span className="text-[10px] opacity-50">Image not available</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent pt-8 pb-2 px-2.5">
          <p className="text-xs font-bold truncate group-hover:text-primary transition-colors leading-tight">{card.name}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{card.set_name}</p>
        </div>
        <span className={cn('absolute top-2 left-2 w-2.5 h-2.5 rounded-full ring-2 ring-background', dotColor)} />
      </div>
      <div className="px-2.5 py-2 flex items-center justify-between">
        <span className="text-sm font-black tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
        <span className={cn('text-xs font-bold tabular-nums', change7d >= 0 ? 'text-success' : 'text-destructive')}>
          {change7d >= 0 ? '+' : ''}{change7d.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 px-2.5 pb-2.5" onClick={(e) => e.stopPropagation()}>
        <a href={tcgplayerUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
          <img src={tcgplayerLogo} alt="TCGPlayer" className="h-[22px] w-auto" />
        </a>
        <a href={ebayUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
          <img src={ebayLogo} alt="eBay" className="h-5 w-auto" />
        </a>
      </div>
    </button>
  );
}

/* ── Picks Carousel (matches Pulse layout exactly) ── */
function PicksCarousel({ items, type, label, icon: Icon, priceLabel }: { items: MoverCard[]; type: 'sealed' | 'card'; label: string; icon: any; priceLabel: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setPerPage(w < 640 ? 2 : w < 1024 ? 2 : 3);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalPages = Math.ceil(items.length / perPage);
  const visible = items.slice(page * perPage, page * perPage + perPage);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground">{priceLabel}</span>
        </div>
        {totalPages > 1 && (
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground tabular-nums mr-1">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {items.length > 0 ? (
        <>
          {/* Mobile: horizontal touch-scroll, 2 cards visible */}
          <div className="sm:hidden flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 touch-pan-x">
            {items.map(c => (
              <div key={c.id} className="shrink-0 w-[calc((100%-0.75rem)/2)]">
                <SpotlightCard card={c} navigate={navigate} />
              </div>
            ))}
          </div>
          {/* Desktop: paginated grid of 3 */}
          <div className="hidden sm:grid gap-3" style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}>
            {visible.map(c => <SpotlightCard key={c.id} card={c} navigate={navigate} />)}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">No {type === 'sealed' ? 'sealed products' : 'cards'} found</p>
      )}
    </div>
  );
}

/* ── Smart Watchlist – Side-by-Side Columns (Pulse layout) ── */
function SmartWatchlistCarousel({ sealedItems, cardItems, budget }: { sealedItems: MoverCard[]; cardItems: MoverCard[]; budget: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PicksCarousel items={sealedItems} type="sealed" label="Sealed Products" icon={Briefcase} priceLabel={`· $5 – $${budget}`} />
      <PicksCarousel items={cardItems} type="card" label="Card Picks" icon={CreditCard} priceLabel={`· $5 – $${budget}`} />
    </div>
  );
}

/* ── PokeBeach News ── */
function NewsSection({ headlines }: { headlines: Headline[] }) {
  if (headlines.length === 0) return null;
  return (
    <div className="glass-card rounded-xl p-2 space-y-0.5 flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <Newspaper className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest News</span>
      </div>
      <div className="flex-1 divide-y divide-border/60">
        {headlines.slice(0, 3).map((h, i) => (
          <a key={i} href={h.url} target="_blank" rel="noopener noreferrer"
            className="block px-1.5 py-1.5 hover:bg-muted/30 transition-all group">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{h.category}</Badge>
              <span className="text-[10px] text-muted-foreground shrink-0">{h.date}</span>
            </div>
            <p className="text-[13px] font-semibold leading-snug group-hover:text-primary transition-colors truncate">{h.title}</p>
          </a>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5 border-t border-border/30 justify-end">
        <ExternalLink className="w-3 h-3" /><span>via pokebeach.com</span>
      </div>
    </div>
  );
}

/* ── Watchlist Card with image fallback ── */
function WatchlistCardItem({ card, imgUrl, change, isUp, navigate }: { card: MoverCard; imgUrl: string | null; change: number; isUp: boolean; navigate: (path: string) => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <button
      onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
      className="glass-card rounded-xl p-3 flex flex-col items-center text-center hover:border-primary/30 transition-all group">
      {imgUrl && !imgFailed ? (
        <img src={imgUrl} alt="" className="w-20 h-28 object-contain rounded-lg mb-2"
          onError={() => setImgFailed(true)} />
      ) : (
        <div className="w-20 h-28 rounded-lg bg-muted/30 flex flex-col items-center justify-center gap-0.5 text-muted-foreground mb-2">
          <ImageOff className="w-4 h-4 opacity-30" />
          <span className="text-[8px] opacity-50 leading-tight text-center px-1">Image not available</span>
        </div>
      )}
      <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors">{card.name}</p>
      <p className="text-[10px] text-muted-foreground truncate max-w-full mt-0.5">{card.set_name}</p>
      <div className="flex items-center gap-1 mt-2">
        {isUp ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />}
        <span className={cn('text-sm font-black tabular-nums', isUp ? 'text-success' : 'text-destructive')}>
          {isUp ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
      <span className="text-xs font-bold tabular-nums mt-1">${(card.price ?? 0).toFixed(2)}</span>
    </button>
  );
}

/* ── Watchlist Brief (reused) ── */
function WatchlistBrief() {
  const { items, loading } = useWatchlist();
  const [watchlistData, setWatchlistData] = useState<MoverCard[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) return;
    setDataLoading(true);
    const cardIds = items.map(i => i.card_id);
    supabase
      .from('market_snapshots')
      .select('id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type')
      .in('card_id', cardIds)
      .then(({ data }) => {
        setWatchlistData((data ?? []) as unknown as MoverCard[]);
        setDataLoading(false);
      });
  }, [items]);

  const deduped = useMemo(() => {
    const seen = new Set<string>();
    return watchlistData.filter(c => {
      const key = c.card_id || c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [watchlistData]);

  const sorted = useMemo(() => [...deduped].sort((a, b) =>
    Math.abs(getChangeForTime(b, timePeriod) ?? 0) - Math.abs(getChangeForTime(a, timePeriod) ?? 0)
  ).slice(0, 12), [deduped, timePeriod]);

  if (loading || dataLoading) return (
    <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading your watchlist…</span>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center space-y-4">
        <PlusCircle className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-semibold">Your watchlist is empty</p>
        <p className="text-xs text-muted-foreground">Browse the market to add cards to your watchlist.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/smartlist')}>
          <SlidersHorizontal className="w-4 h-4 mr-2" /> Browse Smart List
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm font-bold">Your Watchlist ({items.length})</p>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map(t => (
            <button key={t} onClick={() => setTimePeriod(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                timePeriod === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/30'
              )}
            >{t.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {sorted.map(card => {
          const imgUrl = getImageUrl(card);
          const change = getChangeForTime(card, timePeriod) ?? 0;
          const isUp = change >= 0;
          return (
            <WatchlistCardItem key={card.card_id || card.id} card={card} imgUrl={imgUrl} change={change} isUp={isUp} navigate={navigate} />
          );
        })}
      </div>
    </div>
  );
}

/* ── Budget-filtered Movers ── */
function BudgetMovers({ allMovers, budget, style }: { allMovers: MoverCard[]; budget: number; style: string }) {
  const navigate = useNavigate();
  const maxPrice = budget;

  const filtered = useMemo(() => {
    let cards = allMovers.filter(c => (c.price ?? 0) <= maxPrice && (c.price ?? 0) > 0);
    if (style === 'sealed-heavy') {
      // Include sealed
    } else if (style === 'slab-heavy') {
      cards = cards.filter(c => {
        const n = (c.name || '').toLowerCase();
        return n.includes('psa') || n.includes('bgs') || n.includes('cgc') || c.product_type === 'card';
      });
    }
    return cards;
  }, [allMovers, maxPrice, style]);

  const gainers = useMemo(() =>
    filtered.filter(c => (c.price_change_7d ?? 0) > 0).sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0)).slice(0, 10),
    [filtered]);

  const pullbacks = useMemo(() =>
    filtered.filter(c => (c.price_change_7d ?? 0) < 0).sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0)).slice(0, 10),
    [filtered]);

  const renderList = (cards: MoverCard[], label: string, color: string) => (
    <div>
      <p className={cn('text-base font-bold mt-2 mb-4', color)}>{label}</p>
      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No data in budget range</p>
      ) : (
        <div className="space-y-1">
          {cards.map((card, i) => {
            const imgUrl = getImageUrl(card);
            const change = card.price_change_7d ?? 0;
            const isUp = change >= 0;
            return (
              <button key={card.id} onClick={() => navigate(`/buylist/mover/${card.card_id || card.id}`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/20 transition-colors group text-left">
                <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                {imgUrl && <img src={imgUrl} alt="" className="w-7 h-9 object-contain rounded shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{card.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{card.set_name}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold tabular-nums">${(card.price ?? 0).toFixed(2)}</span>
                  <span className={cn('text-[10px] font-bold tabular-nums flex items-center gap-0.5', isUp ? 'text-success' : 'text-destructive')}>
                    {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {isUp ? '+' : ''}{change.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {renderList(gainers, `▲ Gainers · Under $${maxPrice}`, 'text-success')}
      {renderList(pullbacks, `▼ Pullbacks · Under $${maxPrice}`, 'text-warning')}
    </div>
  );
}

/* ── Smart Feed Live Ticker ── */
function SmartFeedTicker({ items, allMovers, dbCounts, topSets7d }: { items: any[]; allMovers: MoverCard[]; dbCounts: { cards: number; cardsUpPct: number; cardsUp: number; cardsDown: number }; topSets7d?: Map<string, number> }) {
  const { concentration, milestones, summary } = usePortfolio();
  const scrollRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);
  const navigate = useNavigate();

  const signals = useMemo(() => {
    interface Signal { weight: number; icon: React.ReactNode; iconBg: string; title: string; detail: string; href?: string; }
    const s: Signal[] = [];

    // Market sentiment
    const isGreedy = dbCounts.cardsUpPct >= 55;
    const isFearful = dbCounts.cardsUpPct < 45;
    const sentiment = isGreedy ? 'Buyers' : isFearful ? 'Sellers' : 'Neutral';
    const sentimentIcon = isGreedy ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : isFearful ? <TrendingDown className="w-3.5 h-3.5 text-destructive" /> : <Zap className="w-3.5 h-3.5 text-warning" />;
    const sentimentBg = isGreedy ? 'bg-success/10' : isFearful ? 'bg-destructive/10' : 'bg-warning/10';
    s.push({ weight: 10, icon: sentimentIcon, iconBg: sentimentBg, title: 'Market Pulse', detail: `${sentiment} · ${dbCounts.cardsUpPct}% up` });

    // Top gaining and top losing set — high priority
    if (topSets7d && topSets7d.size > 0) {
      let topGainerName = ''; let topGainerPct = -Infinity;
      let topLoserName = ''; let topLoserPct = Infinity;
      for (const [name, pct] of topSets7d.entries()) {
        if (pct > topGainerPct) { topGainerPct = pct; topGainerName = name; }
        if (pct < topLoserPct) { topLoserPct = pct; topLoserName = name; }
      }
      if (topGainerPct > 0) {
        s.push({ weight: 9.5, icon: <TrendingUp className="w-3.5 h-3.5 text-success" />, iconBg: 'bg-success/10', title: `🔥 ${topGainerName}`, detail: `Top Gainer · +${topGainerPct.toFixed(1)}% 7D`, href: '/buylist/sets' });
      }
      if (topLoserPct < 0) {
        s.push({ weight: 9.4, icon: <TrendingDown className="w-3.5 h-3.5 text-destructive" />, iconBg: 'bg-destructive/10', title: `📉 ${topLoserName}`, detail: `Top Loser · ${topLoserPct.toFixed(1)}% 7D`, href: '/buylist/sets' });
      }
    }

    // Portfolio summary
    if (summary) {
      const isUp = summary.unrealizedPL >= 0;
      s.push({ weight: 9, icon: <Briefcase className="w-3.5 h-3.5 text-primary" />, iconBg: 'bg-primary/10', title: 'Portfolio', detail: `${isUp ? '+' : ''}${summary.unrealizedPLPercent.toFixed(1)}% · $${summary.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, href: '/home' });
    }

    // Profit lock opportunities
    const profitLockItems = (milestones ?? []).filter(
      (m: any) => m.item.gainPercent > 300 && m.sellHalfProfit > 250 && m.item.quantity > 1
    );
    for (const m of profitLockItems.slice(0, 2)) {
      s.push({ weight: 8, icon: <Lock className="w-3.5 h-3.5 text-success" />, iconBg: 'bg-success/10', title: 'Lock Profit', detail: m.item.productName, href: '/winners' });
    }

    // Over-concentration
    if (concentration && concentration.top1Percent > 25) {
      s.push({ weight: 7, icon: <AlertTriangle className="w-3.5 h-3.5 text-warning" />, iconBg: 'bg-warning/10', title: 'Over-Concentration', detail: `${concentration.top1Name} ${concentration.top1Percent.toFixed(0)}%`, href: '/rebalance' });
    }

    // Weak trends from collection
    const weakItems = (items ?? []).filter((i: any) => i.gainPercent < -10).sort((a: any, b: any) => a.gainPercent - b.gainPercent);
    for (const w of weakItems.slice(0, 2)) {
      s.push({ weight: 6, icon: <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />, iconBg: 'bg-destructive/10', title: 'Weak Trend', detail: `${w.productName} ${w.gainPercent.toFixed(1)}%`, href: '/winners' });
    }

    // New highs from collection
    const highItems = (items ?? []).filter((i: any) => i.gainPercent > 50).sort((a: any, b: any) => b.gainPercent - a.gainPercent);
    for (const h of highItems.slice(0, 2)) {
      s.push({ weight: 5, icon: <ArrowUpRight className="w-3.5 h-3.5 text-success" />, iconBg: 'bg-success/10', title: 'New High', detail: `${h.productName} +${h.gainPercent.toFixed(0)}%`, href: '/winners' });
    }

    // Notable market pullback
    const pullbackCard = allMovers.filter(m => (m.price_change_7d ?? 0) < -3 && (m.price ?? 0) > 30).sort((a, b) => (a.price_change_7d ?? 0) - (b.price_change_7d ?? 0))[0];
    if (pullbackCard) {
      s.push({ weight: 4, icon: <TrendingDown className="w-3.5 h-3.5 text-destructive" />, iconBg: 'bg-destructive/10', title: 'Notable Pullback', detail: `${pullbackCard.name} ${(pullbackCard.price_change_7d ?? 0).toFixed(1)}% · $${(pullbackCard.price ?? 0).toFixed(0)}` });
    }

    // Top gainer
    const spotlightCard = allMovers.filter(m => (m.price_change_7d ?? 0) > 3 && (m.price ?? 0) > 30).sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0))[0];
    if (spotlightCard) {
      s.push({ weight: 3, icon: <Flame className="w-3.5 h-3.5 text-warning" />, iconBg: 'bg-warning/10', title: 'Spotlight', detail: `${spotlightCard.name} +${(spotlightCard.price_change_7d ?? 0).toFixed(1)}% · $${(spotlightCard.price ?? 0).toFixed(0)}` });
    }

    // Cards tracked
    s.push({ weight: 1, icon: <CreditCard className="w-3.5 h-3.5 text-primary" />, iconBg: 'bg-primary/10', title: 'Cards Tracked', detail: `${dbCounts.cards.toLocaleString()} in the index` });

    return s.sort((a, b) => b.weight - a.weight);
  }, [items, allMovers, dbCounts, concentration, milestones, summary, topSets7d]);

  const duped = useMemo(() => [...signals, ...signals], [signals]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || signals.length === 0) return;
    let raf: number;
    const speed = 0.4;
    const tick = () => {
      if (!pausedRef.current) {
        posRef.current += speed;
        const half = el.scrollWidth / 2;
        if (half > 0 && posRef.current >= half) posRef.current = 0;
        el.scrollLeft = posRef.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [signals]);

  if (signals.length === 0) return null;

  return (
    <div
      className="overflow-hidden py-2 mb-3 border-b border-border/30 cursor-pointer"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div ref={scrollRef} className="flex items-center gap-4 overflow-hidden scrollbar-none">
        {duped.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="w-px h-4 bg-border/30 shrink-0" />}
            <button
              onClick={() => s.href && navigate(s.href)}
              className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
            >
              <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>{s.icon}</div>
              <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">{s.title}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{s.detail}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Prime Window Widget ── */
import sv151Logo from '@/assets/sv-151-logo.png';
import svBaseLogo from '@/assets/set-scarlet-violet.png';
import paldeaEvolvedLogo from '@/assets/set-paldea-evolved.png';
import obsidianFlamesLogo from '@/assets/set-obsidian-flames.png';
import paradoxRiftLogo from '@/assets/set-paradox-rift.png';
import paldeanFatesLogo from '@/assets/set-paldean-fates.png';
import temporalForcesLogo from '@/assets/set-temporal-forces.png';
import fusionStrikeLogo from '@/assets/set-fusion-strike.png';
import astralRadianceLogo from '@/assets/set-astral-radiance.png';
import lostOriginLogo from '@/assets/set-lost-origin.png';
import crownZenithLogo from '@/assets/set-crown-zenith.png';
import silverTempestLogo from '@/assets/set-silver-tempest.png';
import evolvingSkiesLogo from '@/assets/set-evolving-skies.png';
import chillingReignLogo from '@/assets/set-chilling-reign.png';
import brilliantStarsLogo from '@/assets/set-brilliant-stars.png';
import celebrationsLogo from '@/assets/set-celebrations.png';

const PRIME_SETS = [
  { name: 'Crown Zenith', age: '2 yrs', matchKeys: ['crown zenith', 'swsh12.5', 'swsh12pt5'], logoKey: 'crown zenith' },
  { name: '151', age: '2 yrs', matchKeys: ['151', 'sv 151', 'sv: 151', 'scarlet & violet: 151', 'scarlet & violet 151', 'sv3pt5'], logoKey: 'scarlet & violet 151' },
  { name: 'Paldea Evolved', age: '2 yrs', matchKeys: ['paldea evolved'], logoKey: 'paldea evolved' },
  { name: 'Obsidian Flames', age: '2 yrs', matchKeys: ['obsidian flames'], logoKey: 'obsidian flames' },
  { name: 'Scarlet & Violet', age: '2 yrs', matchKeys: ['scarlet & violet base', 'scarlet & violet -'], logoKey: 'scarlet & violet base set' },
  { name: 'Paradox Rift', age: '2 yrs', matchKeys: ['paradox rift'], logoKey: 'paradox rift' },
  { name: 'Paldean Fates', age: '2 yrs', matchKeys: ['paldean fates'], logoKey: 'paldean fates' },
  { name: 'Temporal Forces', age: '2 yrs', matchKeys: ['temporal forces'], logoKey: 'temporal forces' },
  { name: 'Evolving Skies', age: '3 yrs', matchKeys: ['evolving skies'], logoKey: 'evolving skies' },
  { name: 'Celebrations', age: '3 yrs', matchKeys: ['celebrations'], logoKey: 'celebrations' },
  { name: 'Fusion Strike', age: '3 yrs', matchKeys: ['fusion strike'], logoKey: 'fusion strike' },
  { name: 'Brilliant Stars', age: '3 yrs', matchKeys: ['brilliant stars'], logoKey: 'brilliant stars' },
  { name: 'Astral Radiance', age: '3 yrs', matchKeys: ['astral radiance'], logoKey: 'astral radiance' },
  { name: 'Lost Origin', age: '3 yrs', matchKeys: ['lost origin'], logoKey: 'lost origin' },
  { name: 'Silver Tempest', age: '3 yrs', matchKeys: ['silver tempest'], logoKey: 'silver tempest' },
  { name: 'Chilling Reign', age: '4 yrs', matchKeys: ['chilling reign'], logoKey: 'chilling reign' },
];

const LOCAL_LOGOS: Record<string, string> = {
  'crown zenith': crownZenithLogo,
  'scarlet & violet 151': sv151Logo,
  'scarlet & violet base set': svBaseLogo,
  'paldea evolved': paldeaEvolvedLogo,
  'obsidian flames': obsidianFlamesLogo,
  'paradox rift': paradoxRiftLogo,
  'paldean fates': paldeanFatesLogo,
  'temporal forces': temporalForcesLogo,
  'fusion strike': fusionStrikeLogo,
  'astral radiance': astralRadianceLogo,
  'lost origin': lostOriginLogo,
  'silver tempest': silverTempestLogo,
  'evolving skies': evolvingSkiesLogo,
  'chilling reign': chillingReignLogo,
  'brilliant stars': brilliantStarsLogo,
  'celebrations': celebrationsLogo,
};

function PrimeWindowWidget() {
  const navigate = useNavigate();
  const [setData, setSetData] = useState<{ name: string; age: string; logoUrl: string | null; pct7d: number | null; pct30d: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pptRes, apiRes] = await Promise.all([
        supabase.from('sets_ppt').select('name, logo_url').limit(200),
        supabase.functions.invoke('justtcg', { body: { action: 'getSets' } }),
      ]);
      if (cancelled) return;
      const pptSets = pptRes.data ?? [];
      const apiSets = Array.isArray(apiRes.data?.data) ? apiRes.data.data : [];
      const result = PRIME_SETS.map(ps => {
        const apiMatch = apiSets.find((s: any) => {
          const sLower = (s.name || '').toLowerCase();
          return ps.matchKeys.some(k => sLower.includes(k));
        });
        let logoUrl: string | null = ps.logoKey ? (LOCAL_LOGOS[ps.logoKey] || null) : null;
        if (!logoUrl) {
          const pptMatch = pptSets.find((s: any) => {
            const sLower = (s.name || '').toLowerCase();
            return ps.matchKeys.some(k => sLower.includes(k)) || sLower === ps.name.toLowerCase();
          });
          const apiLogoMatch = apiSets.find((s: any) => {
            const sLower = (s.name || '').toLowerCase();
            return ps.matchKeys.some(k => sLower.includes(k)) || sLower === ps.name.toLowerCase();
          });
          logoUrl = pptMatch?.logo_url || apiLogoMatch?.logo_url || null;
        }
        return { name: ps.name, age: ps.age, logoUrl, matchKeys: ps.matchKeys, pct7d: apiMatch?.set_value_change_7d_pct ?? apiMatch?.change_7d_pct ?? null, pct30d: apiMatch?.set_value_change_30d_pct ?? apiMatch?.change_30d_pct ?? null };
      });

      // For any set missing pct30d, compute from market_snapshots avg price_change_30d
      const missing = result.filter(r => r.pct30d == null);
      if (missing.length > 0) {
        for (const m of missing) {
          // Try each matchKey until we get results, prefer longer/more specific keys first
          const sortedKeys = [...m.matchKeys].sort((a, b) => b.length - a.length);
          let found = false;
          for (const key of sortedKeys) {
            if (found) break;
            const { data } = await supabase
              .from('market_snapshots')
              .select('price_change_30d')
              .ilike('set_name', `%${key}%`)
              .eq('product_type', 'card')
              .not('price_change_30d', 'is', null)
              .gt('price', 1)
              .limit(100);
            if (data && data.length >= 3) {
              const avg = data.reduce((s, c) => s + (c.price_change_30d ?? 0), 0) / data.length;
              m.pct30d = Math.round(avg * 10) / 10;
              found = true;
            }
          }
          // If still null, try computing from 7d as rough proxy
          if (!found && m.pct7d != null) {
            m.pct30d = m.pct7d;
          }
        }
      }

      if (!cancelled) {
        setSetData(result.map(({ matchKeys: _, ...rest }) => rest));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onResize = () => { setPerPage(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3); };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const totalPages = Math.ceil(setData.length / perPage);
  const visible = setData.slice(page * perPage, page * perPage + perPage);

  return (
    <div className="glass-card rounded-xl p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Flame className="w-4 h-4 text-warning shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Prime Window</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <span className="text-[9px] text-muted-foreground tabular-nums mr-1">{page + 1}/{totalPages}</span>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 rounded-lg hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="sm:hidden flex-1 min-h-0 flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 touch-pan-x">
            {setData.map((s, i) => (
              <button key={i} onClick={() => navigate(`/buylist/scanner?search=${encodeURIComponent(s.name)}&type=all`)}
                className="flex flex-col items-center justify-center text-center p-1 rounded-xl hover:bg-muted/20 transition-all group shrink-0 w-[calc((100%-1rem)/3)]">
                <div className="w-full h-14 flex items-center justify-center overflow-hidden rounded-lg mb-1">
                  {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <Layers className="w-8 h-8 text-muted-foreground" />}
                </div>
                <p className="text-[10px] font-bold truncate max-w-full group-hover:text-primary transition-colors leading-tight">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.age} old</p>
                <span className={cn('text-xs font-black tabular-nums', (s.pct30d ?? s.pct7d) != null ? ((s.pct30d ?? s.pct7d ?? 0) >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground/40')}>
                  {(s.pct30d ?? s.pct7d) != null ? (
                    <><span className="text-[8px] text-muted-foreground font-semibold mr-0.5">30D</span>{(s.pct30d ?? s.pct7d ?? 0) >= 0 ? '+' : ''}{(s.pct30d ?? s.pct7d ?? 0).toFixed(1)}%</>
                  ) : '—'}
                </span>
              </button>
            ))}
          </div>
          <div className="hidden sm:flex flex-1 min-h-0 gap-2">
            {visible.map((s, i) => (
              <button key={i} onClick={() => navigate(`/buylist/scanner?search=${encodeURIComponent(s.name)}&type=all`)}
                className="flex flex-col items-center justify-center text-center p-1 rounded-xl hover:bg-muted/20 transition-all group flex-1 min-h-0">
                <div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-lg mb-1">
                  {s.logoUrl ? <img src={s.logoUrl} alt={s.name} className="max-w-full max-h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <Layers className="w-8 h-8 text-muted-foreground" />}
                </div>
                <p className="text-xs font-bold truncate max-w-full group-hover:text-primary transition-colors leading-tight">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.age} old</p>
                <span className={cn('text-sm font-black tabular-nums', (s.pct30d ?? s.pct7d) != null ? ((s.pct30d ?? s.pct7d ?? 0) >= 0 ? 'text-success' : 'text-destructive') : 'text-muted-foreground/40')}>
                  {(s.pct30d ?? s.pct7d) != null ? (
                    <><span className="text-[9px] text-muted-foreground font-semibold mr-0.5">30D</span>{(s.pct30d ?? s.pct7d ?? 0) >= 0 ? '+' : ''}{(s.pct30d ?? s.pct7d ?? 0).toFixed(1)}%</>
                  ) : '—'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export default function SmartFeedTab() {
  const navigate = useNavigate();
  const { items, isDataLoaded, allocation, summary, authInitialized } = usePortfolio();
  const [allMovers, setAllMovers] = useState<MoverCard[]>([]);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [dbCounts, setDbCounts] = useState({ cards: 0, cardsUpPct: 50, cardsUp: 0, cardsDown: 0 });
  const [topSets7d, setTopSets7d] = useState<Map<string, number>>(new Map());
  const [sealedPicks, setSealedPicks] = useState<MoverCard[]>([]);
  const [cardPicks, setCardPicks] = useState<MoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWatchlistEra, setSelectedWatchlistEra] = useState<PokemonEra | 'rebalance'>('rebalance');

  const rebalancePrefs = useMemo(() => getRebalancePreferences(), []);
  const simulatorPrefs = useMemo(() => getSimulatorPreferences(), []);
  
  // Rebalance settings take priority over simulator settings
  const hasRebalanceSettings = !!rebalancePrefs.assetAllocation || rebalancePrefs.top2RebalanceEras.length > 0;
  const budget = hasRebalanceSettings ? rebalancePrefs.monthlyBudget : simulatorPrefs.monthlyBudget;
  const eraAllocations = hasRebalanceSettings ? rebalancePrefs.eraAllocations : simulatorPrefs.eraAllocations;
  const top2Eras = rebalancePrefs.top2RebalanceEras;
  const assetAlloc = rebalancePrefs.assetAllocation;
  // If graded+raw > sealed, prefer cards; otherwise prefer sealed
  const prefersCards = assetAlloc ? (assetAlloc.graded + assetAlloc.raw) > assetAlloc.sealed : false;
  
  const targetEra = hasRebalanceSettings
    ? (top2Eras[0] || null)
    : simulatorPrefs.targetEra;
  const collectingStyle = useMemo(() => {
    if (assetAlloc) {
      if ((assetAlloc.graded + assetAlloc.raw) > assetAlloc.sealed) return 'card-focused';
      if (assetAlloc.sealed > (assetAlloc.graded + assetAlloc.raw)) return 'sealed-heavy';
      return 'balanced';
    }
    return getCollectingStyle(allocation);
  }, [assetAlloc, allocation]);

  // Fetch market data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Sentiment cache – fall back to live counts if stale (>2 days)
      const { data: sentimentCached } = await supabase
        .from('sentiment_cache')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      
      const cacheAge = sentimentCached ? (Date.now() - new Date(sentimentCached.snapshot_date).getTime()) / 86400000 : 999;
      
      if (!cancelled && sentimentCached && cacheAge <= 2) {
        setDbCounts({ cards: sentimentCached.cards_total, cardsUpPct: sentimentCached.cards_up_pct, cardsUp: sentimentCached.cards_up, cardsDown: sentimentCached.cards_down });
      } else if (!cancelled) {
        // Live fallback: count from market_snapshots
        const latestSnap = await supabase.from('market_snapshots')
          .select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1).single();
        const sd = latestSnap.data?.snapshot_date;
        if (sd) {
          const [upRes, downRes, totalRes] = await Promise.all([
            supabase.from('market_snapshots').select('id', { count: 'exact', head: true })
              .eq('product_type', 'card').not('price_change_7d', 'is', null).gt('price_change_7d', 0).gt('price', 0).eq('snapshot_date', sd),
            supabase.from('market_snapshots').select('id', { count: 'exact', head: true })
              .eq('product_type', 'card').not('price_change_7d', 'is', null).lt('price_change_7d', 0).gt('price', 0).eq('snapshot_date', sd),
            supabase.from('market_snapshots').select('id', { count: 'exact', head: true })
              .eq('product_type', 'card').not('price_change_7d', 'is', null).gt('price', 0).eq('snapshot_date', sd),
          ]);
          const up = upRes.count ?? 0;
          const down = downRes.count ?? 0;
          const total = totalRes.count ?? 0;
          const upPct = total > 0 ? Math.round((up / total) * 100) : 50;
          if (!cancelled) setDbCounts({ cards: total, cardsUpPct: upPct, cardsUp: up, cardsDown: down });
        }
      }

      const { data: latestRow } = await supabase.from('market_snapshots')
        .select('snapshot_date').order('snapshot_date', { ascending: false }).limit(1).single();
      const latestDate = latestRow?.snapshot_date;

      const moverSelect = 'id, card_id, name, set_name, rarity, tcgplayer_id, price, price_change_7d, price_change_30d, price_change_90d, product_type, image_url, printing';

      const [gainersRes, losersRes, headlinesRes, setsRes, sealedRes, cardPicksRes] = await Promise.all([
        supabase.from('market_snapshots').select(moverSelect)
          .eq('game', 'Pokemon').not('price_change_7d', 'is', null)
          .gt('price', 5).gt('price_change_7d', 0).lte('price_change_7d', 2000)
          .not('product_type', 'ilike', '%graded%')
          .not('name', 'ilike', '%code card%')
          .eq('snapshot_date', latestDate || '')
          .order('price_change_7d', { ascending: false }).limit(50),
        supabase.from('market_snapshots').select(moverSelect)
          .eq('game', 'Pokemon').not('price_change_7d', 'is', null)
          .gt('price', 5).lt('price_change_7d', 0).gte('price_change_7d', -2000)
          .not('product_type', 'ilike', '%graded%')
          .not('name', 'ilike', '%code card%')
          .eq('snapshot_date', latestDate || '')
          .order('price_change_7d', { ascending: true }).limit(50),
        supabase.functions.invoke('scrape-pokebeach'),
        supabase.functions.invoke('justtcg', { body: { action: 'getSets' } }),
        // Sealed products: $5 < price ≤ budget
        supabase.from('market_snapshots').select(moverSelect + ', min_price_30d, max_price_30d, cov_price_30d, trend_slope_30d')
          .in('product_type', ['sealed'])
          .gt('price', 5).lte('price', budget)
          .not('price', 'is', null)
          .not('price_change_7d', 'is', null)
          .not('name', 'ilike', '%code card%')
          .eq('game', 'Pokemon')
          .eq('snapshot_date', latestDate || '')
          .order('price_change_7d', { ascending: false }).limit(60),
        // Card picks: $5 < price ≤ budget, cards only
        supabase.from('market_snapshots').select(moverSelect + ', min_price_30d, max_price_30d, cov_price_30d, trend_slope_30d')
          .eq('product_type', 'card')
          .gt('price', 5).lte('price', budget)
          .not('price', 'is', null)
          .not('name', 'ilike', '%code card%')
          .not('name', 'ilike', '%energy%')
          .not('printing', 'ilike', '%reverse holo%')
          .eq('game', 'Pokemon')
          .eq('snapshot_date', latestDate || '')
          .not('price_change_7d', 'is', null)
          .order('price_change_7d', { ascending: false }).limit(60),
      ]);

      if (cancelled) return;

      // Process movers — exclude code cards, reverse holo, 1st edition
      const isExcluded = (m: any) => {
        const n = (m.name || '').toLowerCase();
        const r = (m.rarity || '').toLowerCase();
        const p = (m.printing || '').toLowerCase();
        if (isCodeCard(n)) return true;
        return n.includes('reverse holo') || r.includes('reverse holo') || p.includes('reverse holo') || n.includes('1st edition') || p.includes('1st edition');
      };
      const dedup = (arr: any[]) => {
        const seen = new Set<string>();
        return arr.filter(m => {
          if (isExcluded(m)) return false;
          const k = m.tcgplayer_id || m.card_id || m.id;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }) as MoverCard[];
      };
      setAllMovers([...dedup(gainersRes.data ?? []), ...dedup(losersRes.data ?? [])]);

      // Headlines
      const pbData = headlinesRes.data;
      if (pbData?.success && Array.isArray(pbData.headlines)) setHeadlines(pbData.headlines);

      // Set trends (use 7D for Your Sets)
      const setsData = Array.isArray(setsRes.data?.data) ? setsRes.data.data : [];
      const setsMap7d = new Map<string, number>();
      for (const s of setsData) {
        const pct = s.set_value_change_7d_pct;
        if (pct != null) {
          setsMap7d.set((s.name || '').toLowerCase(), pct);
        }
      }
      setTopSets7d(setsMap7d);

      // Process sealed & card picks — filter by top 2 rebalance eras if available, then allocated eras
      const sealedData = dedup(sealedRes.data ?? []).filter(c => !isCodeCard(c.name || ''));
      const cardData = dedup(cardPicksRes.data ?? []).filter(c => !isCodeCard(c.name || '') && !SEALED_NAME_RE.test(c.name || ''));
      
      const hasTop2 = top2Eras.length > 0;
      const hasEraAllocations = Object.values(eraAllocations).some(v => v > 0);

      // Determine active eras for watchlist based on selectedWatchlistEra
      const getActiveEras = (): PokemonEra[] => {
        if (selectedWatchlistEra !== 'rebalance') return [selectedWatchlistEra];
        if (hasTop2) return top2Eras;
        if (hasEraAllocations) return Object.entries(eraAllocations).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k as PokemonEra);
        return [];
      };
      const activeEras = getActiveEras();

      const filterByEras = (items: MoverCard[], forceFilter: boolean = false) => {
        if (activeEras.length > 0) {
          const eraFiltered = items.filter(c => activeEras.some(era => isInTargetEra(c.set_name || '', era)));
          if (eraFiltered.length >= 3 || forceFilter) return eraFiltered;
        }
        // Return null to signal that era filtering didn't produce enough results
        return null;
      };

      let filteredSealed = filterByEras(sealedData);
      let filteredCards = filterByEras(cardData);
      const sealedNeedsDbQuery = filteredSealed === null;
      const cardsNeedsDbQuery = filteredCards === null;

      // If era filtering fell through (returned all items), do targeted DB queries for era-specific products
      const targetEras = activeEras;
      
      if (targetEras.length > 0 && sealedNeedsDbQuery) {
        const targetSetNames = targetEras.flatMap(era => ERA_SET_KEYWORDS[era] || []);
        if (targetSetNames.length > 0) {
          const eraFilters = targetSetNames.slice(0, 10).map(s => `set_name.ilike.%${s}%`);
          const { data: eraSealed } = await supabase.from('market_snapshots').select(moverSelect)
            .in('product_type', ['sealed'])
            .gt('price', 5).lte('price', budget)
            .not('price', 'is', null)
            .not('price_change_7d', 'is', null)
            .eq('game', 'Pokemon')
            .eq('snapshot_date', latestDate || '')
            .or(eraFilters.join(','))
            .order('price_change_7d', { ascending: false }).limit(30);
           if (eraSealed && eraSealed.length > 0) {
            filteredSealed = dedup(eraSealed).filter(c => !isCodeCard(c.name || ''));
          }
        }
      }
      
      if (targetEras.length > 0 && cardsNeedsDbQuery) {
        const targetSetNames = targetEras.flatMap(era => ERA_SET_KEYWORDS[era] || []);
        if (targetSetNames.length > 0) {
          const eraFilters = targetSetNames.slice(0, 10).map(s => `set_name.ilike.%${s}%`);
          const { data: eraCards } = await supabase.from('market_snapshots').select(moverSelect)
            .eq('product_type', 'card')
            .gt('price', 5).lte('price', budget)
            .not('price', 'is', null)
            .not('name', 'ilike', '%code card%')
            .not('name', 'ilike', '%energy%')
            .eq('game', 'Pokemon')
            .eq('snapshot_date', latestDate || '')
            .not('price_change_7d', 'is', null)
            .or(eraFilters.join(','))
            .order('price_change_7d', { ascending: false }).limit(60);
          if (eraCards && eraCards.length > 0) {
            filteredCards = dedup(eraCards).filter(c => !isCodeCard(c.name || '') && !SEALED_NAME_RE.test(c.name || ''));
          }
        }
      }
      
      // If still null (no era results at all), fall back to unfiltered data so the
      // News Brief / Watchlist still surface picks when no era filter is active.
      if (filteredSealed === null) filteredSealed = activeEras.length === 0 ? sealedData : [];
      if (filteredCards === null) filteredCards = activeEras.length === 0 ? cardData : [];

      // Always show up to 12 items (4 pages of 3) for both columns
      const sealedCount = 12;
      const cardCount = 12;
      
      setSealedPicks(filteredSealed.slice(0, sealedCount));
      setCardPicks(filteredCards.slice(0, cardCount));

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [budget, eraAllocations, top2Eras, prefersCards, selectedWatchlistEra]);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading Smart Feed…</span>
      </div>
    );
  }

  if (!isDataLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Upload Your Portfolio First</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The Smart Feed personalizes market data based on your collection. Upload your portfolio and configure your preferences to unlock this view.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/home')}>Go to Portfolio</Button>
            <Button variant="outline" onClick={() => navigate('/simulator')}>Set Up Preferences</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading Smart Feed…</span>
      </div>
    );
  }

  const formatEra = (e: string) => e === 'ultraModern' ? 'Ultra Modern' : e.charAt(0).toUpperCase() + e.slice(1);
  const eraLabel = top2Eras.length > 0
    ? top2Eras.map(formatEra).join(' + ')
    : targetEra ? formatEra(targetEra) : 'All';

  return (
    <div className="space-y-4">
      <Masthead title="Smart Feed" subtitle={`Personalized · Budget $${budget}/mo · Rebalance: ${eraLabel}`} />

      {/* Live Ticker — portfolio insights for logged-in users */}
      <SmartFeedTicker items={items} allMovers={allMovers} dbCounts={dbCounts} topSets7d={topSets7d} />

      {/* News Brief teaser — links to full newsletter */}
      <SmartFeedNewsBrief
        inputs={{
          items,
          allMovers,
          dbCounts,
          topSets7d,
          sealedPicks,
          cardPicks,
          headlines,
          summary: summary ? {
            totalMarketValue: summary.totalMarketValue,
            unrealizedPL: summary.unrealizedPL,
            unrealizedPLPercent: summary.unrealizedPLPercent,
          } : null,
          eraLabel,
          budget,
          collectingStyle,
          eraPerformance: (() => {
            const eras: PokemonEra[] = top2Eras.length > 0
              ? top2Eras
              : (Object.entries(eraAllocations).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k as PokemonEra).slice(0, 3));
            const pool = eras.length > 0 ? eras : (['vintage','classic','modern','ultraModern','current'] as PokemonEra[]);
            return pool.map((era) => {
              const matches = allMovers.filter(m => isInTargetEra(m.set_name || '', era) && (m.price_change_7d ?? null) !== null);
              if (!matches.length) return { era, label: formatEra(era), pct7d: 0, count: 0 };
              const avg = matches.reduce((s, m) => s + (m.price_change_7d ?? 0), 0) / matches.length;
              const top = [...matches].sort((a, b) => (b.price_change_7d ?? 0) - (a.price_change_7d ?? 0))[0];
              return {
                era,
                label: formatEra(era),
                pct7d: avg,
                count: matches.length,
                topCard: top ? { name: top.name, pct: top.price_change_7d ?? 0, price: top.price ?? 0 } : undefined,
              };
            });
          })(),
        }}
      />

      {/* Row 1: Personalized Sets + Market Pulse + News */}
      <div className="grid grid-cols-1 lg:grid-cols-[30%_22%_48%] gap-3 items-stretch">
        <div className="hidden lg:block">
          <PersonalizedSetsSnapshot items={items} topSets7d={topSets7d} />
        </div>
        <MarketOverviewBanner dbCounts={dbCounts} />
        <NewsSection headlines={headlines} />
      </div>

      {/* Row 2: Prime Window + Pokemon Character Indexes */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-4 items-stretch">
        <PrimeWindowWidget />
        <PokemonCharacterIndexes items={items} />
      </div>

      {/* Smart Watchlist — sealed + card picks, within budget */}
      <SectionRule title="Smart Watchlist · 7D" icon={Eye} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Products for your profile:</span>
          <Badge variant="secondary" className="text-xs">$5 – ${budget}</Badge>
          <Select value={selectedWatchlistEra} onValueChange={(v) => setSelectedWatchlistEra(v as PokemonEra | 'rebalance')}>
            <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs border-border/60 bg-background/50">
              <SelectValue />
            </SelectTrigger>
             <SelectContent>
              <SelectItem value="rebalance">Rebalance ({eraLabel})</SelectItem>
              <SelectItem value="vintage">Vintage (1996–2006)</SelectItem>
              <SelectItem value="classic">Classic (2007–2013)</SelectItem>
              <SelectItem value="modern">XY–SM (2014–2019)</SelectItem>
              <SelectItem value="ultraModern">Ultra Modern (2020–2023)</SelectItem>
              <SelectItem value="current">Current (2024–Now)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs capitalize">{collectingStyle}</Badge>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Buy Trend</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Hold Trend</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Down Trend</span>
        </div>
      </div>
      <SmartWatchlistCarousel sealedItems={sealedPicks} cardItems={cardPicks} budget={budget} />

      {/* Sets Explorer + Era Rotation — STATIC */}
      <div id="sets-explorer-section" />
      <SectionRule title="Sets Explorer" icon={Layers} />
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-stretch">
        <EraRotation />
        <SetsExplorer initialLimit={5} />
      </div>

      {/* Watchlist — STATIC */}
      <SectionRule title="Watchlist · 7D" icon={Eye} />
      <div className="mt-2">
        <WatchlistBrief />
      </div>

      {/* Movers & Pullbacks — budget filtered */}
      <SectionRule title="Movers & Pullbacks" icon={Zap} />
      <BudgetMovers allMovers={allMovers} budget={budget} style={collectingStyle} />

      <div className="border-t border-border/30 mt-16 pt-5 text-center">
        <p className="text-[10px] text-muted-foreground">
          Data personalized from your portfolio · Budget: ${budget}/mo · Not financial advice · DYOR
        </p>
      </div>
    </div>
  );
}
