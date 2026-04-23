import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAPIDAPI_HOST = "pokemon-tcg-api.p.rapidapi.com";
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
async function rapidApiFetch<T = any>(path: string, timeoutMs = 12000): Promise<T> {
  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
  if (!RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${RAPIDAPI_BASE}${path}`, {
      method: "GET",
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("RapidAPI error:", resp.status, path, text.slice(0, 300));
      throw new Error(`RapidAPI error: ${resp.status}`);
    }

    return (await resp.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// deno-lint-ignore no-explicit-any
function formatCard(card: any) {
  if (!card) return null;

  const prices = card.prices ?? {};
  const tcgPlayer = prices.tcg_player;
  const cardmarket = prices.cardmarket;

  return {
    id: card.tcgid ?? String(card.id ?? ""),
    internalId: card.id,
    name: card.name ?? "",
    nameNumbered: card.name_numbered ?? "",
    supertype: card.supertype ?? "",
    hp: card.hp ?? "",
    number: String(card.card_number ?? ""),
    artist: typeof card.artist === "object" ? card.artist?.name ?? "" : card.artist ?? "",
    rarity: card.rarity ?? "",
    slug: card.slug ?? "",
    cardType: card.type ?? "singles",
    set: {
      id: card.episode?.slug ?? "",
      name: card.episode?.name ?? "",
      series: card.episode?.series?.name ?? "",
      code: card.episode?.code ?? "",
      releaseDate: card.episode?.released_at ?? "",
      images: { logo: card.episode?.logo ?? null },
    },
    images: { small: card.image ?? null, large: card.image ?? null },
    tcgplayer: tcgPlayer ? {
      marketPrice: tcgPlayer.market_price ?? null,
      midPrice: tcgPlayer.mid_price ?? null,
      currency: tcgPlayer.currency ?? "USD",
    } : null,
    cardmarket: cardmarket ? {
      lowestNearMint: cardmarket.lowest_near_mint ?? null,
      avg30: cardmarket["30d_average"] ?? null,
      avg7: cardmarket["7d_average"] ?? null,
      currency: cardmarket.currency ?? "EUR",
    } : null,
    marketPrice: tcgPlayer?.market_price ?? cardmarket?.lowest_near_mint ?? null,
    links: card.links ?? {},
    tcggoUrl: card.tcggo_url ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Rate limiting ──
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return json({ data: [], error: "Rate limit exceeded. Please try again later." }, 429);
  }

  try {
    const { action, query, cardId, page = 1, pageSize = 20 } = await req.json();

    switch (action) {
      case "searchCards":
      case "searchByName": {
        const q = typeof query === "string" ? query.trim() : "";
        if (q.length < 2) return json({ data: [], totalCount: 0 });

        const params = new URLSearchParams({
          search: q,
          per_page: String(Math.min(pageSize, 50)),
          page: String(page),
          sort: "relevance",
        });

        const result = await rapidApiFetch(`/cards?${params.toString()}`);
        return json({
          data: (result.data ?? []).map(formatCard).filter(Boolean),
          totalCount: result.results ?? 0,
          page: result.paging?.current ?? page,
          pageSize: result.paging?.per_page ?? pageSize,
        });
      }

      case "getCard": {
        if (!cardId) return json({ data: null });
        const result = await rapidApiFetch(`/cards/${encodeURIComponent(cardId)}`);
        const cardData = result.data ?? result;
        return json({ data: formatCard(cardData) });
      }

      case "getSets": {
        const result = await rapidApiFetch(`/sets?per_page=250&page=1`);
        return json({
          // deno-lint-ignore no-explicit-any
          data: (result.data ?? []).map((s: any) => ({
            id: s.slug ?? String(s.id ?? ""),
            name: s.name ?? "",
            series: s.series?.name ?? "",
            code: s.code ?? "",
            releaseDate: s.released_at ?? "",
            images: { logo: s.logo ?? null },
          })),
        });
      }

      case "searchBySetAndName": {
        let parsed: { setName?: string; cardName?: string } = {};
        try {
          parsed = JSON.parse(typeof query === "string" ? query : "{}") ?? {};
        } catch {
          parsed = {};
        }

        const cardName = (parsed.cardName ?? "").trim();
        const setName = (parsed.setName ?? "").trim();
        if (cardName.length < 2 && setName.length < 2) return json({ data: [], totalCount: 0 });

        const searchTerm = cardName || setName;
        const params = new URLSearchParams({
          search: searchTerm,
          per_page: String(Math.min(pageSize, 50)),
          page: String(page),
          sort: "relevance",
        });

        const result = await rapidApiFetch(`/cards?${params.toString()}`);
        let cards = (result.data ?? []).map(formatCard).filter(Boolean);

        if (cardName && setName) {
          const setLower = setName.toLowerCase();
          // deno-lint-ignore no-explicit-any
          cards = cards.filter((c: any) =>
            c.set.name.toLowerCase().includes(setLower)
          );
        }

        return json({ data: cards, totalCount: result.results ?? 0 });
      }

      default:
        return json({ data: [], error: `Unknown action: ${action}` });
    }
  } catch (e) {
    console.error("pokemon-tcg function error:", e);
    return json({ data: [], error: e instanceof Error ? e.message : "Unknown error" });
  }
});
