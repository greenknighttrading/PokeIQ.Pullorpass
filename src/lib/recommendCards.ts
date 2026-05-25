// Hard-attribute recommendation engine.
// Scores candidate cards by weighted overlap with the user's liked metadata.

import { supabase } from '@/integrations/supabase/client';
import { LikedCard, classifyEra, priceTier, extractPokemonName } from './likesService';

export interface RecommendedCard {
  card_id: string;
  card_name: string;
  set_name: string | null;
  image_url: string | null;
  price: number | null;
  rarity: string | null;
  artist: string | null;
  pokemon_type: string | null;
  era: string | null;
  score: number;
  reason: string;
}

interface TopSet<T> {
  set: Set<T>;
  list: { key: T; count: number }[];
}

function topAttr<T>(cards: LikedCard[], pick: (c: LikedCard) => T | null | undefined, n = 5): TopSet<T> {
  const m = new Map<T, number>();
  for (const c of cards) {
    const v = pick(c);
    if (v == null || v === '') continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  const list = Array.from(m.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
  return { set: new Set(list.map((x) => x.key)), list };
}

const W = {
  artist: 3,
  pokemon: 2,
  type: 2,
  rarity: 2,
  era: 1.5,
  set: 1,
  priceTier: 1,
};

function tcgImage(tcgplayerId?: string | null): string | null {
  if (!tcgplayerId) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_1000x1000.jpg`;
}

const EXCLUDE = /reverse holo|1st edition|\bcode\b|energy|trainer/i;

export async function recommendForUser(
  likes: LikedCard[],
  limit = 12
): Promise<RecommendedCard[]> {
  if (likes.length === 0) return [];

  const artists  = topAttr(likes, (c) => c.artist);
  const pokemons = topAttr(likes, (c) => c.pokemon_name);
  const types    = topAttr(likes, (c) => c.pokemon_type);
  const rarities = topAttr(likes, (c) => c.rarity);
  const sets     = topAttr(likes, (c) => c.set_name);
  const eras     = topAttr(likes, (c) => c.era);
  const tiers    = topAttr(likes, (c) => c.price_tier);
  const likedIds = new Set(likes.map((l) => l.card_id));

  // Pool candidates: prefer cards in user's top sets first, then top artists,
  // then broaden by top pokemon. Pulls structured cards from cards_ppt and
  // joins price from market_snapshots when available.
  const candidates = new Map<string, RecommendedCard>();

  async function pullByFilter(
    column: 'set_name' | 'artist' | 'name',
    values: string[]
  ) {
    if (values.length === 0) return;
    const { data } = await supabase
      .from('cards_ppt')
      .select('ppt_id, tcgplayer_id, name, set_name, rarity, artist, pokemon_type, image_cdn_url_400, card_number')
      .in(column, values)
      .limit(300);
    for (const c of data ?? []) {
      if (!c.ppt_id || likedIds.has(c.ppt_id) || candidates.has(c.ppt_id)) continue;
      if (EXCLUDE.test(c.name || '')) continue;
      candidates.set(c.ppt_id, {
        card_id: c.ppt_id,
        card_name: c.name,
        set_name: c.set_name,
        image_url: c.image_cdn_url_400 || tcgImage(c.tcgplayer_id),
        price: null,
        rarity: c.rarity,
        artist: c.artist,
        pokemon_type: Array.isArray(c.pokemon_type) ? c.pokemon_type[0] : (c.pokemon_type as any),
        era: classifyEra(c.set_name)?.id ?? null,
        score: 0,
        reason: '',
      });
    }
  }

  await Promise.all([
    pullByFilter('set_name', sets.list.map((x) => x.key as string).filter(Boolean)),
    pullByFilter('artist',   artists.list.map((x) => x.key as string).filter(Boolean)),
  ]);

  // Score each candidate
  for (const c of candidates.values()) {
    let score = 0;
    const reasons: string[] = [];
    if (c.artist && artists.set.has(c.artist as any)) {
      score += W.artist; reasons.push(`art by ${c.artist}`);
    }
    const pokemonName = extractPokemonName(c.card_name);
    if (pokemonName && pokemons.set.has(pokemonName as any)) {
      score += W.pokemon; reasons.push(pokemonName);
    }
    if (c.pokemon_type && types.set.has(c.pokemon_type as any)) {
      score += W.type;
    }
    if (c.rarity && rarities.set.has(c.rarity as any)) {
      score += W.rarity; reasons.push(c.rarity.toLowerCase());
    }
    if (c.era && eras.set.has(c.era as any)) {
      score += W.era;
    }
    if (c.set_name && sets.set.has(c.set_name as any)) {
      score += W.set; reasons.push(c.set_name);
    }
    c.score = score;
    c.reason = reasons.slice(0, 2).join(' · ') || 'matches your taste';
  }

  // Hydrate prices from market_snapshots for the strongest candidates
  const ranked = Array.from(candidates.values())
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(limit * 3, 30));

  if (ranked.length > 0) {
    const ids = ranked.map((c) => c.card_id);
    const { data: snaps } = await supabase
      .from('market_snapshots')
      .select('card_id, price')
      .in('card_id', ids)
      .eq('game', 'Pokemon')
      .limit(ids.length);
    const priceMap = new Map<string, number>();
    for (const s of snaps ?? []) {
      if (s.card_id && s.price != null && !priceMap.has(s.card_id)) {
        priceMap.set(s.card_id, Number(s.price));
      }
    }
    for (const c of ranked) {
      const p = priceMap.get(c.card_id);
      if (p != null) {
        c.price = p;
        const candTier = priceTier(p);
        if (tiers.set.has(candTier as any)) c.score += W.priceTier;
      }
    }
  }

  // Diversify: cap per artist and per set
  const perArtist = new Map<string, number>();
  const perSet = new Map<string, number>();
  const final: RecommendedCard[] = [];
  for (const c of ranked.sort((a, b) => b.score - a.score)) {
    const aKey = c.artist || '';
    const sKey = c.set_name || '';
    if ((perArtist.get(aKey) ?? 0) >= 3) continue;
    if ((perSet.get(sKey) ?? 0) >= 4) continue;
    perArtist.set(aKey, (perArtist.get(aKey) ?? 0) + 1);
    perSet.set(sKey, (perSet.get(sKey) ?? 0) + 1);
    final.push(c);
    if (final.length >= limit) break;
  }
  return final;
}