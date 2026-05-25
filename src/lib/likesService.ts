// PokeIQ Likes service — hydrates and persists hard card metadata.
// This is the foundation of the MVP taste engine: no vibes, just facts.

import { supabase } from '@/integrations/supabase/client';

export interface LikeSeed {
  card_id: string;
  card_name: string;
  set_name?: string | null;
  image_url?: string | null;
  price?: number | null;
  rarity?: string | null;
  source?: 'swipe' | 'super_like' | 'review' | 'manual';
}

export interface LikedCard {
  id: string;
  user_id: string;
  card_id: string;
  card_name: string;
  pokemon_name: string | null;
  artist: string | null;
  set_name: string | null;
  set_id: string | null;
  era: string | null;
  release_year: number | null;
  card_type: string | null;
  pokemon_type: string | null;
  rarity: string | null;
  language: string | null;
  card_number: string | null;
  variant: string | null;
  product_category: string | null;
  price: number | null;
  price_tier: string | null;
  image_url: string | null;
  source: string;
  liked_at: string;
}

// ──────────────────────────────────────────────────────────
// Era classifier (kept local — flat regex against set name).
// ──────────────────────────────────────────────────────────
const ERA_PATTERNS: { id: string; label: string; match: RegExp }[] = [
  { id: 'vintage', label: 'Vintage (1999-2003)', match: /base set|jungle|fossil|team rocket|gym |neo |expedition|aquapolis|skyridge|legendary collection/i },
  { id: 'ex',      label: 'EX Era (2003-2007)', match: /\bex (ruby|sandstorm|dragon|team magma|hidden legends|fire red|deoxys|emerald|unseen forces|delta|legend maker|holon|crystal guardians|dragon frontiers|power keepers)/i },
  { id: 'dp',      label: 'DP / Platinum (2007-2011)', match: /diamond|pearl|platinum|mysterious treasures|secret wonders|stormfront|majestic dawn|legends awakened|rising rivals|supreme victors|arceus|heartgold|soulsilver|hgss|call of legends/i },
  { id: 'bw',      label: 'Black & White (2011-2013)', match: /black & white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures/i },
  { id: 'xy',      label: 'XY (2013-2016)', match: /\bxy\b|flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|double crisis|kalos starter/i },
  { id: 'sm',      label: 'Sun & Moon (2016-2019)', match: /sun & moon|sun and moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|detective pikachu|dragon majesty/i },
  { id: 'swsh',    label: 'Sword & Shield (2020-2022)', match: /sword & shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|shining fates|celebrations|champion's path/i },
  { id: 'sv',      label: 'Scarlet & Violet (2023+)', match: /scarlet & violet|paldea|obsidian flames|151|paradox rift|temporal forces|twilight masquerade|shrouded fable|stellar crown|surging sparks|prismatic|journey together|destined rivals/i },
];

export function classifyEra(setName?: string | null): { id: string; label: string } | null {
  if (!setName) return null;
  for (const e of ERA_PATTERNS) if (e.match.test(setName)) return { id: e.id, label: e.label };
  return null;
}

export const ERA_LABELS: Record<string, string> = Object.fromEntries(
  ERA_PATTERNS.map((e) => [e.id, e.label])
);

export function priceTier(price?: number | null): string {
  const p = Number(price) || 0;
  if (p <= 0) return 'unknown';
  if (p < 15) return 'budget';
  if (p < 50) return 'mid';
  if (p < 200) return 'premium';
  return 'grail';
}

export const PRICE_TIER_LABEL: Record<string, string> = {
  budget: 'Budget (<$15)',
  mid: 'Mid ($15–$50)',
  premium: 'Premium ($50–$200)',
  grail: 'Grail ($200+)',
  unknown: 'Unpriced',
};

// Extract a Pokémon name from a card name ("Charizard ex" → "Charizard").
export function extractPokemonName(cardName: string): string | null {
  if (!cardName) return null;
  const cleaned = cardName
    .replace(/\b(ex|gx|v|vmax|vstar|tag team|prime|legend|break|star|delta)\b/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[#&].*$/, '')
    .trim();
  const first = cleaned.split(/[\s\-:]/)[0];
  return first || null;
}

function detectLanguage(name: string, setName?: string | null): string {
  const text = `${name} ${setName ?? ''}`;
  if (/\(JP\)|japanese/i.test(text)) return 'Japanese';
  return 'English';
}

const SEALED_RX = /booster|box|pack|deck|tin|etb|bundle|collection|case/i;
const GRADED_RX = /\b(psa|bgs|cgc|sgc|beckett)\s*\d/i;
function detectProductCategory(name: string): string {
  if (GRADED_RX.test(name)) return 'graded';
  if (SEALED_RX.test(name)) return 'sealed';
  return 'single';
}

// Hydrate a like with as much metadata as we can pull from cards_ppt and sets_ppt.
export async function hydrateLikeMetadata(seed: LikeSeed): Promise<Partial<LikedCard>> {
  const meta: Partial<LikedCard> = {
    card_id: seed.card_id,
    card_name: seed.card_name,
    set_name: seed.set_name ?? null,
    image_url: seed.image_url ?? null,
    price: seed.price ?? null,
    rarity: seed.rarity ?? null,
    language: detectLanguage(seed.card_name, seed.set_name),
    product_category: detectProductCategory(seed.card_name),
    pokemon_name: extractPokemonName(seed.card_name),
    price_tier: priceTier(seed.price),
    source: seed.source ?? 'swipe',
  };

  // Era from set name
  const era = classifyEra(seed.set_name);
  if (era) meta.era = era.id;

  // Try PPT card metadata by id, fallback by name+set
  try {
    let { data: ppt } = await supabase
      .from('cards_ppt')
      .select('artist, set_name, card_number, rarity, card_type, pokemon_type, image_cdn_url_400, name')
      .eq('ppt_id', seed.card_id)
      .maybeSingle();

    if (!ppt && seed.card_name) {
      const q = supabase
        .from('cards_ppt')
        .select('artist, set_name, card_number, rarity, card_type, pokemon_type, image_cdn_url_400, name')
        .ilike('name', seed.card_name);
      if (seed.set_name) q.ilike('set_name', seed.set_name);
      const { data: rows } = await q.limit(1);
      ppt = rows?.[0] ?? null;
    }

    if (ppt) {
      meta.artist = ppt.artist ?? null;
      meta.card_type = ppt.card_type ?? null;
      meta.pokemon_type = Array.isArray(ppt.pokemon_type) ? ppt.pokemon_type[0] : (ppt.pokemon_type as any) ?? null;
      meta.card_number = ppt.card_number ?? null;
      if (!meta.rarity && ppt.rarity) meta.rarity = ppt.rarity;
      if (!meta.set_name && ppt.set_name) meta.set_name = ppt.set_name;
      if (!meta.image_url && ppt.image_cdn_url_400) meta.image_url = ppt.image_cdn_url_400;
    }
  } catch (e) {
    console.warn('hydrateLikeMetadata: PPT lookup failed', e);
  }

  // Set id + release year from sets_ppt
  if (meta.set_name) {
    try {
      const { data: sets } = await supabase
        .from('sets_ppt')
        .select('id, release_date')
        .ilike('name', meta.set_name)
        .limit(1);
      const s = sets?.[0];
      if (s) {
        meta.set_id = s.id ?? null;
        const m = (s.release_date || '').match(/(\d{4})/);
        if (m) meta.release_year = parseInt(m[1], 10);
      }
    } catch { /* noop */ }
  }

  return meta;
}

export async function saveLike(userId: string, seed: LikeSeed): Promise<void> {
  if (!userId || !seed.card_id) return;
  const meta = await hydrateLikeMetadata(seed);
  const row = {
    user_id: userId,
    card_id: seed.card_id,
    card_name: seed.card_name,
    ...meta,
    liked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('pokeiq_likes')
    .upsert(row, { onConflict: 'user_id,card_id' });
  if (error) console.error('saveLike', error);
}

export async function fetchLikes(userId: string): Promise<LikedCard[]> {
  const { data, error } = await supabase
    .from('pokeiq_likes')
    .select('*')
    .eq('user_id', userId)
    .order('liked_at', { ascending: false })
    .limit(1000);
  if (error) {
    console.error('fetchLikes', error);
    return [];
  }
  return (data ?? []) as LikedCard[];
}