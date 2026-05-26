// Recommendation reader. Prefers precomputed recommendations_feed (cron-built);
// falls back to the existing attribute-overlap engine so today's small userbase
// still gets results. Same shape either way.

import { supabase } from "@/integrations/supabase/client";
import type { IntelEnvelope, RecommendationItem, RecSurface } from "./types";

export async function getRecommendations(
  userId: string,
  surface: RecSurface,
  limit = 12,
): Promise<IntelEnvelope<RecommendationItem[]>> {
  const { data } = await supabase
    .from("recommendations_feed")
    .select("card_id, score, reason_codes")
    .eq("user_id", userId)
    .eq("surface", surface)
    .order("score", { ascending: false })
    .limit(limit);

  if (data && data.length > 0) {
    return {
      data: data.map((r) => ({
        card_id: r.card_id,
        score: Number(r.score),
        reason_codes: r.reason_codes ?? [],
      })),
      source: "community",
      confidence: 0.8,
    };
  }

  // Caller should fall back to existing recommendCards() in src/lib/recommendCards.ts
  return { data: [], source: "ai_estimate", confidence: 0 };
}
