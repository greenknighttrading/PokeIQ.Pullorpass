// Card Intelligence — single read API for the scanner / detail surfaces.
// Reads community aggregates when available; falls back to AI estimates and
// set-level priors when signal is thin. Same shape either way.

import { supabase } from "@/integrations/supabase/client";
import type { CardIntelligence, CommunityTag, IntelEnvelope } from "./types";
import { suggestTags } from "./tags";

const MIN_REAL_SIGNAL = 10; // views threshold before we trust community stats

export async function getCardIntel(
  card: { card_id: string; card_name?: string; set_name?: string; artist?: string; rarity?: string; image_url?: string },
): Promise<IntelEnvelope<CardIntelligence>> {
  const [{ data: stats }, { data: tagRows }] = await Promise.all([
    supabase.from("card_community_stats").select("*").eq("card_id", card.card_id).maybeSingle(),
    supabase
      .from("card_tag_stats")
      .select("tag_id, decayed_weight, vote_count, ai_suggested_count, confidence, tags!inner(slug, display_name, category)")
      .eq("card_id", card.card_id)
      .order("decayed_weight", { ascending: false })
      .limit(8),
  ]);

  const hasRealStats = stats && (stats.views ?? 0) >= MIN_REAL_SIGNAL;
  const hasRealTags = (tagRows?.length ?? 0) > 0 && (tagRows ?? []).some((r: any) => (r.vote_count ?? 0) > 0);

  let tags: CommunityTag[] = (tagRows ?? []).map((r: any) => ({
    slug: r.tags.slug,
    display_name: r.tags.display_name,
    category: r.tags.category,
    weight: Number(r.decayed_weight) || 0,
    vote_count: r.vote_count ?? 0,
    source: (r.vote_count ?? 0) > 0 ? "community" : "ai_estimate",
  }));

  // If we don't have anything cached, ask AI on-demand (will also cache).
  if (tags.length === 0) {
    const ai = await suggestTags(card);
    tags = ai.data;
  }

  const data: CardIntelligence = {
    card_id: card.card_id,
    stats: {
      views: stats?.views ?? 0,
      pull_pct: stats?.pull_pct ?? null,
      popularity_score: Number(stats?.popularity_score ?? 0),
      trending_score_7d: Number(stats?.trending_score_7d ?? 0),
      swipes_pull: stats?.swipes_pull ?? 0,
      swipes_pass: stats?.swipes_pass ?? 0,
      swipes_love: stats?.swipes_love ?? 0,
    },
    tags,
    similar_card_ids: [], // Phase 3 (embeddings) — empty for now
    reactions_summary: hasRealStats
      ? `${Math.round((stats!.pull_pct ?? 0) * 100)}% would pull · ${stats!.views} views`
      : "Early signal · rare taste",
  };

  const source = hasRealStats && hasRealTags ? "community" : hasRealStats || hasRealTags ? "hybrid" : "ai_estimate";
  const confidence = hasRealStats ? Math.min(1, (stats!.views ?? 0) / 100) : 0.3;
  return { data, source, confidence };
}
