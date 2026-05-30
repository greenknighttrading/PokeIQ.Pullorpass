import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://api.pokemontcg.io/v2";

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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function escapeQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function nameQuery(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "";
  return cleaned.includes(" ")
    ? `name:\"${escapeQueryValue(cleaned)}\"`
    : `name:${escapeQueryValue(cleaned)}*`;
}

// deno-lint-ignore no-explicit-any
async function pokemonTcgFetch<T = any>(path: string, timeoutMs = 12000): Promise<T> {
  const apiKey = Deno.env.get("POKEMON_TCG_API_KEY");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        ...(apiKey ? { "X-Api-Key": apiKey.trim() } : {}),
      },
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("PokemonTCG API error:", resp.status, path, text.slice(0, 300));
      throw new Error(`PokemonTCG API error: ${resp.status}`);
    }

    return (await resp.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

// deno-lint-ignore no-explicit-any
function formatCard(card: any) {
  if (!card) return null;

  const tcgPrices = card.tcgplayer?.prices ?? {};
  const firstTcgPrice = Object.values(tcgPrices)[0] as any;
  const cardmarket = card.cardmarket?.prices;
  const marketPrice =
    firstTcgPrice?.market ??
    firstTcgPrice?.mid ??
    firstTcgPrice?.low ??
    cardmarket?.averageSellPrice ??
    cardmarket?.trendPrice ??
    null;

  return {
    id: String(card.id ?? ""),
    internalId: card.id,
    name: card.name ?? "",
    nameNumbered: card.name ? `${card.name}${card.number ? ` #${card.number}` : ""}` : "",
    supertype: card.supertype ?? "",
    hp: card.hp ?? "",
    number: String(card.number ?? ""),
    artist: card.artist ?? "",
    rarity: card.rarity ?? "",
    types: Array.isArray(card.types) ? card.types : [],
    slug: card.id ?? "",
    cardType: card.supertype ?? "singles",
    set: {
      id: card.set?.id ?? "",
      name: card.set?.name ?? "",
      series: card.set?.series ?? "",
      code: card.set?.ptcgoCode ?? "",
      releaseDate: card.set?.releaseDate ?? "",
      images: { logo: card.set?.images?.logo ?? null, symbol: card.set?.images?.symbol ?? null },
    },
    images: { small: card.images?.small ?? null, large: card.images?.large ?? null },
    tcgplayer: firstTcgPrice ? {
      marketPrice: firstTcgPrice.market ?? null,
      midPrice: firstTcgPrice.mid ?? null,
      currency: "USD",
    } : null,
    cardmarket: cardmarket ? {
      lowestNearMint: cardmarket.avg1 ?? null,
      avg30: cardmarket.avg30 ?? null,
      avg7: cardmarket.avg7 ?? null,
      currency: "EUR",
    } : null,
    marketPrice,
    links: card.links ?? {},
    tcggoUrl: card.tcgplayer?.url ?? null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Require authenticated user ──
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Unauthorized" }, 401);
  }

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
          q: nameQuery(q),
          pageSize: String(Math.min(pageSize, 50)),
          page: String(page),
          orderBy: "name",
        });

        const result = await pokemonTcgFetch(`/cards?${params.toString()}`);
        return json({
          data: (result.data ?? []).map(formatCard).filter(Boolean),
          totalCount: result.totalCount ?? 0,
          page: result.page ?? page,
          pageSize: result.pageSize ?? pageSize,
        });
      }

      case "getCard": {
        if (!cardId) return json({ data: null });
        const result = await pokemonTcgFetch(`/cards/${encodeURIComponent(cardId)}`);
        const cardData = result.data ?? result;
        return json({ data: formatCard(cardData) });
      }

      case "getSets": {
        const result = await pokemonTcgFetch(`/sets?pageSize=250&page=1&orderBy=-releaseDate`);
        return json({
          // deno-lint-ignore no-explicit-any
          data: (result.data ?? []).map((s: any) => ({
            id: String(s.id ?? ""),
            name: s.name ?? "",
            series: s.series ?? "",
            code: s.ptcgoCode ?? "",
            releaseDate: s.releaseDate ?? "",
            images: { logo: s.images?.logo ?? null, symbol: s.images?.symbol ?? null },
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

        const searchParts: string[] = [];
        if (cardName) searchParts.push(nameQuery(cardName));
        if (setName) searchParts.push(`set.name:\"${escapeQueryValue(setName)}\"`);
        const params = new URLSearchParams({
          q: searchParts.join(" "),
          pageSize: String(Math.min(pageSize, 50)),
          page: String(page),
          orderBy: "name",
        });

        const result = await pokemonTcgFetch(`/cards?${params.toString()}`);
        let cards = (result.data ?? []).map(formatCard).filter(Boolean);

        if (cardName && setName) {
          const setLower = normalizeText(setName);
          // deno-lint-ignore no-explicit-any
          cards = cards.filter((c: any) =>
            normalizeText(c.set.name).includes(setLower) || setLower.includes(normalizeText(c.set.name))
          );
        }

        return json({ data: cards, totalCount: result.totalCount ?? 0 });
      }

      default:
        return json({ data: [], error: `Unknown action: ${action}` });
    }
  } catch (e) {
    console.error("pokemon-tcg function error:", e);
    return json({ data: [], error: e instanceof Error ? e.message : "Unknown error" });
  }
});
