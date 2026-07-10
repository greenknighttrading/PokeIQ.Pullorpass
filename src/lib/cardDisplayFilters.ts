export type CardDisplayCandidate = {
  card_id?: string | null;
  card_name?: string | null;
  name?: string | null;
  set_name?: string | null;
  card_set?: string | null;
  product_category?: string | null;
  product_type?: string | null;
};

const SEALED_OR_PRODUCT_RE = /\b(booster|box|pack|deck|tin|etb|elite trainer box|bundle|blister|case|carton|collection box|premium collection|ultra premium collection|chest|toolkit|stadium|theme deck|starter deck|battle deck|build\s*(and|&)\s*battle|sealed|unopened|factory sealed|southern islands collection|trading card game classic)\b/i;
const NON_CARD_RE = /\b(code card|\bcode\b|energy|trainer|supporter|tool card|item card)\b/i;
const NON_CARD_SET_RE = /\b(world championship decks|deck exclusives|miscellaneous cards\s*&\s*products|miscellaneous cards|prize pack series cards)\b/i;

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
  const text = `${name} ${setName} ${id}`;

  if (SEALED_OR_PRODUCT_RE.test(text)) return false;
  if (NON_CARD_RE.test(text)) return false;
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