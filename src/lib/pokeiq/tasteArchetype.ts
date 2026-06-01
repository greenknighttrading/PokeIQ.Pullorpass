// Taste Profile v2 — compute a user's leading taste archetype from their
// tag votes weighted by tag_archetype_weights. This is the swipe-derived
// "what cards do you love?" axis, separate from the personality test
// ("how do you collect?") archetype on pokeiq_profiles.archetype_id.
//
// Not wired into UI yet — data collection first, surfacing comes later.

import { supabase } from "@/integrations/supabase/client";

export interface TasteArchetypeScore {
  archetype_id: string;
  slug: string;
  name: string;
  description: string | null;
  score: number;       // raw weighted sum of tag votes
  share: number;       // 0..1 share of total score (for confidence)
}

export interface TasteArchetypeResult {
  leading: TasteArchetypeScore | null;
  scores: TasteArchetypeScore[];
  signal_count: number;   // total tag votes considered
  confidence: number;     // 0..1 — combines signal_count + leader margin
}

const KIND_TASTE = "taste";
const MIN_SIGNAL = 25;

export async function computeTasteArchetype(userId: string): Promise<TasteArchetypeResult> {
  // 1) Pull this user's tag votes resolved to tag_id via slug.
  const [{ data: voteRows }, { data: tagRows }, { data: weightRows }, { data: archetypeRows }] = await Promise.all([
    supabase.from("card_tag_votes").select("tag").eq("user_id", userId),
    supabase.from("tags").select("id, slug, status"),
    supabase.from("tag_archetype_weights").select("tag_id, archetype_id, weight"),
    supabase.from("archetypes").select("id, slug, name, description, seed_traits"),
  ]);

  const tasteArchetypes = (archetypeRows ?? []).filter((a: any) => (a.seed_traits?.kind ?? null) === KIND_TASTE);
  if (tasteArchetypes.length === 0) {
    return { leading: null, scores: [], signal_count: 0, confidence: 0 };
  }

  const slugToTagId = new Map<string, string>();
  for (const t of tagRows ?? []) {
    if (t.status !== "active") continue;
    slugToTagId.set((t.slug as string).toLowerCase(), t.id as string);
  }

  // Tag votes are stored as free text — resolve to tag_id when possible.
  const tagIdCounts = new Map<string, number>();
  let signal = 0;
  for (const v of voteRows ?? []) {
    const slug = String(v.tag ?? "").toLowerCase().trim();
    const id = slugToTagId.get(slug);
    if (!id) continue;
    tagIdCounts.set(id, (tagIdCounts.get(id) ?? 0) + 1);
    signal += 1;
  }

  // 2) Sum weighted contributions per archetype.
  const scoreByArchetype = new Map<string, number>();
  for (const w of weightRows ?? []) {
    const c = tagIdCounts.get(w.tag_id);
    if (!c) continue;
    const prev = scoreByArchetype.get(w.archetype_id) ?? 0;
    scoreByArchetype.set(w.archetype_id, prev + c * Number(w.weight ?? 1));
  }

  const total = Array.from(scoreByArchetype.values()).reduce((a, b) => a + b, 0);
  const scores: TasteArchetypeScore[] = tasteArchetypes
    .map((a: any) => {
      const score = scoreByArchetype.get(a.id) ?? 0;
      return {
        archetype_id: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description ?? null,
        score,
        share: total > 0 ? score / total : 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  const leading = scores[0] && scores[0].score > 0 ? scores[0] : null;
  // Confidence: scale by signal volume and leader margin over runner-up.
  const margin = scores[1] ? Math.max(0, scores[0].score - scores[1].score) / Math.max(1, scores[0].score) : 1;
  const volume = Math.min(1, signal / MIN_SIGNAL);
  const confidence = leading ? Math.round(volume * (0.5 + 0.5 * margin) * 100) / 100 : 0;

  return { leading, scores, signal_count: signal, confidence };
}