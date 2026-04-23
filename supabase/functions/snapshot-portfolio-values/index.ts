import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authHeader.includes(serviceKey) && !authHeader.includes(anonKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    const { data: portfolios, error: fetchErr } = await supabase
      .from("portfolios")
      .select("session_id, items, summary");

    if (fetchErr) throw fetchErr;
    if (!portfolios || portfolios.length === 0) {
      return new Response(
        JSON.stringify({ message: "No portfolios found", snapshots: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicate portfolios per user (keep latest)
    const userPortfolios = new Map<string, any>();
    for (const p of portfolios) {
      userPortfolios.set(p.session_id, p);
    }

    const rows: any[] = [];

    for (const [userId, portfolio] of userPortfolios) {
      const items = portfolio.items as any[];
      const summary = portfolio.summary as any;
      if (!items || !Array.isArray(items) || items.length === 0) continue;

      // Build a map of item id → tcgplayer_id from _matchDetails in summary
      const matchDetails = (summary?._matchDetails || []) as any[];
      const itemTcgMap = new Map<string, string>();
      const allTcgIds: string[] = [];

      for (const detail of matchDetails) {
        if (detail.tcgplayerId && detail.confidence !== 'none') {
          itemTcgMap.set(detail.id, detail.tcgplayerId);
          allTcgIds.push(detail.tcgplayerId);
        }
      }

      // Fetch current prices from market_snapshots for all matched tcgplayer_ids
      const priceMap = new Map<string, number>();
      const uniqueTcgIds = [...new Set(allTcgIds)];

      if (uniqueTcgIds.length > 0) {
        // Get the latest snapshot date
        const { data: latestRow } = await supabase
          .from("market_snapshots")
          .select("snapshot_date")
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .single();
        const latestDate = latestRow?.snapshot_date || today;

        for (let i = 0; i < uniqueTcgIds.length; i += 50) {
          const chunk = uniqueTcgIds.slice(i, i + 50);
          const { data: priceData } = await supabase
            .from("market_snapshots")
            .select("tcgplayer_id, price")
            .in("tcgplayer_id", chunk)
            .eq("snapshot_date", latestDate)
            .not("price", "is", null);

          if (priceData) {
            for (const p of priceData) {
              if (p.tcgplayer_id && p.price) {
                priceMap.set(p.tcgplayer_id, Number(p.price));
              }
            }
          }
        }
      }

      // Also check variants_justtcg for items matched via user_asset_mappings
      const { data: mappings } = await supabase
        .from("user_asset_mappings")
        .select("upload_fingerprint, resolved_variant_id, resolved_tcgplayer_id")
        .eq("user_id", userId)
        .not("resolved_variant_id", "is", null);

      const variantIds: string[] = [];
      if (mappings) {
        for (const m of mappings) {
          if (m.resolved_variant_id) variantIds.push(m.resolved_variant_id);
          // Also add tcgplayer IDs from mappings that aren't in matchDetails
          if (m.resolved_tcgplayer_id && !priceMap.has(m.resolved_tcgplayer_id)) {
            allTcgIds.push(m.resolved_tcgplayer_id);
          }
        }
      }

      const variantPriceMap = new Map<string, number>();
      if (variantIds.length > 0) {
        for (let i = 0; i < variantIds.length; i += 50) {
          const chunk = variantIds.slice(i, i + 50);
          const { data: variantData } = await supabase
            .from("variants_justtcg")
            .select("id, price_current")
            .in("id", chunk)
            .not("price_current", "is", null);

          if (variantData) {
            for (const v of variantData) {
              if (v.id && v.price_current) {
                variantPriceMap.set(v.id, Number(v.price_current));
              }
            }
          }
        }
      }

      // Recalculate total market value using live prices where available
      let totalMarketValue = 0;
      let totalCostBasis = 0;

      for (const item of items) {
        const qty = item.quantity || 1;
        totalCostBasis += (item.totalCostBasis || 0);

        // Try live price from tcgplayer_id (via matchDetails)
        const tcgId = itemTcgMap.get(item.id);
        let livePrice: number | null = null;

        if (tcgId) {
          livePrice = priceMap.get(tcgId) ?? null;
        }

        if (livePrice != null) {
          totalMarketValue += livePrice * qty;
        } else {
          // Fallback to stored market value
          totalMarketValue += (item.marketPrice || 0) * qty;
        }
      }

      rows.push({
        user_id: userId,
        snapshot_date: today,
        total_market_value: Math.round(totalMarketValue),
        total_cost_basis: Math.round(totalCostBasis),
        item_count: items.length,
      });
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ message: "No valid portfolios", snapshots: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: upsertErr } = await supabase
      .from("portfolio_value_snapshots")
      .upsert(rows, { onConflict: "user_id,snapshot_date" });

    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({ message: "Snapshots recorded with live prices", snapshots: rows.length, date: today }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Snapshot error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
