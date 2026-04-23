/**
 * ingest-unified — Upserts JustTCG cards/variants/metrics AND PPT metadata
 * into the new normalised tables.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PPT_BASE = "https://www.pokemonpricetracker.com/api/v2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const SEALED_KEYWORDS = [
  "elite trainer box", "etb", "booster box", "booster pack",
  "collection box", "tin", "blister", "bundle", "case",
  "display", "starter deck", "theme deck", "build & battle",
  "premium collection", "ultra premium", "vstar universe",
  "trainer gallery", "special collection", "gift box",
];

function isSealed(name: string, number: string | null): boolean {
  if (!number) return true;
  const lower = name.toLowerCase();
  return SEALED_KEYWORDS.some((kw) => lower.includes(kw));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth guard: require service role or anon key ──
  const authHeader = req.headers.get("authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authHeader.includes(serviceKey) && !authHeader.includes(anonKey)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const PPT_API_KEY = Deno.env.get("POKEMON_PRICE_TRACKER_API_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing env vars" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "upsertJustTCG": {
        const cards: any[] = body.cards || [];
        if (cards.length === 0) return json({ upserted: 0 });

        const cardRows: any[] = [];
        const variantRows: any[] = [];
        const metricsRows: any[] = [];
        const today = new Date().toISOString().split("T")[0];

        for (const card of cards) {
          const cardId = card.id || card.cardId;
          if (!cardId) continue;

          cardRows.push({
            id: cardId,
            tcgplayer_id: card.tcgplayerId || null,
            name: card.name || "",
            game: card.game || "pokemon",
            set_code: card.set || null,
            set_name: card.set_name || null,
            number: card.number || null,
            rarity: card.rarity || null,
            is_sealed: isSealed(card.name || "", card.number),
          });

          const variants = Array.isArray(card.variants) ? card.variants : [];
          for (const v of variants) {
            const variantId = v.id || `${cardId}_${v.condition}_${v.printing}_${v.language}`;
            const variantKey = `${cardId}|${v.condition || ""}|${v.printing || ""}|${v.language || ""}`;

            variantRows.push({
              id: variantId, card_id: cardId,
              condition: v.condition || null, printing: v.printing || null,
              language: v.language || null, tcgplayer_sku_id: v.tcgplayerSkuId || null,
              price_current: v.price ?? null, last_updated: v.lastUpdated ?? null,
              variant_key: variantKey,
            });

            const periods = ["24h", "7d", "30d"] as const;
            for (const period of periods) {
              const suffix = period === "24h" ? "24hr" : period;
              const changePct = v[`priceChange${suffix}`] ?? v[`priceChange${period}`] ?? null;
              if (changePct != null || v[`avgPrice${suffix}`] != null || v.avgPrice != null) {
                metricsRows.push({
                  variant_id: variantId, as_of_date: today, period,
                  price_change_pct: changePct,
                  avg_price: period === "7d" ? (v.avgPrice ?? null) : (v[`avgPrice${suffix}`] ?? v.avgPrice30d ?? null),
                  min_price: v[`minPrice${suffix}`] ?? v[`minPrice${period}`] ?? null,
                  max_price: v[`maxPrice${suffix}`] ?? v[`maxPrice${period}`] ?? null,
                  stddev: v[`stddevPopPrice${suffix}`] ?? v[`stddevPopPrice${period}`] ?? null,
                  cov: v[`covPrice${suffix}`] ?? v[`covPrice${period}`] ?? null,
                  iqr: v[`iqrPrice${suffix}`] ?? v[`iqrPrice${period}`] ?? null,
                  trend_slope: v[`trendSlope${suffix}`] ?? v[`trendSlope${period}`] ?? null,
                  price_changes_count: v[`priceChangesCount${suffix}`] ?? v[`priceChangesCount${period}`] ?? null,
                  price_relative_to_30d_range: period === "30d" ? (v.priceRelativeTo30dRange ?? null) : null,
                });
              }
            }
          }
        }

        if (cardRows.length > 0) {
          const { error: ce } = await supabase.from("cards_justtcg").upsert(cardRows, { onConflict: "id" });
          if (ce) console.error("cards_justtcg upsert error:", ce.message);
        }
        if (variantRows.length > 0) {
          const { error: ve } = await supabase.from("variants_justtcg").upsert(variantRows, { onConflict: "id" });
          if (ve) console.error("variants_justtcg upsert error:", ve.message);
        }
        if (metricsRows.length > 0) {
          const key = (r: any) => `${r.variant_id}|${r.period}|${r.as_of_date}`;
          const deduped = new Map<string, any>();
          for (const r of metricsRows) deduped.set(key(r), r);
          const { error: me } = await supabase.from("metrics_snapshots_justtcg")
            .upsert([...deduped.values()], { onConflict: "variant_id,period,as_of_date", ignoreDuplicates: true });
          if (me) console.error("metrics upsert error:", me.message);
        }

        return json({ upserted: { cards: cardRows.length, variants: variantRows.length, metrics: metricsRows.length } });
      }

      case "upsertPPT": {
        const pptCards: any[] = body.cards || [];
        if (pptCards.length === 0) return json({ upserted: 0 });

        const rows = pptCards.map((c: any) => ({
          ppt_id: c.id || c.ppt_id,
          tcgplayer_id: c.tcgPlayerId || c.tcgplayer_id || null,
          name: c.name || "",
          set_name: c.setName || c.set_name || null,
          card_number: c.cardNumber || c.card_number || null,
          total_set_number: c.totalSetNumber || c.total_set_number || null,
          rarity: c.rarity || null,
          card_type: c.cardType || c.card_type || null,
          pokemon_type: c.pokemonType || c.pokemon_type || null,
          energy_type: Array.isArray(c.energyType || c.energy_type) ? (c.energyType || c.energy_type) : null,
          hp: c.hp ?? null, stage: c.stage || null,
          flavor_text: c.flavorText || c.flavor_text || null, artist: c.artist || null,
          tcgplayer_url: c.tcgPlayerUrl || c.tcgplayer_url || null,
          image_cdn_url: c.imageCdnUrl || c.image_cdn_url || null,
          image_cdn_url_200: c.imageCdnUrl200 || c.image_cdn_url_200 || null,
          image_cdn_url_400: c.imageCdnUrl400 || c.image_cdn_url_400 || null,
          image_cdn_url_800: c.imageCdnUrl800 || c.image_cdn_url_800 || null,
        })).filter((r: any) => r.ppt_id);

        const { error } = await supabase.from("cards_ppt").upsert(rows, { onConflict: "ppt_id" });
        if (error) console.error("cards_ppt upsert error:", error.message);

        return json({ upserted: rows.length });
      }

      case "hydratePPT": {
        if (!PPT_API_KEY) return json({ error: "PPT API key not configured" }, 500);
        const tcgplayerId = body.tcgplayerId;
        if (!tcgplayerId) return json({ error: "tcgplayerId required" }, 400);

        const { data: existing } = await supabase.from("cards_ppt").select("updated_at").eq("tcgplayer_id", tcgplayerId).maybeSingle();
        if (existing) {
          const age = Date.now() - new Date(existing.updated_at).getTime();
          if (age < 24 * 60 * 60 * 1000) return json({ cached: true, tcgplayerId });
        }

        const qs = new URLSearchParams({ tcgPlayerId: tcgplayerId });
        const resp = await fetch(`${PPT_BASE}/cards?${qs}`, {
          headers: { Authorization: `Bearer ${PPT_API_KEY.trim()}`, "Content-Type": "application/json" },
        });
        if (!resp.ok) return json({ error: `PPT API ${resp.status}` }, resp.status);

        const result = await resp.json();
        const card = Array.isArray(result?.data) ? result.data[0] : result?.data;
        if (!card) return json({ error: "Card not found on PPT" }, 404);

        const { error } = await supabase.from("cards_ppt").upsert({
          ppt_id: card.id, tcgplayer_id: card.tcgPlayerId, name: card.name,
          set_name: card.setName || null, card_number: card.cardNumber || null,
          total_set_number: card.totalSetNumber || null, rarity: card.rarity || null,
          card_type: card.cardType || null, pokemon_type: card.pokemonType || null,
          energy_type: Array.isArray(card.energyType) ? card.energyType : null,
          hp: card.hp ?? null, stage: card.stage || null, flavor_text: card.flavorText || null,
          artist: card.artist || null, tcgplayer_url: card.tcgPlayerUrl || null,
          image_cdn_url: card.imageCdnUrl || null, image_cdn_url_200: card.imageCdnUrl200 || null,
          image_cdn_url_400: card.imageCdnUrl400 || null, image_cdn_url_800: card.imageCdnUrl800 || null,
        }, { onConflict: "ppt_id" });
        if (error) console.error("hydratePPT upsert error:", error.message);

        return json({ hydrated: true, tcgplayerId });
      }

      case "hydrateBatch": {
        if (!PPT_API_KEY) return json({ error: "PPT API key not configured" }, 500);
        const ids: string[] = (body.tcgplayerIds || []).slice(0, 20);
        if (ids.length === 0) return json({ hydrated: 0 });

        const { data: cached } = await supabase.from("cards_ppt").select("tcgplayer_id, updated_at").in("tcgplayer_id", ids);
        const freshCutoff = Date.now() - 24 * 60 * 60 * 1000;
        const freshIds = new Set((cached || []).filter((r: any) => new Date(r.updated_at).getTime() > freshCutoff).map((r: any) => r.tcgplayer_id));
        const needFetch = ids.filter((id) => !freshIds.has(id));
        let hydrated = 0;

        for (const tcgId of needFetch) {
          try {
            const qs = new URLSearchParams({ tcgPlayerId: tcgId });
            const resp = await fetch(`${PPT_BASE}/cards?${qs}`, {
              headers: { Authorization: `Bearer ${PPT_API_KEY.trim()}`, "Content-Type": "application/json" },
            });
            if (resp.ok) {
              const result = await resp.json();
              const card = Array.isArray(result?.data) ? result.data[0] : result?.data;
              if (card) {
                await supabase.from("cards_ppt").upsert({
                  ppt_id: card.id, tcgplayer_id: card.tcgPlayerId, name: card.name,
                  set_name: card.setName || null, card_number: card.cardNumber || null,
                  total_set_number: card.totalSetNumber || null, rarity: card.rarity || null,
                  card_type: card.cardType || null, pokemon_type: card.pokemonType || null,
                  energy_type: Array.isArray(card.energyType) ? card.energyType : null,
                  hp: card.hp ?? null, stage: card.stage || null, flavor_text: card.flavorText || null,
                  artist: card.artist || null, tcgplayer_url: card.tcgPlayerUrl || null,
                  image_cdn_url: card.imageCdnUrl || null, image_cdn_url_200: card.imageCdnUrl200 || null,
                  image_cdn_url_400: card.imageCdnUrl400 || null, image_cdn_url_800: card.imageCdnUrl800 || null,
                }, { onConflict: "ppt_id" });
                hydrated++;
              }
            }
            await sleep(500);
          } catch (e) {
            console.error(`hydrateBatch error for ${tcgId}:`, e);
          }
        }

        return json({ hydrated, skippedFresh: freshIds.size, total: ids.length });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("ingest-unified error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
