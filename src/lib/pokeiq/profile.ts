// Collector profile reader. Returns the persisted pokeiq_profile row if it
// exists; otherwise derives a lightweight heuristic profile from pokeiq_likes
// so the UI is never empty. Same shape either way.

import { supabase } from "@/integrations/supabase/client";
import type { CollectorProfile, IntelEnvelope } from "./types";

export async function getProfile(userId: string): Promise<IntelEnvelope<CollectorProfile>> {
  const { data: row } = await supabase
    .from("pokeiq_profiles")
    .select("*, archetypes(slug, name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (row) {
    const data: CollectorProfile = {
      user_id: userId,
      archetype_slug: (row as any).archetypes?.slug ?? null,
      archetype_name: (row as any).archetypes?.name ?? null,
      archetype_confidence: Number(row.archetype_confidence ?? 0),
      stage: (row.stage as CollectorProfile["stage"]) ?? "seedling",
      signal_count: row.signal_count ?? 0,
      top_artists: (row.top_artists as any) ?? [],
      top_sets: (row.top_sets as any) ?? [],
      top_eras: (row.top_eras as any) ?? [],
      top_types: (row.top_types as any) ?? [],
      top_pokemon: (row.top_pokemon as any) ?? [],
      top_rarities: (row.top_rarities as any) ?? [],
      scalars: {
        nostalgia_score: Number(row.nostalgia_score ?? 0.5),
        chaos_score: Number(row.chaos_score ?? 0.5),
        art_focus_score: Number(row.art_focus_score ?? 0.5),
        grail_appetite: Number(row.grail_appetite ?? 0.5),
        rarity_lean: Number(row.rarity_lean ?? 0.5),
        value_lean: Number(row.value_lean ?? 0.5),
        jp_lean: Number(row.jp_lean ?? 0),
        sealed_lean: Number(row.sealed_lean ?? 0),
      },
    };
    return {
      data,
      source: row.signal_count >= 20 ? "community" : "hybrid",
      confidence: Math.min(1, (row.signal_count ?? 0) / 50),
    };
  }

  // Empty profile — return a seedling envelope so the UI renders.
  return {
    data: {
      user_id: userId,
      archetype_slug: null,
      archetype_name: null,
      archetype_confidence: 0,
      stage: "seedling",
      signal_count: 0,
      top_artists: [], top_sets: [], top_eras: [], top_types: [], top_pokemon: [], top_rarities: [],
      scalars: {
        nostalgia_score: 0.5, chaos_score: 0.5, art_focus_score: 0.5,
        grail_appetite: 0.5, rarity_lean: 0.5, value_lean: 0.5,
        jp_lean: 0, sealed_lean: 0,
      },
    },
    source: "ai_estimate",
    confidence: 0,
  };
}
