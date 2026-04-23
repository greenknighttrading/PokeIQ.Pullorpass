import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://www.pokemonpricetracker.com/api/v2";

// ── Simple in-memory rate limiter ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // Lower limit — PPT credits are expensive
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Rate limiting ──
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("POKEMON_PRICE_TRACKER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "POKEMON_PRICE_TRACKER_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action, params } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing 'action' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    };

    let endpoint: string;
    let method = "GET";
    let fetchBody: string | undefined;

    switch (action) {
      case "getCards": {
        const qs = new URLSearchParams();
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== "") {
              qs.set(k, String(v));
            }
          }
        }
        endpoint = `${API_BASE}/cards?${qs.toString()}`;
        break;
      }

      case "getCardById": {
        const qs = new URLSearchParams();
        if (params?.tcgPlayerId) qs.set("tcgPlayerId", params.tcgPlayerId);
        if (params?.language) qs.set("language", params.language);
        if (params?.includeHistory) qs.set("includeHistory", "true");
        if (params?.includeEbay) qs.set("includeEbay", "true");
        if (params?.days) qs.set("days", String(params.days));
        endpoint = `${API_BASE}/cards?${qs.toString()}`;
        break;
      }

      case "searchCards": {
        const qs = new URLSearchParams();
        qs.set("search", params?.search || "");
        if (params?.language) qs.set("language", params.language);
        if (params?.limit) qs.set("limit", String(Math.min(params.limit, 50)));
        if (params?.offset) qs.set("offset", String(params.offset));
        if (params?.sortBy) qs.set("sortBy", params.sortBy);
        if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
        if (params?.minPrice) qs.set("minPrice", String(params.minPrice));
        if (params?.maxPrice) qs.set("maxPrice", String(params.maxPrice));
        if (params?.rarity) qs.set("rarity", params.rarity);
        if (params?.includeHistory) qs.set("includeHistory", "true");
        if (params?.days) qs.set("days", String(params.days));
        endpoint = `${API_BASE}/cards?${qs.toString()}`;
        break;
      }

      case "getSets": {
        const qs = new URLSearchParams();
        if (params?.language) qs.set("language", params.language);
        if (params?.limit) qs.set("limit", String(Math.min(params.limit, 100)));
        if (params?.offset) qs.set("offset", String(params.offset));
        endpoint = `${API_BASE}/sets?${qs.toString()}`;
        break;
      }

      case "getSealedProducts": {
        const qs = new URLSearchParams();
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== "") {
              qs.set(k, String(v));
            }
          }
        }
        endpoint = `${API_BASE}/sealed-products?${qs.toString()}`;
        break;
      }

      case "getPopulation": {
        const qs = new URLSearchParams();
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== "") {
              qs.set(k, String(v));
            }
          }
        }
        endpoint = `${API_BASE}/population?${qs.toString()}`;
        break;
      }

      case "parseTitle": {
        endpoint = `${API_BASE}/parse-title`;
        method = "POST";
        fetchBody = JSON.stringify({ title: params?.title });
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[pokemon-price-tracker] ${action} -> ${endpoint}`);

    const resp = await fetch(endpoint, {
      method,
      headers,
      ...(fetchBody ? { body: fetchBody } : {}),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error(`API error ${resp.status}:`, JSON.stringify(data).slice(0, 300));
      return new Response(
        JSON.stringify({ error: data?.message || data?.error || `API returned ${resp.status}`, status: resp.status }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pokemon-price-tracker error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
