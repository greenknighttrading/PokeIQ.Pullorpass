import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PPT_BASE = "https://www.pokemonpricetracker.com/api/v2";
const BATCH_SIZE = 100;
const PAGES_PER_CHUNK = 10;
const DELAY_MS = 1200;
const BULK_SYNC_INTERVAL_DAYS = 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: open — function only performs data sync writes via service role
  // and is rate-limited by upstream PPT credits.

  const PPT_API_KEY = Deno.env.get("POKEMON_PRICE_TRACKER_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!PPT_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];
  const syncId = "ppt";

  let forceRestart = false;
  try {
    const body = await req.json();
    if (body?.forceRestart) forceRestart = true;
  } catch { /* no body is fine */ }

  try {
    const { data: statusRow } = await supabase
      .from("market_sync_status")
      .select("*")
      .eq("id", syncId)
      .single();

    const lastCompleted = statusRow?.completed_at ? new Date(statusRow.completed_at) : null;
    const now = new Date();
    const daysSinceLastSync = lastCompleted
      ? (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSinceLastSync < BULK_SYNC_INTERVAL_DAYS && !forceRestart && statusRow?.status === "complete") {
      return new Response(
        JSON.stringify({
          skipped: true,
          reason: `Last bulk sync was ${daysSinceLastSync.toFixed(1)} days ago. Next sync in ${(BULK_SYNC_INTERVAL_DAYS - daysSinceLastSync).toFixed(1)} days.`,
          totalSynced: statusRow.total_synced,
          lastCompleted: statusRow.completed_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let startOffset = 0;
    let totalSynced = 0;

    if (statusRow?.status === "syncing" && !forceRestart) {
      startOffset = statusRow.last_offset || 0;
      totalSynced = statusRow.total_synced || 0;
    }

    await supabase.from("market_sync_status").upsert({
      id: syncId,
      product_type: "card",
      status: "syncing",
      started_at: statusRow?.status === "syncing" ? statusRow.started_at : new Date().toISOString(),
      last_offset: startOffset,
      total_synced: totalSynced,
      error_message: null,
    });

    const headers = {
      Authorization: `Bearer ${PPT_API_KEY.trim()}`,
      "Content-Type": "application/json",
    };

    let reachedEnd = false;

    for (let i = 0; i < PAGES_PER_CHUNK; i++) {
      const offset = startOffset + i * BATCH_SIZE;

      const qs = new URLSearchParams({
        minPrice: "5",
        limit: String(BATCH_SIZE),
        offset: String(offset),
        sortBy: "price",
        sortOrder: "desc",
      });

      const resp = await fetch(`${PPT_BASE}/cards?${qs.toString()}`, { headers });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error(`PPT API error at offset ${offset}:`, resp.status, errText.slice(0, 200));

        if (resp.status === 429) {
          await supabase.from("market_sync_status").upsert({
            id: syncId,
            status: "syncing",
            last_offset: offset,
            total_synced: totalSynced,
            error_message: `Rate limited at offset ${offset}, will retry`,
          });
          break;
        }

        await supabase.from("market_sync_status").upsert({
          id: syncId,
          status: "error",
          last_offset: offset,
          total_synced: totalSynced,
          error_message: `API ${resp.status} at offset ${offset}`,
        });
        break;
      }

      const result = await resp.json();
      const items = Array.isArray(result?.data) ? result.data : [];

      if (items.length === 0) {
        reachedEnd = true;
        break;
      }

      const rows = items
        .map((card: any) => {
          const market = card.prices?.market;
          if (market == null || market <= 0) return null;

          const primaryPrinting = card.prices?.primaryPrinting || Object.keys(card.prices?.variants || {})[0];
          const variantPrices = primaryPrinting ? card.prices?.variants?.[primaryPrinting] : null;

          const findConditionPrice = (condition: string): number | null => {
            if (!variantPrices) return null;
            for (const [key, val] of Object.entries(variantPrices)) {
              if (key.toLowerCase().includes(condition.toLowerCase())) {
                return (val as any)?.price ?? null;
              }
            }
            return null;
          };

          const productType = card.stage === "Sealed" || card.cardType === "Sealed" ? "sealed" : "card";

          return {
            card_id: `ppt-${card.tcgPlayerId}`,
            name: card.name,
            set_name: card.setName || null,
            set_id: card.setId ? String(card.setId) : null,
            number: card.cardNumber || null,
            rarity: card.rarity || null,
            tcgplayer_id: card.tcgPlayerId || null,
            product_type: productType,
            condition: "Near Mint",
            printing: primaryPrinting || null,
            price: market,
            snapshot_date: today,
            game: "Pokemon",
            source: "ppt",
            ppt_id: card.id || null,
            price_nm: findConditionPrice("Near Mint"),
            price_lp: findConditionPrice("Lightly Played"),
            price_mp: findConditionPrice("Moderately Played"),
            price_hp: findConditionPrice("Heavily Played"),
            price_dmg: findConditionPrice("Damaged"),
            primary_printing: primaryPrinting || null,
            pokemon_type: card.pokemonType || null,
            energy_type: Array.isArray(card.energyType) ? card.energyType : null,
            hp: card.hp || null,
            stage: card.stage || null,
            artist: card.artist || null,
            image_url: card.imageCdnUrl200 || card.imageUrl || null,
            sellers: card.prices?.sellers ?? null,
            listings: card.prices?.listings ?? null,
          };
        })
        .filter(Boolean);

      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("market_snapshots")
          .upsert(rows, { onConflict: "card_id,snapshot_date" });

        if (upsertErr) {
          console.error("Upsert error:", upsertErr.message);
        } else {
          totalSynced += rows.length;
        }
      }

      const newOffset = offset + items.length;

      await supabase.from("market_sync_status").upsert({
        id: syncId,
        last_offset: newOffset,
        total_synced: totalSynced,
        status: "syncing",
      });

      console.log(`[ppt] offset=${newOffset}, synced=${totalSynced}`);

      if (items.length < BATCH_SIZE) {
        reachedEnd = true;
        break;
      }

      await sleep(DELAY_MS);
    }

    if (reachedEnd) {
      await supabase.from("market_sync_status").upsert({
        id: syncId,
        status: "complete",
        completed_at: new Date().toISOString(),
        total_synced: totalSynced,
      });
      console.log(`[ppt] COMPLETE! Total synced: ${totalSynced}`);
    } else {
      console.log(`[ppt] Chunk done. Next cron will continue from offset ${startOffset + PAGES_PER_CHUNK * BATCH_SIZE}.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: "ppt",
        totalSynced,
        reachedEnd,
        nextOffset: reachedEnd ? 0 : startOffset + PAGES_PER_CHUNK * BATCH_SIZE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-ppt-data error:", e);
    await supabase.from("market_sync_status").upsert({
      id: syncId,
      status: "error",
      error_message: e instanceof Error ? e.message : "Unknown error",
    });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
