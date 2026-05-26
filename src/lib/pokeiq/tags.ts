// Tag taxonomy helpers — resolve free-form tag text to a canonical tag_id,
// vote, and request AI tag suggestions for a card.
//
// Resolution path:
//   1) exact slug match in `tags`
//   2) synonym lookup -> canonical tag
//   3) create as new ai/user-sourced tag (non-canonical) so it still
//      participates in aggregation and can later be merged.

import { supabase } from "@/integrations/supabase/client";
import type { CommunityTag, IntelEnvelope } from "./types";
import { trackTagVote } from "./events";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export async function resolveTag(text: string): Promise<{ id: string; slug: string } | null> {
  const slug = slugify(text);
  if (!slug) return null;

  // 1) exact match on canonical or alias
  const { data: hit } = await supabase
    .from("tags")
    .select("id, slug, status")
    .eq("slug", slug)
    .maybeSingle();

  if (hit) {
    // If it's an alias, jump to canonical
    if (hit.status === "merged") {
      const { data: syn } = await supabase
        .from("tag_synonyms")
        .select("canonical_tag_id")
        .eq("alias_tag_id", hit.id)
        .maybeSingle();
      if (syn?.canonical_tag_id) {
        const { data: canon } = await supabase
          .from("tags")
          .select("id, slug")
          .eq("id", syn.canonical_tag_id)
          .maybeSingle();
        if (canon) return canon;
      }
    }
    return { id: hit.id, slug: hit.slug };
  }

  // 2) create as user-sourced non-canonical (cron will cluster/merge later)
  const { data: created, error } = await supabase
    .from("tags")
    .insert({
      slug,
      display_name: text.trim().slice(0, 64),
      category: "mood",
      is_canonical: false,
      source: "user",
    })
    .select("id, slug")
    .maybeSingle();

  if (error || !created) return null;
  return created;
}

export async function voteTag(card_id: string, text: string, source: "user" | "ai" = "user"): Promise<void> {
  const resolved = await resolveTag(text);
  trackTagVote(card_id, resolved?.id ?? null, text, source);
}

export async function suggestTags(
  card: { card_id: string; card_name?: string; set_name?: string; artist?: string; rarity?: string; image_url?: string },
): Promise<IntelEnvelope<CommunityTag[]>> {
  try {
    const { data, error } = await supabase.functions.invoke("suggest-card-tags", {
      body: card,
    });
    if (error) throw error;
    const tags: CommunityTag[] = (data?.tags ?? []).map((t: any) => ({
      slug: t.slug,
      display_name: t.display_name ?? t.slug,
      category: t.category ?? "mood",
      weight: t.confidence ?? 0.3,
      vote_count: 0,
      source: "ai_estimate" as const,
    }));
    return { data: tags, source: "ai_estimate", confidence: data?.confidence ?? 0.3 };
  } catch {
    return { data: [], source: "ai_estimate", confidence: 0 };
  }
}
