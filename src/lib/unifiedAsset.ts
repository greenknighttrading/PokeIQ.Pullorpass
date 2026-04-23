/**
 * UnifiedAsset — Internal aggregation model that joins JustTCG analytics
 * with PPT metadata to produce a single coherent card/sealed product view.
 *
 * This object is consumed internally; existing UI components continue to
 * use the structures they already expect. Mapping helpers at the bottom
 * of this file convert a UnifiedAsset back into those legacy shapes.
 */

// ─── Core types ──────────────────────────────────────────────────────

export type AssetType = 'CARD' | 'SEALED';

export interface UnifiedVariant {
  /** JustTCG variant id (primary key) */
  variantId: string;
  condition: string;
  printing: string;
  language: string;
  tcgplayerSkuId: string | null;
  priceCurrent: number | null;
  lastUpdated: number | null; // unix epoch
}

export interface UnifiedMetrics {
  period: '24h' | '7d' | '30d';
  priceChangePct: number | null;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  stddev: number | null;
  cov: number | null;
  iqr: number | null;
  trendSlope: number | null;
  priceChangesCount: number | null;
  priceRelativeTo30dRange: number | null; // only meaningful for 30d
  asOfDate: string; // ISO date
}

export interface UnifiedHistoryPoint {
  date: string;
  price: number;
  condition?: string;
}

export interface UnifiedAsset {
  assetType: AssetType;
  /** Primary cross-API join key */
  baseKey: string; // tcgplayerId
  /** JustTCG card id */
  justTcgId: string | null;
  /** PPT card id */
  pptId: string | null;

  // ─── Display ─────────────────────
  name: string;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  imageUrl: string | null; // prefer PPT CDN
  imageUrl200: string | null;
  imageUrl400: string | null;
  imageUrl800: string | null;

  // ─── PPT metadata ────────────────
  cardType: string | null;
  pokemonType: string | null;
  energyType: string[] | null;
  hp: number | null;
  stage: string | null;
  flavorText: string | null;
  artist: string | null;
  tcgPlayerUrl: string | null;

  // ─── Sealed-specific (PPT) ───────
  sealedCategory: string | null;

  // ─── Analytics (JustTCG) ─────────
  variants: UnifiedVariant[];
  /** Latest metrics by period */
  metrics: Record<string, UnifiedMetrics>; // keyed by period
  /** Only populated on-demand (PPT 180-day history) */
  history: UnifiedHistoryPoint[] | null;
}

// ─── Builder helper ──────────────────────────────────────────────────

export interface JustTCGCardRow {
  id: string;
  tcgplayer_id: string | null;
  name: string;
  set_name: string | null;
  set_code: string | null;
  number: string | null;
  rarity: string | null;
  is_sealed: boolean;
}

export interface JustTCGVariantRow {
  id: string;
  card_id: string;
  condition: string | null;
  printing: string | null;
  language: string | null;
  tcgplayer_sku_id: string | null;
  price_current: number | null;
  last_updated: number | null;
}

export interface JustTCGMetricsRow {
  variant_id: string;
  as_of_date: string;
  period: string;
  price_change_pct: number | null;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  stddev: number | null;
  cov: number | null;
  iqr: number | null;
  trend_slope: number | null;
  price_changes_count: number | null;
  price_relative_to_30d_range: number | null;
}

export interface PPTCardRow {
  ppt_id: string;
  tcgplayer_id: string | null;
  name: string;
  set_name: string | null;
  card_number: string | null;
  rarity: string | null;
  card_type: string | null;
  pokemon_type: string | null;
  energy_type: string[] | null;
  hp: number | null;
  stage: string | null;
  flavor_text: string | null;
  artist: string | null;
  tcgplayer_url: string | null;
  image_cdn_url: string | null;
  image_cdn_url_200: string | null;
  image_cdn_url_400: string | null;
  image_cdn_url_800: string | null;
}

/**
 * Build a UnifiedAsset from database rows.
 * All parameters are optional — the function merges whatever is available.
 */
export function buildUnifiedAsset(opts: {
  tcgplayerId: string;
  justTcgCard?: JustTCGCardRow | null;
  justTcgVariants?: JustTCGVariantRow[];
  justTcgMetrics?: JustTCGMetricsRow[];
  pptCard?: PPTCardRow | null;
  sealedCategory?: string | null;
  history?: UnifiedHistoryPoint[] | null;
}): UnifiedAsset {
  const { tcgplayerId, justTcgCard, justTcgVariants = [], justTcgMetrics = [], pptCard, sealedCategory, history } = opts;

  const isSealed = justTcgCard?.is_sealed ??
    (pptCard?.card_type === 'Sealed' ? true : false);

  // Prefer PPT for images, fall back to market_snapshots image_url if needed
  const imageUrl = pptCard?.image_cdn_url ?? null;
  const imageUrl200 = pptCard?.image_cdn_url_200 ?? null;
  const imageUrl400 = pptCard?.image_cdn_url_400 ?? null;
  const imageUrl800 = pptCard?.image_cdn_url_800 ?? null;

  // Build variants array
  const variants: UnifiedVariant[] = justTcgVariants.map(v => ({
    variantId: v.id,
    condition: v.condition ?? '',
    printing: v.printing ?? '',
    language: v.language ?? '',
    tcgplayerSkuId: v.tcgplayer_sku_id,
    priceCurrent: v.price_current,
    lastUpdated: v.last_updated,
  }));

  // Build metrics map — take the latest snapshot per period
  const metricsMap: Record<string, UnifiedMetrics> = {};
  for (const m of justTcgMetrics) {
    const key = m.period;
    const existing = metricsMap[key];
    if (!existing || m.as_of_date > existing.asOfDate) {
      metricsMap[key] = {
        period: m.period as UnifiedMetrics['period'],
        priceChangePct: m.price_change_pct,
        avgPrice: m.avg_price,
        minPrice: m.min_price,
        maxPrice: m.max_price,
        stddev: m.stddev,
        cov: m.cov,
        iqr: m.iqr,
        trendSlope: m.trend_slope,
        priceChangesCount: m.price_changes_count,
        priceRelativeTo30dRange: m.price_relative_to_30d_range,
        asOfDate: m.as_of_date,
      };
    }
  }

  return {
    assetType: isSealed ? 'SEALED' : 'CARD',
    baseKey: tcgplayerId,
    justTcgId: justTcgCard?.id ?? null,
    pptId: pptCard?.ppt_id ?? null,

    name: justTcgCard?.name ?? pptCard?.name ?? '',
    setName: justTcgCard?.set_name ?? pptCard?.set_name ?? null,
    number: justTcgCard?.number ?? pptCard?.card_number ?? null,
    rarity: justTcgCard?.rarity ?? pptCard?.rarity ?? null,

    imageUrl,
    imageUrl200,
    imageUrl400,
    imageUrl800,

    cardType: pptCard?.card_type ?? null,
    pokemonType: pptCard?.pokemon_type ?? null,
    energyType: pptCard?.energy_type ?? null,
    hp: pptCard?.hp ?? null,
    stage: pptCard?.stage ?? null,
    flavorText: pptCard?.flavor_text ?? null,
    artist: pptCard?.artist ?? null,
    tcgPlayerUrl: pptCard?.tcgplayer_url ?? null,

    sealedCategory: sealedCategory ?? null,

    variants,
    metrics: metricsMap,
    history: history ?? null,
  };
}

// ─── Convenience: fetch & build from Supabase ────────────────────────

import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch a UnifiedAsset from the database by tcgplayerId.
 * This is purely a local-cache read; no external API calls.
 * Returns null if neither JustTCG nor PPT records exist locally.
 */
export async function fetchUnifiedAsset(tcgplayerId: string): Promise<UnifiedAsset | null> {
  // Run all three queries in parallel
  const [jtcgCardRes, pptCardRes] = await Promise.all([
    supabase
      .from('cards_justtcg')
      .select('*')
      .eq('tcgplayer_id', tcgplayerId)
      .maybeSingle(),
    supabase
      .from('cards_ppt')
      .select('*')
      .eq('tcgplayer_id', tcgplayerId)
      .maybeSingle(),
  ]);

  const justTcgCard = jtcgCardRes.data as JustTCGCardRow | null;
  const pptCard = pptCardRes.data as PPTCardRow | null;

  // If we have neither source, return null
  if (!justTcgCard && !pptCard) return null;

  // Fetch variants + metrics if we have a JustTCG card
  let justTcgVariants: JustTCGVariantRow[] = [];
  let justTcgMetrics: JustTCGMetricsRow[] = [];

  if (justTcgCard) {
    const [varRes, metricsRes] = await Promise.all([
      supabase
        .from('variants_justtcg')
        .select('*')
        .eq('card_id', justTcgCard.id),
      supabase
        .from('metrics_snapshots_justtcg')
        .select('*')
        .in('variant_id', []) // will be replaced below
        .order('as_of_date', { ascending: false })
        .limit(30),
    ]);

    justTcgVariants = (varRes.data ?? []) as JustTCGVariantRow[];

    // Now fetch metrics for discovered variant ids
    if (justTcgVariants.length > 0) {
      const variantIds = justTcgVariants.map(v => v.id);
      const { data: mData } = await supabase
        .from('metrics_snapshots_justtcg')
        .select('*')
        .in('variant_id', variantIds)
        .order('as_of_date', { ascending: false })
        .limit(100);
      justTcgMetrics = (mData ?? []) as JustTCGMetricsRow[];
    }
  }

  // Check sealed_ppt for category
  let sealedCategory: string | null = null;
  if (pptCard?.card_type === 'Sealed' || justTcgCard?.is_sealed) {
    const { data: sealedRow } = await supabase
      .from('sealed_ppt')
      .select('category')
      .eq('tcgplayer_id', tcgplayerId)
      .maybeSingle();
    sealedCategory = sealedRow?.category ?? null;
  }

  return buildUnifiedAsset({
    tcgplayerId,
    justTcgCard,
    justTcgVariants,
    justTcgMetrics,
    pptCard,
    sealedCategory,
  });
}
