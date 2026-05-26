import { supabase } from "@/integrations/supabase/client";
import type { CollectorNeighbor, IntelEnvelope } from "./types";

export async function getNeighbors(userId: string, limit = 10): Promise<IntelEnvelope<CollectorNeighbor[]>> {
  const { data } = await supabase
    .from("collector_similarity")
    .select("neighbor_id, similarity, method")
    .eq("user_id", userId)
    .order("similarity", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).map((r) => ({
    neighbor_id: r.neighbor_id,
    similarity: Number(r.similarity),
    method: r.method as CollectorNeighbor["method"],
  }));
  return {
    data: rows,
    source: rows.length > 0 ? "community" : "ai_estimate",
    confidence: rows.length > 0 ? 0.7 : 0,
  };
}
