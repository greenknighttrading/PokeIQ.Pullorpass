import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POKEMON_NAMES = ["umbreon", "charizard", "eevee", "pikachu", "rayquaza", "mewtwo"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: latestRow } = await supabase
      .from("market_snapshots")
      .select("snapshot_date")
      .eq("product_type", "card")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    const latestDate = latestRow?.snapshot_date;
    if (!latestDate) {
      return new Response(JSON.stringify({ error: "No card snapshot data" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const force = body?.force === true;

    const [ghExisting, sentExisting] = await Promise.all([
      supabase.from("greatest_hits_cache").select("id").eq("snapshot_date", latestDate).limit(1),
      supabase.from("sentiment_cache").select("id").eq("snapshot_date", latestDate).limit(1),
    ]);

    const ghCached = !force && ghExisting.data && ghExisting.data.length > 0;
    const sentCached = !force && sentExisting.data && sentExisting.data.length > 0;

    if (ghCached && sentCached) {
      return new Response(JSON.stringify({ status: "already_cached", date: latestDate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, any> = { date: latestDate };

    if (!ghCached) {
      const ghRows = await Promise.all(
        POKEMON_NAMES.map(async (name) => {
          const { data } = await supabase
            .from("market_snapshots")
            .select("price_change_7d")
            .ilike("name", `%${name}%`)
            .not("price_change_7d", "is", null)
            .eq("product_type", "card")
            .eq("snapshot_date", latestDate)
            .limit(1000);

          const changes = (data ?? [])
            .map((c: any) => Number(c.price_change_7d))
            .filter((v: number) => !isNaN(v));
          const avg = changes.length > 0
            ? changes.reduce((a: number, b: number) => a + b, 0) / changes.length
            : 0;

          return {
            snapshot_date: latestDate,
            pokemon_name: name,
            avg_change_7d: Math.round(avg * 100) / 100,
            card_count: changes.length,
          };
        })
      );

      await supabase.from("greatest_hits_cache").delete().eq("snapshot_date", latestDate);
      const { error: ghErr } = await supabase.from("greatest_hits_cache").insert(ghRows);
      if (ghErr) console.error("GH insert error:", ghErr);
      results.greatest_hits = ghRows;
    }

    if (!sentCached) {
      const [cardCountRes, cardsUpRes, cardsDownRes] = await Promise.all([
        supabase.from("market_snapshots").select("id", { count: "exact", head: true })
          .not("price", "is", null).gt("price", 0).eq("product_type", "card").eq("snapshot_date", latestDate),
        supabase.from("market_snapshots").select("id", { count: "exact", head: true })
          .not("price", "is", null).gt("price", 0).eq("product_type", "card").gt("price_change_7d", 0).eq("snapshot_date", latestDate),
        supabase.from("market_snapshots").select("id", { count: "exact", head: true })
          .not("price", "is", null).gt("price", 0).eq("product_type", "card").lt("price_change_7d", 0).eq("snapshot_date", latestDate),
      ]);

      const total = cardCountRes.count ?? 0;
      const up = cardsUpRes.count ?? 0;
      const down = cardsDownRes.count ?? 0;
      const moving = up + down || 1;
      const upPct = Math.round((up / moving) * 100);

      const sentRow = {
        snapshot_date: latestDate,
        cards_total: total,
        cards_up: up,
        cards_down: down,
        cards_up_pct: upPct,
      };

      await supabase.from("sentiment_cache").delete().eq("snapshot_date", latestDate);
      const { error: sentErr } = await supabase.from("sentiment_cache").insert(sentRow);
      if (sentErr) console.error("Sentiment insert error:", sentErr);
      results.sentiment = sentRow;
    }

    return new Response(JSON.stringify({ status: "computed", ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-greatest-hits error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
