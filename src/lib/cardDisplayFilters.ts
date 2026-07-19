import { POKEMON_NAMES } from '@/lib/pokemonNames';

export type CardDisplayCandidate = {
  card_id?: string | null;
  card_name?: string | null;
  name?: string | null;
  set_name?: string | null;
  card_set?: string | null;
  rarity?: string | null;
  product_category?: string | null;
  product_type?: string | null;
};

const SEALED_OR_PRODUCT_RE = /\b(booster|box|pack|deck|tin|etb|elite trainer box|bundle|blister|case|carton|collection|collection box|premium collection|ultra premium collection|chest|toolkit|trainer kit|stadium|theme deck|starter deck|starter set|battle deck|build\s*(and|&)\s*battle|prerelease kit|sealed|unopened|factory sealed|southern islands collection|trading card game classic|oversized|oversize|jumbo)\b/i;
const NON_CARD_RE = /\b(code card|\bcode\b|basic energy|special energy|energy card|trainer card|supporter|tool card|item card|pokemon tool)\b/i;
const NON_CARD_SET_RE = /\b(world championship decks|deck exclusives|miscellaneous cards\s*&\s*products|miscellaneous cards|prize pack series cards)\b/i;
const TRAINER_OBJECT_RE = /\b(ace trainer|battle vip pass|computer error|computer search|counter catcher|choice belt|clefairy doll|energy removal|energy retrieval|exp\.?\s*share|field blower|float stone|great ball|here comes team rocket|item finder|level ball|luxury ball|master ball|max potion|muscle band|mysterious fossil|nest ball|nightly garbage run|poke\s*ball|pok[eé]\s*ball|quick ball|rare candy|rescue stretcher|rocket'?s admin|scoop up|super energy removal|super rod|switch|technical machine|tool scrapper|trainers'? mail|ultra ball|vs seeker)\b/i;
const TRAINER_STADIUM_OR_PROMO_RE = /\b(champions festival|chaos gym|lucky stadium|no removal gym|paradise resort|pokemon center|tropical beach|tropical tidal wave|tropical wind)\b/i;
const TRAINER_PERSON_RE = /\b(acerola|agatha|archie|arven|az|bianca|bill|blaine|blue|boss'?s orders|brassius|brock|bruno|brycen|burgh|caitlin|candice|cassius|cheren|chili|cilan|clavell|colress|crasher wake|cynthia|cyrus|daisy|dawn|diantha|elesa|erika|fantina|flannery|gardenia|geeta|giovanni|gladion|green|grimsley|grusha|guzma|hau|hiker|iono|irida|jacq|janine|jasmine|judge|kabu|karen|kieran|klara|koga|korrina|lana|lance|larry|leon|lillie|lt\.? surge|lusamine|lysandre|marnie|maxie|melony|miriam|misty|morty|n(?:\s|$|\(|-|:)|nemona|nessa|norman|olivia|opal|peonia|peony|perrin|piers|poppy|professor(?:'s|\s)|raihan|red|rosa|roxanne|roxie|sabrina|shauna|siebold|skyla|steven|tate|tulip|volkner|wally|wallace|welder|whitney|wicke|winona|worker|zinnia)\b/i;

const POKEMON_NAME_RE = new RegExp(
  `(^|[^a-z0-9])(${POKEMON_NAMES
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .join('|')})(?=$|[^a-z0-9])`,
  'i',
);

export function tcgplayerImageUrl(tcgplayerId?: string | number | null): string | null {
  if (!tcgplayerId) return null;
  return `https://tcgplayer-cdn.tcgplayer.com/product/${tcgplayerId}_in_1000x1000.jpg`;
}

export function isDisplayableSingleCard(card: CardDisplayCandidate): boolean {
  const product = String(card.product_category ?? card.product_type ?? '').toLowerCase();
  if (product && product !== 'card' && product !== 'single') return false;
  if (product === 'sealed') return false;

  const name = String(card.card_name ?? card.name ?? '');
  const setName = String(card.set_name ?? card.card_set ?? '');
  const id = String(card.card_id ?? '');
  const rarity = String(card.rarity ?? '');
  const text = `${name} ${setName} ${id}`;
  const nameAndId = `${name} ${id}`;

  if (SEALED_OR_PRODUCT_RE.test(text)) return false;
  if (NON_CARD_RE.test(nameAndId)) return false;
  if (TRAINER_OBJECT_RE.test(nameAndId)) return false;
  if (TRAINER_STADIUM_OR_PROMO_RE.test(nameAndId)) return false;
  if (TRAINER_PERSON_RE.test(nameAndId) && !POKEMON_NAME_RE.test(name)) return false;
  if (/\btrainer\b/i.test(rarity)) return false;
  if (NON_CARD_SET_RE.test(setName)) return false;
  return true;
}

export function dedupeByCardId<T extends { card_id?: string | null; liked_at?: string | null; created_at?: string | null; client_ts?: string | null }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  const timestamp = (item: T) => item.created_at ?? item.liked_at ?? item.client_ts ?? '';

  for (const item of items) {
    const id = item.card_id;
    if (!id) continue;
    const previous = byId.get(id);
    if (!previous || timestamp(item) >= timestamp(previous)) byId.set(id, item);
  }

  return Array.from(byId.values());
}

export function compactImageSources(...sources: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return sources.filter((src): src is string => {
    if (!src || seen.has(src)) return false;
    seen.add(src);
    return true;
  });
}