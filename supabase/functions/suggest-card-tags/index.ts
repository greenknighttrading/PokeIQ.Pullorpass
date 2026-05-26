// Lovable AI fallback: generate community-style tags for a card when we
// don't yet have enough real votes. Tags are constrained to the seeded
// canonical taxonomy in public.tags so they merge cleanly with real votes.
//
// Response shape mirrors the read API: { tags: [{slug, confidence}], source: 'ai_estimate' }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const cardId = body?.card_id;
    const cardName = typeof body?.card_name === "string" ? body.card_name : "";
    const setName = typeof body?.set_name === "string" ? body.set_name : "";
    const artist = typeof body?.artist === "string" ? body.artist : "";
    const rarity = typeof body?.rarity === "string" ? body.rarity : "";
    const imageUrl = typeof body?.image_url === "string" ? body.image_url : "";

    if (typeof cardId !== "string" || !cardId) {
      return jsonResponse({ error: "card_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load canonical tag vocabulary so the AI is constrained to it.
    const { data: tagRows, error: tagsErr } = await supabase
      .from("tags")
      .select("id, slug, display_name, category")
      .eq("status", "active")
      .eq("is_canonical", true);
    if (tagsErr) throw tagsErr;
    const vocab = (tagRows ?? []).map((t) => t.slug);
    const tagBySlug = new Map((tagRows ?? []).map((t) => [t.slug, t]));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI not configured" }, 500);

    const system = `You are an aesthetics critic for Pokémon TCG cards. Pick 6-8 tags from the provided vocabulary that best describe a card's mood, aesthetic, and character energy. Only return slugs that exist in the vocabulary. Return strict JSON.`;
    const user = `Vocabulary: ${vocab.join(", ")}\n\nCard: ${cardName}\nSet: ${setName}\nArtist: ${artist}\nRarity: ${rarity}\nImage: ${imageUrl}\n\nReturn JSON: { "tags": [{"slug": "...", "confidence": 0..1}] }`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "tag_card",
            description: "Return chosen tag slugs from the vocabulary.",
            parameters: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      slug: { type: "string" },
                      confidence: { type: "number" },
                    },
                    required: ["slug", "confidence"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["tags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "tag_card" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return jsonResponse({ error: "Rate limited" }, 429);
      if (aiResp.status === 402) return jsonResponse({ error: "Payment required" }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return jsonResponse({ error: "AI error" }, 500);
    }

    const aiJson = await aiResp.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { tags: [] };
    const proposed: Array<{ slug: string; confidence: number }> = Array.isArray(args.tags) ? args.tags : [];

    const filtered = proposed
      .filter((t) => typeof t.slug === "string" && tagBySlug.has(t.slug))
      .slice(0, 8)
      .map((t) => ({
        slug: t.slug,
        display_name: tagBySlug.get(t.slug)!.display_name,
        category: tagBySlug.get(t.slug)!.category,
        confidence: Math.max(0, Math.min(1, Number(t.confidence) || 0.3)),
      }));

    // Best-effort: cache these into card_tag_stats with ai_suggested_count so the
    // read path can serve them as 'ai_estimate' until real votes replace them.
    if (filtered.length > 0) {
      const upserts = filtered.map((t) => ({
        card_id: cardId,
        tag_id: tagBySlug.get(t.slug)!.id,
        vote_count: 0,
        unique_users: 0,
        ai_suggested_count: 1,
        confidence: t.confidence,
        decayed_weight: t.confidence * 0.3, // AI tags carry low base weight
        source_mix: { ai: 1 },
        last_computed_at: new Date().toISOString(),
      }));
      await supabase
        .from("card_tag_stats")
        .upsert(upserts, { onConflict: "card_id,tag_id", ignoreDuplicates: false })
        .then(({ error }) => {
          if (error) console.error("cache card_tag_stats", error);
        });
    }

    return jsonResponse({ tags: filtered, source: "ai_estimate", confidence: 0.3 });
  } catch (e) {
    console.error("suggest-card-tags fatal", e);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
