import React, { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Bookmark, Sparkles, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import squirtleFallback from '@/assets/squirtle-default.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWatchlist } from '@/hooks/useWatchlist';
import { saveLike } from '@/lib/likesService';
import { classifyEra } from '@/lib/likesService';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAffiliateUrl } from '@/lib/affiliate';
import tcgplayerLogo from '@/assets/tcgplayer-logo.png';
import { compactImageSources, tcgplayerImageUrl } from '@/lib/cardDisplayFilters';

const PriceHistoryChart = lazy(() => import('@/components/buylist/PriceHistoryChart'));

export interface CardDetailSeed {
  card_id: string;
  card_name: string;
  set_name?: string | null;
  image_url?: string | null;
  price?: number | null;
  rarity?: string | null;
  artist?: string | null;
  pokemon_type?: string | null;
  card_number?: string | null;
  tcgplayer_id?: string | null;
}

interface FullDetails {
  artist: string | null;
  card_number: string | null;
  rarity: string | null;
  pokemon_type: string | null;
  set_name: string | null;
  set_id: string | null;
  release_year: number | null;
  image_url: string | null;
  // price snapshot
  price: number | null;
  price_change_7d: number | null;
  price_change_30d: number | null;
  price_change_90d: number | null;
  max_price_30d: number | null;
  min_price_30d: number | null;
  snapshot_date: string | null;
  tcgplayer_id: string | null;
  language: string;
  variant: string | null;
}

interface HistoryPoint { p: number; t: number }
interface HistoryStats {
  history: HistoryPoint[];
  allTimeHigh: number | null;
  allTimeLow: number | null;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  // Current market price from JustTCG (same source as the history)
  price: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
  priceChange90d: number | null;
  lastUpdated: string | null;
  variant: string | null;
  condition: string | null;
}

// In-memory caches — survive between opens within a session.
const detailCache = new Map<string, FullDetails>();
const historyCache = new Map<string, HistoryStats>();
const likedCache = new Map<string, boolean>();

const cleanLookupName = (value: string) =>
  value
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+-\s+[A-Z0-9/]+$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function fetchFullDetails(seed: CardDetailSeed): Promise<FullDetails> {
  if (detailCache.has(seed.card_id)) return detailCache.get(seed.card_id)!;

  const base: FullDetails = {
    artist: seed.artist ?? null,
    card_number: seed.card_number ?? null,
    rarity: seed.rarity ?? null,
    pokemon_type: seed.pokemon_type ?? null,
    set_name: seed.set_name ?? null,
    set_id: null,
    release_year: null,
    image_url: seed.image_url ?? null,
    price: seed.price ?? null,
    price_change_7d: null,
    price_change_30d: null,
    price_change_90d: null,
    max_price_30d: null,
    min_price_30d: null,
    snapshot_date: null,
    tcgplayer_id: seed.tcgplayer_id ?? null,
    language: /\(JP\)|japanese/i.test(`${seed.card_name} ${seed.set_name ?? ''}`) ? 'Japanese' : 'English',
    variant: null,
  };

  // Snapshot — pick freshest row for this card_id
  try {
    const { data: snaps } = await supabase
      .from('market_snapshots')
      .select('price, price_change_7d, price_change_30d, price_change_90d, max_price_30d, min_price_30d, snapshot_date, tcgplayer_id, artist, pokemon_type, rarity, set_name, set_id, image_url, printing')
      .eq('card_id', seed.card_id)
      .eq('game', 'Pokemon')
      .order('snapshot_date', { ascending: false })
      .limit(1);
    const s = snaps?.[0];
    if (s) {
      base.price = s.price ?? base.price;
      base.price_change_7d = s.price_change_7d ?? null;
      base.price_change_30d = s.price_change_30d ?? null;
      base.price_change_90d = s.price_change_90d ?? null;
      base.max_price_30d = s.max_price_30d ?? null;
      base.min_price_30d = s.min_price_30d ?? null;
      base.snapshot_date = s.snapshot_date ?? null;
      base.tcgplayer_id = s.tcgplayer_id ?? base.tcgplayer_id;
      base.artist = base.artist ?? s.artist ?? null;
      base.pokemon_type = base.pokemon_type ?? (Array.isArray(s.pokemon_type) ? s.pokemon_type[0] : (s.pokemon_type as any)) ?? null;
      base.rarity = base.rarity ?? s.rarity ?? null;
      base.set_name = base.set_name ?? s.set_name ?? null;
      base.set_id = s.set_id ?? null;
      base.image_url = base.image_url ?? s.image_url ?? null;
      base.variant = (s.printing as any) ?? null;
    }
  } catch {/* noop */}

  // PPT fallback for artist/type/number/image when still missing
  if (!base.artist || !base.card_number || !base.image_url || !base.pokemon_type) {
    try {
      let { data: rows } = await supabase
        .from('cards_ppt')
        .select('artist, card_number, rarity, pokemon_type, card_type, image_cdn_url_400, set_name')
        .eq('ppt_id', seed.card_id)
        .limit(1);
      // market_snapshots.card_id often isn't a ppt_id, so retry by name + set
      if ((!rows || rows.length === 0) && seed.card_name) {
        const q = supabase
          .from('cards_ppt')
          .select('artist, card_number, rarity, pokemon_type, card_type, image_cdn_url_400, set_name')
          .ilike('name', seed.card_name);
        if (base.set_name) q.ilike('set_name', base.set_name);
        const { data: r2 } = await q.limit(1);
        rows = r2 ?? null;
      }
      const ppt = rows?.[0];
      if (ppt) {
        base.artist = base.artist ?? ppt.artist ?? null;
        base.card_number = base.card_number ?? ppt.card_number ?? null;
        base.rarity = base.rarity ?? ppt.rarity ?? null;
        base.pokemon_type = base.pokemon_type ?? (Array.isArray(ppt.pokemon_type) ? ppt.pokemon_type[0] : (ppt.pokemon_type as any)) ?? null;
        base.image_url = base.image_url ?? ppt.image_cdn_url_400 ?? null;
      }
    } catch {/* noop */}
  }

  // Live PPT API fallback — our local cards_ppt mirror is missing artists
  // for most cards, so hit the edge function to pull the canonical record.
  if (!base.artist || !base.card_number || !base.pokemon_type) {
    try {
      const { data: pptRes } = await supabase.functions.invoke('pokemon-price-tracker', {
        body: {
          action: 'searchCards',
          params: { search: seed.card_name, limit: 10, language: 'english' },
        },
      });
      const list: any[] = Array.isArray(pptRes?.data) ? pptRes.data : [];
      // Best match: same set name (case-insensitive), then same card number if known
      const norm = (s?: string | null) => (s ?? '').toLowerCase().trim();
      const wantSet = norm(base.set_name);
      const wantNum = norm(base.card_number);
      let best = list.find((c) =>
        norm(c.setName) === wantSet &&
        (!wantNum || norm(c.cardNumber) === wantNum)
      );
      if (!best && wantSet) best = list.find((c) => norm(c.setName) === wantSet);
      if (!best) best = list.find((c) => norm(c.name) === norm(seed.card_name));
      if (!best) best = list[0];
      if (best) {
        base.artist = base.artist ?? best.artist ?? null;
        base.card_number = base.card_number ?? best.cardNumber ?? null;
        base.rarity = base.rarity ?? best.rarity ?? null;
        base.pokemon_type = base.pokemon_type ?? (Array.isArray(best.pokemonType) ? best.pokemonType[0] : best.pokemonType) ?? null;
        base.image_url = base.image_url ?? best.imageCdnUrl400 ?? best.imageCdnUrl ?? null;
        base.set_name = base.set_name ?? best.setName ?? null;
        base.tcgplayer_id = base.tcgplayer_id ?? best.tcgPlayerId ?? null;
      }
    } catch (e) {
      console.warn('PPT API artist fallback failed', e);
    }
  }

  // Pokémon TCG API fallback for illustrator/artist. PPT often has price data
  // but returns `artist: null` for older e-Reader/ex-era cards.
  if (!base.artist) {
    try {
      const { data: tcgRes } = await supabase.functions.invoke('pokemon-tcg', {
        body: {
          action: 'searchBySetAndName',
          query: JSON.stringify({ cardName: cleanLookupName(seed.card_name), setName: base.set_name ?? seed.set_name ?? '' }),
          pageSize: 10,
        },
      });
      const list: any[] = Array.isArray(tcgRes?.data) ? tcgRes.data : [];
      const norm = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const wantSet = norm(base.set_name ?? seed.set_name);
      const wantName = norm(cleanLookupName(seed.card_name));
      const wantNum = norm(base.card_number);
      let best = list.find((c) =>
        norm(c.set?.name) === wantSet &&
        (!wantNum || norm(c.number) === wantNum) &&
        norm(c.name) === wantName
      );
      if (!best && wantSet) best = list.find((c) => norm(c.set?.name) === wantSet && norm(c.name) === wantName);
      if (!best) best = list.find((c) => norm(c.name) === wantName);
      if (!best) best = list.find((c) => c.artist);
      if (best) {
        base.artist = best.artist || null;
        base.card_number = base.card_number ?? best.number ?? null;
        base.rarity = base.rarity ?? best.rarity ?? null;
        base.set_name = base.set_name ?? best.set?.name ?? null;
        base.image_url = base.image_url ?? best.images?.large ?? best.images?.small ?? null;
      }
    } catch (e) {
      console.warn('Pokemon TCG artist fallback failed', e);
    }
  }

  // Release year from sets_ppt
  if (base.set_name && !base.release_year) {
    try {
      const { data: sets } = await supabase
        .from('sets_ppt')
        .select('id, release_date')
        .ilike('name', base.set_name)
        .limit(1);
      const s = sets?.[0];
      if (s) {
        base.set_id = base.set_id ?? s.id ?? null;
        const m = (s.release_date || '').match(/(\d{4})/);
        if (m) base.release_year = parseInt(m[1], 10);
      }
    } catch {/* noop */}
  }

  detailCache.set(seed.card_id, base);
  return base;
}

async function fetchHistory(cardId: string): Promise<HistoryStats> {
  if (historyCache.has(cardId)) return historyCache.get(cardId)!;
  const result: HistoryStats = {
    history: [], allTimeHigh: null, allTimeLow: null,
    number: null, rarity: null, set_name: null,
    price: null, priceChange7d: null, priceChange30d: null, priceChange90d: null,
    lastUpdated: null, variant: null, condition: null,
  };
  try {
    const { data } = await supabase.functions.invoke('justtcg', {
      body: { action: 'getCard', cardId, game: 'pokemon' },
    });
    const raw = (data as any)?.data;
    const card = Array.isArray(raw) ? raw[0] : raw;
    if (card) {
      result.number = card.number ?? null;
      result.rarity = card.rarity ?? null;
      result.set_name = card.set_name ?? null;
      // Pick Near Mint variant with the richest history
      const variants: any[] = Array.isArray(card.variants) ? card.variants : [];
      const ranked = variants
        .map((v) => ({ v, score: (v.condition === 'Near Mint' ? 10 : 0) + (v.priceHistory?.length ?? 0) }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0]?.v ?? variants[0];
      if (best) {
        const history = (best.priceHistory ?? []) as HistoryPoint[];
        if (history.length) result.history = history;
        result.allTimeHigh = best.maxPriceAllTime ?? best.maxPrice1y ?? null;
        result.allTimeLow = best.minPriceAllTime ?? best.minPrice1y ?? null;
        result.price = best.price ?? best.marketPrice ?? null;
        result.priceChange7d = (best.priceChange7d ?? best.priceChange1w) ?? null;
        result.priceChange30d = (best.priceChange30d ?? best.priceChange1m) ?? null;
        result.priceChange90d = (best.priceChange90d ?? best.priceChange3m) ?? null;
        result.lastUpdated = best.lastUpdated ?? best.priceLastUpdated ?? null;
        result.variant = best.printing ?? best.variant ?? null;
        result.condition = best.condition ?? null;
      }
      if (result.history.length && (result.allTimeHigh == null || result.allTimeLow == null)) {
        const prices = result.history.map((p) => p.p);
        result.allTimeHigh = result.allTimeHigh ?? Math.max(...prices);
        result.allTimeLow = result.allTimeLow ?? Math.min(...prices);
      }
      // Derive % changes from history if API didn't supply them
      if (result.history.length > 1) {
        const sorted = [...result.history].sort((a, b) => a.t - b.t);
        const last = sorted[sorted.length - 1];
        const findChange = (days: number) => {
          const targetT = last.t - days * 86400 * 1000;
          // Find the closest point at/before targetT
          let prev = sorted[0];
          for (const pt of sorted) { if (pt.t <= targetT) prev = pt; else break; }
          if (!prev || !prev.p) return null;
          return ((last.p - prev.p) / prev.p) * 100;
        };
        if (result.price == null) result.price = last.p;
        if (result.priceChange7d == null) result.priceChange7d = findChange(7);
        if (result.priceChange30d == null) result.priceChange30d = findChange(30);
        if (result.priceChange90d == null) result.priceChange90d = findChange(90);
      }
    }
  } catch (e) {
    console.warn('history fetch failed', e);
  }
  historyCache.set(cardId, result);
  return result;
}

export function CardDetailModal({
  open,
  seed,
  onClose,
}: {
  open: boolean;
  seed: CardDetailSeed | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [details, setDetails] = useState<FullDetails | null>(null);
  const [history, setHistory] = useState<HistoryStats | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const [liked, setLiked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Load details + history when seed changes
  useEffect(() => {
    if (!open || !seed) return;
    setImgLoaded(false);
    setImgErr(false);
    setImgIndex(0);
    setDetails(detailCache.get(seed.card_id) ?? null);
    setHistory(historyCache.get(seed.card_id) ?? null);

    let cancelled = false;
    fetchFullDetails(seed).then((d) => { if (!cancelled) setDetails(d); });

    // Lazy: defer history slightly so the modal paints first
    setHistoryLoading(true);
    const t = window.setTimeout(() => {
      fetchHistory(seed.card_id).then((h) => { if (!cancelled) { setHistory(h); setHistoryLoading(false); } });
    }, 80);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.is_anonymous ? null : session?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) {
        const cached = likedCache.get(uid + ':' + seed.card_id);
        if (cached != null) setLiked(cached);
        else {
          const { data } = await supabase
            .from('pokeiq_likes')
            .select('id')
            .eq('user_id', uid)
            .eq('card_id', seed.card_id)
            .limit(1);
          const isLiked = !!data?.length;
          likedCache.set(uid + ':' + seed.card_id, isLiked);
          if (!cancelled) setLiked(isLiked);
        }
      }
    })();

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [open, seed?.card_id]);

  const era = useMemo(() => {
    if (!details?.set_name) return null;
    return classifyEra(details.set_name);
  }, [details?.set_name]);

  // Merge JustTCG card-level metadata into details for display
  const display = useMemo(() => {
    if (!details) return null;
    // Prefer JustTCG (same source as price history) for current price + changes
    // so the headline number is consistent with the chart below.
    const jtPrice = history?.price ?? null;
    return {
      ...details,
      card_number: details.card_number ?? history?.number ?? null,
      rarity: details.rarity ?? history?.rarity ?? null,
      set_name: details.set_name ?? history?.set_name ?? null,
      price: jtPrice ?? details.price,
      price_change_7d: history?.priceChange7d ?? details.price_change_7d,
      price_change_30d: history?.priceChange30d ?? details.price_change_30d,
      price_change_90d: history?.priceChange90d ?? details.price_change_90d,
      snapshot_date: history?.lastUpdated ?? details.snapshot_date,
      variant: history?.variant ?? details.variant,
      priceSource: jtPrice != null ? 'JustTCG' : (details.price != null ? 'Market snapshot' : null),
    };
  }, [details, history]);

  const handleToggleLike = useCallback(async () => {
    if (!seed) return;
    if (!userId) { navigate('/auth'); return; }
    if (liked) {
      await supabase.from('pokeiq_likes').delete().eq('user_id', userId).eq('card_id', seed.card_id);
      likedCache.set(userId + ':' + seed.card_id, false);
      setLiked(false);
      toast.success('Removed from Likes');
    } else {
      await saveLike(userId, {
        card_id: seed.card_id,
        card_name: seed.card_name,
        set_name: details?.set_name ?? seed.set_name ?? null,
        image_url: details?.image_url ?? seed.image_url ?? null,
        price: details?.price ?? seed.price ?? null,
        rarity: details?.rarity ?? seed.rarity ?? null,
        source: 'manual',
      });
      likedCache.set(userId + ':' + seed.card_id, true);
      setLiked(true);
      toast.success('Added to Likes');
    }
  }, [seed, userId, liked, details, navigate]);

  const handleToggleWatch = useCallback(async () => {
    if (!seed) return;
    if (!userId) { navigate('/auth'); return; }
    if (isInWatchlist(seed.card_id)) {
      await removeFromWatchlist(seed.card_id);
    } else {
      await addToWatchlist({
        card_id: seed.card_id,
        name: seed.card_name,
        set_name: details?.set_name ?? seed.set_name ?? null,
        tcgplayer_id: details?.tcgplayer_id ?? seed.tcgplayer_id ?? null,
        rarity: details?.rarity ?? seed.rarity ?? null,
      });
    }
  }, [seed, userId, isInWatchlist, addToWatchlist, removeFromWatchlist, details, navigate]);

  if (!open || !seed) return null;

  const imageSources = compactImageSources(seed.image_url, details?.image_url, tcgplayerImageUrl(details?.tcgplayer_id ?? seed.tcgplayer_id));
  const img = imageSources[imgIndex] ?? null;
  const inWatch = userId ? isInWatchlist(seed.card_id) : false;

  const body = (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={seed.card_name}
        className="relative w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[88vh] bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        initial={isMobile ? { y: '100%' } : { scale: 0.96, opacity: 0, y: 8 }}
        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
        exit={isMobile ? { y: '100%' } : { scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 pb-[88px] sm:pb-0">
          <div className="flex flex-col sm:flex-row gap-5 p-4 sm:p-6">
            {/* IMAGE */}
            <div className="w-full sm:w-[260px] shrink-0 mx-auto sm:mx-0 max-w-[260px]">
              <div className="relative aspect-[2.5/3.5] rounded-xl overflow-hidden bg-muted/40 shadow-lg ring-1 ring-border/50">
                {!imgLoaded && !imgErr && <Skeleton className="absolute inset-0 rounded-xl" />}
                {img && !imgErr ? (
                  <img
                    src={img}
                    alt={seed.card_name}
                    className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                      if (imgIndex < imageSources.length - 1) {
                        setImgIndex((i) => i + 1);
                        setImgLoaded(false);
                      } else {
                        setImgErr(true);
                        setImgLoaded(true);
                      }
                    }}
                  />
                ) : imgErr ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                    <img
                      src={squirtleFallback}
                      alt="Card image unavailable"
                      className="w-24 h-24 object-contain opacity-80"
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
              {(() => {
                const tcgUrl = details?.tcgplayer_id
                  ? `https://www.tcgplayer.com/product/${details.tcgplayer_id}`
                  : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(seed.card_name)}`;
                return (
                  <a
                    href={getAffiliateUrl(tcgUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white text-gray-900 border border-border px-4 py-2.5 font-semibold text-sm shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-gray-50"
                  >
                    <img src={tcgplayerLogo} alt="TCGplayer" className="h-10 w-auto" />
                    <span>Buy on TCGplayer</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                );
              })()}
            </div>

            {/* DETAILS */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Header */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{seed.card_name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {display?.set_name ?? seed.set_name ?? '—'}
                  {display?.card_number ? ` · #${display.card_number}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {display?.rarity && <Badge variant="secondary" className="text-[10px]">{display.rarity}</Badge>}
                  {display?.pokemon_type && <Badge variant="outline" className="text-[10px]">{display.pokemon_type}</Badge>}
                  {display?.language && <Badge variant="outline" className="text-[10px]">{display.language}</Badge>}
                  {display?.variant && <Badge variant="outline" className="text-[10px]">{display.variant}</Badge>}
                </div>
              </div>

              {/* Basic details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <DetailRow label="Artist" value={display?.artist} loading={!details} />
                <DetailRow label="Era" value={era?.label ?? null} loading={!details} />
                <DetailRow label="Released" value={display?.release_year?.toString() ?? null} loading={!details} />
                <DetailRow label="Number" value={display?.card_number ?? null} loading={!details} />
              </div>

              {/* Price snapshot */}
              <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Market price{display?.priceSource ? ` · ${display.priceSource}` : ''}
                    {history?.condition ? ` · ${history.condition}` : ''}
                  </p>
                  {(display?.snapshot_date) && (
                    <p className="text-[10px] text-muted-foreground">
                      Updated {new Date(display.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  {display?.price != null ? (
                    <p className="text-2xl font-bold text-foreground tabular-nums">${display.price.toFixed(2)}</p>
                  ) : (
                    <Skeleton className="h-7 w-24" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <ChangeStat label="7D"  value={display?.price_change_7d} loading={!details} />
                  <ChangeStat label="30D" value={display?.price_change_30d} loading={!details} />
                  <ChangeStat label="90D" value={display?.price_change_90d} loading={!details} />
                </div>
                {details && (details.max_price_30d != null || details.min_price_30d != null || history?.allTimeHigh != null || history?.allTimeLow != null) && (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    {(history?.allTimeHigh ?? details.max_price_30d) != null && (
                      <div className="text-muted-foreground">
                        ATH <span className="text-foreground font-medium tabular-nums">${(history?.allTimeHigh ?? details.max_price_30d!).toFixed(2)}</span>
                      </div>
                    )}
                    {(history?.allTimeLow ?? details.min_price_30d) != null && (
                      <div className="text-muted-foreground">
                        Recent low <span className="text-foreground font-medium tabular-nums">${(history?.allTimeLow ?? details.min_price_30d!).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chart (lazy) */}
              <div>
                {historyLoading && !history ? (
                  <Skeleton className="h-44 w-full rounded-xl" />
                ) : history && history.history.length > 1 ? (
                  <Suspense fallback={<Skeleton className="h-44 w-full rounded-xl" />}>
                    <PriceHistoryChart priceHistory={history.history} />
                  </Suspense>
                ) : history && history.history.length <= 1 ? (
                  <p className="text-[11px] text-muted-foreground italic">No price history available.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="absolute sm:relative bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 backdrop-blur px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
          <Button
            variant={liked ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleLike}
            className="flex-1 gap-1.5"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            {liked ? 'Liked' : 'Like'}
          </Button>
          <Button
            variant={inWatch ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleWatch}
            className="flex-1 gap-1.5"
          >
            <Bookmark className={`w-4 h-4 ${inWatch ? 'fill-current' : ''}`} />
            {inWatch ? 'Watching' : 'Watchlist'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(<AnimatePresence>{body}</AnimatePresence>, document.body);
}

function DetailRow({ label, value, loading }: { label: string; value: string | null | undefined; loading?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {loading && value == null ? (
        <Skeleton className="h-3.5 w-20" />
      ) : (
        <span className="text-foreground truncate">{value ?? '—'}</span>
      )}
    </div>
  );
}

function ChangeStat({ label, value, loading }: { label: string; value: number | null | undefined; loading?: boolean }) {
  if (loading && value == null) {
    return (
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <Skeleton className="h-4 w-12" />
      </div>
    );
  }
  if (value == null) {
    return (
      <div className="space-y-0.5">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">—</div>
      </div>
    );
  }
  const up = value >= 0;
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-xs font-semibold tabular-nums inline-flex items-center gap-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{value.toFixed(1)}%
      </div>
    </div>
  );
}