import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JUSTTCG_BASE = "https://api.justtcg.com/v1";
const BATCH_SIZE = 100;
const PAGES_PER_CHUNK = 20;
const DELAY_MS = 350;

const SEALED_KEYWORDS = [
  "elite trainer box", "etb", "booster box", "booster pack",
  "collection box", "tin", "blister", "bundle", "case",
  "display", "starter deck", "theme deck", "build & battle",
  "premium collection", "ultra premium", "vstar universe",
  "trainer gallery", "special collection", "gift box",
];

function isSealedProduct(name: string): boolean {
  const lower = name.toLowerCase();
  return SEALED_KEYWORDS.some((kw) => lower.includes(kw));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require the service role key: only cron / admin tooling may invoke this
  // — it triggers expensive paid-API syncs and writes to market_snapshots.
  const authHeader = req.headers.get("authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey || !authHeader.includes(serviceKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const JUSTTCG_API_KEY = Deno.env.get("JUSTTCG_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!JUSTTCG_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];

  let productType = "card";
  let forceRestart = false;
  let minPrice = 5;
  let maxPrice: number | undefined = undefined;
  let syncIntervalDays = 1;
  let gameId = "pokemon";
  let gameLabel = "Pokemon";
  try {
    const body = await req.json();
    if (body?.productType) productType = body.productType;
    if (body?.forceRestart) forceRestart = true;
    if (body?.minPrice !== undefined) minPrice = Number(body.minPrice);
    if (body?.maxPrice !== undefined) maxPrice = Number(body.maxPrice);
    if (body?.syncIntervalDays !== undefined) syncIntervalDays = Number(body.syncIntervalDays);
    if (body?.game) gameId = body.game;
    if (body?.gameLabel) gameLabel = body.gameLabel;
  } catch { /* no body is fine */ }

  const GAME_LABELS: Record<string, string> = {
    "pokemon": "Pokemon",
    "pokemon-japan": "Pokemon Japan",
    "one-piece-card-game": "One Piece",
  };
  if (!gameLabel || gameLabel === "Pokemon") {
    gameLabel = GAME_LABELS[gameId] || gameId;
  }

  const gameSuffix = gameId !== "pokemon" ? `-${gameId}` : "";
  const tierSuffix = minPrice >= 5 ? "" : maxPrice ? `-${minPrice}to${maxPrice}` : `-${minPrice}plus`;
  const syncId = productType === "sealed" ? `sealed${gameSuffix}` : `main${tierSuffix}${gameSuffix}`;
  const conditionFilter = productType === "sealed" ? "sealed" : undefined;
  const bestCondition = productType === "sealed" ? "Sealed" : "Near Mint";

  try {
    const { data: statusRow } = await supabase
      .from("market_sync_status")
      .select("*")
      .eq("id", syncId)
      .single();

    const alreadyComplete = statusRow?.status === "complete";
    const lastCompleted = statusRow?.completed_at ? new Date(statusRow.completed_at) : null;
    const now = new Date();
    const daysSinceLastSync = lastCompleted
      ? (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (alreadyComplete && daysSinceLastSync < syncIntervalDays && !forceRestart) {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Completed ${daysSinceLastSync.toFixed(1)} days ago, interval is ${syncIntervalDays}d`, totalSynced: statusRow.total_synced }),
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
      product_type: productType,
      status: "syncing",
      started_at: statusRow?.status === "syncing" ? statusRow.started_at : new Date().toISOString(),
      last_offset: startOffset,
      total_synced: totalSynced,
      error_message: null,
    });

    const headers = {
      "x-api-key": JUSTTCG_API_KEY,
      "Content-Type": "application/json",
    };

    let reachedEnd = false;
    const startPage = Math.floor(startOffset / BATCH_SIZE);

    for (let i = 0; i < PAGES_PER_CHUNK; i++) {
      const page = startPage + i;
      const offset = page * BATCH_SIZE;

      const params = new URLSearchParams({
        game: gameId,
        orderBy: "price",
        order: "desc",
        limit: String(BATCH_SIZE),
        offset: String(offset),
        include_price_history: "false",
        include_statistics: "7d,30d,90d",
      });
      if (minPrice > 0) params.set("minPrice", String(minPrice));
      if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
      if (conditionFilter) params.set("condition", conditionFilter);

      const resp = await fetch(`${JUSTTCG_BASE}/cards?${params.toString()}`, { headers });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error(`API error at offset ${offset}:`, resp.status, errText.slice(0, 200));

        await supabase.from("market_sync_status").upsert({
          id: syncId,
          status: "syncing",
          last_offset: offset,
          total_synced: totalSynced,
          error_message: `API ${resp.status} at offset ${offset}, will retry`,
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
          const variant =
            card.variants?.find((v: any) => v.condition === bestCondition) ||
            card.variants?.[0];
          if (!variant || variant.price == null) return null;

          let finalProductType = productType;
          if (productType === "card" && isSealedProduct(card.name)) {
            finalProductType = "sealed";
          }

          return {
            card_id: card.id,
            name: card.name,
            set_name: card.set_name || null,
            set_id: card.set_id || null,
            number: card.number || null,
            rarity: card.rarity || null,
            tcgplayer_id: card.tcgplayerId || null,
            product_type: finalProductType,
            condition: variant.condition || null,
            printing: variant.printing || null,
            price: variant.price,
            price_change_24h: variant.priceChange24hr ?? variant.priceChange24h ?? null,
            price_change_7d: variant.priceChange7d ?? null,
            price_change_30d: variant.priceChange30d ?? null,
            price_change_90d: variant.priceChange90d ?? null,
            avg_price_7d: variant.avgPrice7d ?? variant.avgPrice ?? variant.statistics?.["7d"]?.avg ?? null,
            min_price_7d: variant.minPrice7d ?? variant.statistics?.["7d"]?.min ?? null,
            max_price_7d: variant.maxPrice7d ?? variant.statistics?.["7d"]?.max ?? null,
            avg_price_30d: variant.avgPrice30d ?? variant.statistics?.["30d"]?.avg ?? null,
            min_price_30d: variant.minPrice30d ?? variant.statistics?.["30d"]?.min ?? null,
            max_price_30d: variant.maxPrice30d ?? variant.statistics?.["30d"]?.max ?? null,
            cov_price_7d: variant.covPrice7d ?? variant.statistics?.["7d"]?.cov ?? null,
            cov_price_30d: variant.covPrice30d ?? variant.statistics?.["30d"]?.cov ?? null,
            trend_slope_7d: variant.trendSlope7d ?? variant.statistics?.["7d"]?.trendSlope ?? null,
            trend_slope_30d: variant.trendSlope30d ?? variant.statistics?.["30d"]?.trendSlope ?? null,
            snapshot_date: today,
            game: gameLabel,
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

        try {
          const cardRows = items.map((card: any) => {
            const cardId = card.id;
            if (!cardId) return null;
            return {
              id: cardId,
              tcgplayer_id: card.tcgplayerId || null,
              name: card.name || "",
              game: gameId,
              set_code: card.set || null,
              set_name: card.set_name || null,
              number: card.number || null,
              rarity: card.rarity || null,
              is_sealed: isSealedProduct(card.name || "") || !card.number,
            };
          }).filter(Boolean);

          if (cardRows.length > 0) {
            await supabase.from("cards_justtcg").upsert(cardRows, { onConflict: "id" });
          }

          const variantRows: any[] = [];
          const metricsRows: any[] = [];
          for (const card of items) {
            const cardId = card.id;
            if (!cardId || !Array.isArray(card.variants)) continue;
            for (const v of card.variants) {
              const variantId = v.id || `${cardId}_${v.condition}_${v.printing}_${v.language}`;
              const variantKey = `${cardId}|${v.condition || ""}|${v.printing || ""}|${v.language || ""}`;
              variantRows.push({
                id: variantId,
                card_id: cardId,
                condition: v.condition || null,
                printing: v.printing || null,
                language: v.language || null,
                tcgplayer_sku_id: v.tcgplayerSkuId || null,
                price_current: v.price ?? null,
                last_updated: v.lastUpdated ?? null,
                variant_key: variantKey,
              });

              for (const period of ["7d", "30d"]) {
                const changePct = v[`priceChange${period}`] ?? null;
                const avgP = period === "7d" ? (v.avgPrice ?? null) : (v.avgPrice30d ?? null);
                if (changePct != null || avgP != null) {
                  metricsRows.push({
                    variant_id: variantId,
                    as_of_date: today,
                    period,
                    price_change_pct: changePct,
                    avg_price: avgP,
                    min_price: v[`minPrice${period}`] ?? null,
                    max_price: v[`maxPrice${period}`] ?? null,
                    stddev: v[`stddevPopPrice${period}`] ?? null,
                    cov: v[`covPrice${period}`] ?? null,
                    iqr: v[`iqrPrice${period}`] ?? null,
                    trend_slope: v[`trendSlope${period}`] ?? null,
                    price_changes_count: v[`priceChangesCount${period}`] ?? null,
                    price_relative_to_30d_range: period === "30d" ? (v.priceRelativeTo30dRange ?? null) : null,
                  });
                }
              }
            }
          }

          if (variantRows.length > 0) {
            await supabase.from("variants_justtcg").upsert(variantRows, { onConflict: "id" });
          }
          if (metricsRows.length > 0) {
            const mKey = (r: any) => `${r.variant_id}|${r.period}|${r.as_of_date}`;
            const deduped = new Map<string, any>();
            for (const r of metricsRows) deduped.set(mKey(r), r);
            await supabase.from("metrics_snapshots_justtcg")
              .upsert([...deduped.values()], { onConflict: "variant_id,period,as_of_date", ignoreDuplicates: true });
          }
        } catch (normErr) {
          console.error("Normalised tables upsert error (non-fatal):", normErr);
        }
      }

      const newOffset = offset + items.length;

      await supabase.from("market_sync_status").upsert({
        id: syncId,
        last_offset: newOffset,
        total_synced: totalSynced,
        status: "syncing",
      });

      console.log(`[${productType}] offset=${newOffset}, synced=${totalSynced}`);

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
      console.log(`[${productType}] COMPLETE! Total synced: ${totalSynced}`);

      // Aggregate set values for today
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: setAgg } = await supabase.rpc('get_set_stats');
        if (setAgg && setAgg.length > 0) {
          const rows = setAgg.map((s: any) => ({
            snapshot_date: today,
            set_name: s.set_name,
            total_value: s.total_value,
            cards_count: s.cards_count,
            avg_card_price: s.total_value / Math.max(s.cards_count, 1),
          }));
          const { error: aggErr } = await supabase
            .from('set_value_daily')
            .upsert(rows, { onConflict: 'snapshot_date,set_name' });
          if (aggErr) console.error('set_value_daily upsert error:', aggErr);
          else console.log(`Aggregated ${rows.length} sets for ${today}`);
        }
      } catch (aggE) {
        console.error('Set aggregation failed:', aggE);
      }
    } else {
      console.log(`[${productType}] Chunk done. Offset at ${startOffset + PAGES_PER_CHUNK * BATCH_SIZE}. Next cron will continue.`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        productType,
        totalSynced,
        reachedEnd,
        nextOffset: reachedEnd ? 0 : startOffset + PAGES_PER_CHUNK * BATCH_SIZE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-market-data error:", e);
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
