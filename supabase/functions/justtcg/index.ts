import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://api.justtcg.com/v1";
const RAPIDAPI_HOST = "pokemon-tcg-api.p.rapidapi.com";

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Clean up old entries periodically
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth: require valid user JWT to prevent paid API abuse ──
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  // ── Rate limiting ──
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return json({ error: "Rate limit exceeded. Please try again later." }, 429);
  }

  const JUSTTCG_API_KEY = (Deno.env.get("JUSTTCG_API_KEY") || "").replace(/[^\x20-\x7E]/g, "").trim();
  if (!JUSTTCG_API_KEY) {
    return json({ error: "JUSTTCG_API_KEY is not configured" }, 500);
  }

  try {
    const { action, query, cardId, game, set, condition, printing, limit, offset, category: cat, timeRange } = await req.json();

    const headers = {
      "x-api-key": JUSTTCG_API_KEY,
      "Content-Type": "application/json",
    };

    switch (action) {
      case "search": {
        const q = typeof query === "string" ? query.trim() : "";
        if (q.length < 2) return json({ data: [], meta: { total: 0 } });

        const searchLimit = Math.min(limit || 20, 50);
        const searchOffset = offset || 0;
        const searchGame = game || "pokemon";

        const buildParams = (searchQ: string) => {
          const params = new URLSearchParams({
            q: searchQ,
            game: searchGame,
            limit: String(searchLimit),
            offset: String(searchOffset),
            include_price_history: "false",
            include_statistics: "7d,30d",
          });
          if (condition) params.set("condition", condition);
          if (printing) params.set("printing", printing);
          return params;
        };

        // First try exact query
        const resp = await fetch(`${BASE_URL}/cards?${buildParams(q).toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG search error:", resp.status, text.slice(0, 300));
          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        const exactResults = Array.isArray(result?.data) ? result.data : [];

        // If few results and multi-word query, try searching by longest word and filter
        const words = q.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2);
        if (exactResults.length < 3 && words.length >= 2) {
          // Search by the longest word (most specific)
          const sortedWords = [...words].sort((a: string, b: string) => b.length - a.length);
          const primaryWord = sortedWords[0];
          
          const fallbackResp = await fetch(`${BASE_URL}/cards?${buildParams(primaryWord).toString()}`, { headers });
          if (fallbackResp.ok) {
            const fallbackResult = await fallbackResp.json();
            const fallbackData = Array.isArray(fallbackResult?.data) ? fallbackResult.data : [];
            
            // Filter to items whose name contains ALL search words (in any order)
            const filtered = fallbackData.filter((card: any) => {
              const name = (card.name || "").toLowerCase();
              return words.every((w: string) => name.includes(w));
            });

            // Merge: exact results first, then filtered fallback (deduplicated)
            const seenIds = new Set(exactResults.map((c: any) => c.id));
            const merged = [...exactResults];
            for (const card of filtered) {
              if (!seenIds.has(card.id)) {
                merged.push(card);
                seenIds.add(card.id);
              }
            }
            return json({ ...result, data: merged });
          }
        }

        return json(result);
      }

      case "getCard": {
        if (!cardId) return json({ data: null });

        const params = new URLSearchParams({
          cardId,
          game: game || "pokemon",
          include_price_history: "true",
          priceHistoryDuration: "180d",
          include_statistics: "7d,30d,90d,1y,allTime",
        });

        const resp = await fetch(`${BASE_URL}/cards?${params.toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG getCard error:", resp.status, text.slice(0, 300));
          return json({ data: null, error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "getCardByTcgPlayerId": {
        const tcgPlayerId = cardId;
        if (!tcgPlayerId) return json({ data: null });

        const params = new URLSearchParams({
          tcgplayerId: tcgPlayerId,
          game: game || "pokemon",
          include_price_history: "true",
          priceHistoryDuration: "180d",
          include_statistics: "7d,30d,90d,1y,allTime",
        });

        const resp = await fetch(`${BASE_URL}/cards?${params.toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG getCardByTcgPlayerId error:", resp.status, text.slice(0, 300));
          return json({ data: null, error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "getSets": {
        const params = new URLSearchParams({
          game: game || "pokemon",
          orderBy: "release_date",
          order: "desc",
        });

        const resp = await fetch(`${BASE_URL}/sets?${params.toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG sets error:", resp.status, text.slice(0, 300));

          // ── Fallback: aggregate from market_snapshots via DB function ──
          try {
            const sbUrl = Deno.env.get("SUPABASE_URL") || "";
            const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
            if (sbUrl && sbKey) {
              const sb = createClient(sbUrl, sbKey);
              const { data: rows, error: dbErr } = await sb.rpc("get_set_stats");

              if (!dbErr && rows && rows.length > 0) {
                const setsData = rows.map((r: any) => ({
                  id: r.set_name,
                  name: r.set_name,
                  release_date: null,
                  cards_count: Number(r.cards_count) || 0,
                  sealed_count: 0,
                  set_value_usd: Number(r.total_value) || 0,
                  set_value_change_7d_pct: r.median_7d != null ? Number(r.median_7d) : null,
                  set_value_change_30d_pct: r.median_30d != null ? Number(r.median_30d) : null,
                  set_value_change_90d_pct: r.median_90d != null ? Number(r.median_90d) : null,
                }));
                console.log(`Fallback: returning ${setsData.length} sets from DB`);
                return json({ data: setsData });
              } else {
                console.error("DB fallback error:", dbErr);
              }
            }
          } catch (fallbackErr) {
            console.error("Fallback DB query failed:", fallbackErr);
          }

          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "getBySet": {
        if (!set) return json({ data: [], error: "set is required" });

        const params = new URLSearchParams({
          set,
          game: game || "pokemon",
          limit: String(Math.min(limit || 50, 100)),
          offset: String(offset || 0),
          include_price_history: "false",
          include_statistics: "7d,30d,90d",
        });
        if (condition) params.set("condition", condition);

        const resp = await fetch(`${BASE_URL}/cards?${params.toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG bySet error:", resp.status, text.slice(0, 300));
          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "marketMovers": {
        const direction = condition || "desc";
        const params = new URLSearchParams({
          game: "pokemon",
          orderBy: timeRange || "7d",
          order: direction === "asc" ? "asc" : "desc",
          limit: String(Math.min(limit || 50, 50)),
          offset: String(offset || 0),
          include_price_history: "false",
          include_statistics: "7d,30d,90d",
        });

        const resp = await fetch(`${BASE_URL}/cards?${params.toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG marketMovers error:", resp.status, text.slice(0, 300));
          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "sealedMovers": {
        const direction = condition || "desc";
        const params = new URLSearchParams({
          game: "pokemon",
          orderBy: timeRange || "7d",
          order: direction === "asc" ? "asc" : "desc",
          limit: String(Math.min(limit || 50, 50)),
          offset: String(offset || 0),
          include_price_history: "false",
          include_statistics: "7d,30d,90d",
          condition: "sealed",
        });

        const resp = await fetch(`${BASE_URL}/cards?${params.toString()}`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG sealedMovers error:", resp.status, text.slice(0, 300));
          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "grailMovers": {
        const direction = condition || "desc";
        const allItems: unknown[] = [];

        // Cap to 2 pages max to prevent abuse
        for (let page = 0; page < 2; page++) {
          const params = new URLSearchParams({
            game: "pokemon",
            orderBy: timeRange || "7d",
            order: direction === "asc" ? "asc" : "desc",
            limit: "50",
            offset: String(page * 50),
            include_price_history: "false",
            include_statistics: "7d,30d,90d",
          });

          const resp = await fetch(`${BASE_URL}/cards?${params.toString()}`, { headers });
          if (!resp.ok) break;
          const result = await resp.json();
          const items = Array.isArray(result?.data) ? result.data : [];
          allItems.push(...items);
          if (items.length < 50) break;
        }

        const grails = allItems.filter((card: any) => {
          const nmVariant = card?.variants?.find((v: any) => v.condition === "Near Mint") || card?.variants?.[0];
          return nmVariant?.price != null && nmVariant.price >= 400;
        });
        return json({ data: grails.slice(0, Math.min(Number(limit) || 10, 20)) });
      }

      case "gradedMovers": {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) {
          return json({ error: "RAPIDAPI_KEY is not configured" }, 500);
        }

        const searches = ["charizard", "pikachu", "umbreon", "mewtwo", "lugia"];
        const allCards: unknown[] = [];

        for (const sq of searches) {
          const url = `https://${RAPIDAPI_HOST}/cards?search=${encodeURIComponent(sq)}&sort=price_highest&limit=10&rapidapi-key=${RAPIDAPI_KEY}`;
          try {
            const resp = await fetch(url, {
              headers: {
                "x-rapidapi-key": RAPIDAPI_KEY,
                "x-rapidapi-host": RAPIDAPI_HOST,
              },
            });
            if (resp.ok) {
              const result = await resp.json();
              const items = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
              allCards.push(...items);
            }
          } catch (e) {
            console.error(`RapidAPI search error for ${sq}:`, e);
          }
        }

        const graded = allCards.filter((c: any) => {
          const g = c?.prices?.cardmarket?.graded;
          return g && typeof g === 'object' && !Array.isArray(g) && Object.keys(g).length > 0;
        });

        graded.sort((a: any, b: any) => {
          const getTop = (c: any) => {
            const g = c?.prices?.cardmarket?.graded || {};
            let max = 0;
            for (const co of Object.values(g) as any[]) {
              for (const v of Object.values(co) as number[]) {
                if (v > max) max = v;
              }
            }
            return max;
          };
          return getTop(b) - getTop(a);
        });

        const seen = new Set<number>();
        const unique = graded.filter((c: any) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });

        return json({ data: unique.slice(0, Math.min(limit || 10, 20)) });
      }

      case "getGradedCard": {
        const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
        if (!RAPIDAPI_KEY) {
          return json({ error: "RAPIDAPI_KEY is not configured" }, 500);
        }

        const searchName = query || cardId;
        if (!searchName) return json({ data: null, error: "query or cardId required" });

        const matchSet = (set || "").toLowerCase().trim();
        const matchNumber = (condition || "").trim();

        const url = `https://${RAPIDAPI_HOST}/cards?search=${encodeURIComponent(searchName)}&sort=price_highest&limit=20`;
        try {
          const resp = await fetch(url, {
            headers: {
              "x-rapidapi-key": RAPIDAPI_KEY,
              "x-rapidapi-host": RAPIDAPI_HOST,
            },
          });
          if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            console.error("RapidAPI getGradedCard error:", resp.status, text.slice(0, 300));
            return json({ data: null, error: `RapidAPI error: ${resp.status}` });
          }
          const result = await resp.json();
          const items = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
          
          const withGraded = items.filter((c: any) => {
            const g = c?.prices?.cardmarket?.graded;
            return g && typeof g === 'object' && !Array.isArray(g) && Object.keys(g).length > 0;
          });

          if (withGraded.length === 0) return json({ data: null });

          const scored = withGraded.map((c: any) => {
            const cName = (c.name || "").toLowerCase().trim();
            const cSet = (c.episode?.name || "").toLowerCase();
            const cNumber = String(c.card_number || "");
            const sName = searchName.toLowerCase().replace(/\s*-\s*\d+\/\d+/, '').replace(/\s*\(.*?\)\s*$/, '').trim();

            let nameMatch = false;
            let score = 0;
            if (cName === sName) { nameMatch = true; score += 10; }
            else if (cName.includes(sName) || sName.includes(cName)) { nameMatch = true; score += 5; }

            if (matchSet && cSet === matchSet) score += 10;
            else if (matchSet && (cSet.includes(matchSet) || matchSet.includes(cSet))) score += 5;

            if (matchNumber) {
              const ourNum = matchNumber.replace(/.*?(\d+).*/, '$1');
              if (cNumber === ourNum) score += 10;
            }

            return { card: c, score, nameMatch };
          });

          const nameMatched = scored.filter((s: any) => s.nameMatch);
          if (nameMatched.length === 0) return json({ data: null });

          nameMatched.sort((a: any, b: any) => b.score - a.score);
          const best = nameMatched[0];

          return json({ data: best.card });
        } catch (e) {
          console.error("RapidAPI getGradedCard fetch error:", e);
          return json({ data: null, error: e instanceof Error ? e.message : "Failed" });
        }
      }

      case "getGames": {
        const resp = await fetch(`${BASE_URL}/games`, { headers });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG games error:", resp.status, text.slice(0, 300));
          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      case "batchLookup": {
        const { ids } = await req.json().catch(() => ({ ids: [] }));
        if (!Array.isArray(ids) || ids.length === 0) return json({ data: [] });
        // Cap batch size
        const cappedIds = ids.slice(0, 50);

        const body = cappedIds.map((id: string) => ({ cardId: id }));
        const resp = await fetch(`${BASE_URL}/cards`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          console.error("JustTCG batch error:", resp.status, text.slice(0, 300));
          return json({ data: [], error: `JustTCG error: ${resp.status}` });
        }
        const result = await resp.json();
        return json(result);
      }

      default:
        return json({ data: [], error: `Unknown action: ${action}` });
    }
  } catch (e) {
    console.error("justtcg function error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
