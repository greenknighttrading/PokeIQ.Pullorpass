import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// NOTE: The official Swagger spec only lists a mock server. The real production
// base URL is provided privately by Collectr when you receive your API key.
// Override via the COLLECTR_API_BASE secret if `api.getcollectr.com` is wrong.
const API_BASE =
  Deno.env.get("COLLECTR_API_BASE")?.replace(/\/$/, "") ||
  "https://api-v2.getcollectr.com";

// Convenience map: human-readable category -> base64 ID used by Collectr.
const CATEGORY_IDS: Record<string, string> = {
  magic: "MzQ3",
  yugioh: "Njk0",
  pokemon: "MTA0MQ==",
  "cardfight vanguard": "NTU1Mg==",
  "force of will": "NTg5OQ==",
  "weiss schwarz": "Njk0MA==",
  "final fantasy tcg": "ODMyOA==",
  universus: "ODY3NQ==",
  "star wars destiny": "OTAyMg==",
  "star wars unlimited": "Mjc0MTM=",
  "dragon ball super ccg": "OTM2OQ==",
  funko: "MTAwNjM=",
  "transformers tcg": "MTk3Nzk=",
  "flesh and blood tcg": "MjE1MTQ=",
  "digimon card game": "MjE4NjE=",
  "gate ruler": "MjI1NTU=",
  metazoo: "MjI5MDI=",
  wixoss: "MjMyNDk=",
  "one piece card game": "MjM1OTY=",
  lorcana: "MjQ2Mzc=",
  "dragon ball super fusion world": "Mjc3NjA=",
};

// ── Simple in-memory rate limiter (per IP) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
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

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const apiKey = Deno.env.get("COLLECTR_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "COLLECTR_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, params } = body as { action?: string; params?: Record<string, unknown> };

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing 'action' field. Use 'getLimits', 'search', or 'getProduct'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let endpoint: string;

    switch (action) {
      case "getLimits": {
        endpoint = `${API_BASE}/partners/account/limits`;
        break;
      }
      case "search": {
        // Accept either { searchString } or { query } from callers.
        const searchString =
          (params?.searchString as string | undefined) ??
          (params?.query as string | undefined);
        if (!searchString) {
          return new Response(
            JSON.stringify({ error: "Missing 'params.searchString' (or 'query')" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const qs = new URLSearchParams();
        qs.set("searchString", String(searchString));

        // Optional category — accept either a raw base64 ID or a friendly name.
        const rawCat = params?.categories ?? params?.category;
        if (rawCat) {
          const key = String(rawCat).toLowerCase().trim();
          const mapped = CATEGORY_IDS[key] ?? String(rawCat);
          qs.set("categories", mapped);
        }

        endpoint = `${API_BASE}/partners/catalog/search?${qs.toString()}`;
        break;
      }
      case "getProduct": {
        const productId = params?.productId;
        if (!productId) {
          return new Response(
            JSON.stringify({ error: "Missing 'params.productId'" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const qs = new URLSearchParams();
        if (params?.gradingData) qs.set("gradingData", "true");
        const q = qs.toString();
        endpoint = `${API_BASE}/partners/catalog/product/${encodeURIComponent(String(productId))}${q ? `?${q}` : ""}`;
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[collectr] ${action} -> ${endpoint}`);

    // Collectr Partner API uses an API key header. Send it via both common
    // header names so we cover whichever the gateway expects.
    const resp = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "x-api-key": apiKey.trim(),
        "Content-Type": "application/json",
      },
    });

    const text = await resp.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      console.error(`[collectr] API error ${resp.status}:`, text.slice(0, 300));
      return new Response(
        JSON.stringify({
          error:
            (data as any)?.message ||
            (data as any)?.error ||
            `API returned ${resp.status}`,
          status: resp.status,
          details: data,
        }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("collectr error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});