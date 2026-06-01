---
name: Taste Profile v2
description: 5-dimension tag model + 6 swipe-derived taste archetypes, layered over existing 45 canonical tags
type: feature
---

PokeIQ tags now span 5 dimensions (categories on `public.tags`):
`emotional`, `aesthetic`, `storytelling`, `collector_signal`, `thematic`.
Legacy categories `mood`, `character`, `meta`, `era` still exist and roll
up into Emotional (mood), Aesthetic (character), and Collector Signal (meta, era).

- Canonical tag list is in `public.tags` (status='active', is_canonical=true).
  New v2 tags added: Peaceful, Joyful, Exciting, Hopeful, Emotional, Mysterious,
  Intense, Dreamlike, Minimalist, Colorful, Dark, Whimsical, Adventure, Discovery,
  Friendship, Growth, Journey, Battle, Exploration, Slice of Life, Hero Moment,
  Family, Grail-Worthy, Vintage Feeling, Modern Feeling, Rare Feeling, Popular
  Pokémon, Underrated Pokémon, Niche, Accessible, Prestige, Nature, Fantasy,
  City, Ocean, Space, Seasonal, Legendary, Mythical, Trainer (slug `trainer-theme`),
  Environment.
- Merged aliases (status='merged' in `tags`, mapped via `tag_synonyms`):
  dreamy→dreamlike, minimal→minimalist, grail→grail-worthy, vintage-feel→vintage-feeling,
  modern-feel→modern-feeling, slept-on→underrated. Old votes still resolve.
- Six taste archetypes live in `public.archetypes` with `seed_traits.kind='taste'`:
  cozy-collector, art-curator, adventure-hunter, nostalgia-keeper, power-seeker, specialist.
  These are SWIPE-derived ("what cards do you love?") and are SEPARATE from
  personality-test archetypes ("how do you collect?") stored on
  `pokeiq_profiles.archetype_id`.
- Tag→archetype weights in `public.tag_archetype_weights (tag_id, archetype_id, weight)`,
  public-readable. Seeded from each archetype's `seed_traits.high_weight` slugs at weight 1.0.
- AI suggester `supabase/functions/suggest-card-tags` picks 1-3 tags per dimension
  (7-12 total), constrained to active canonical slugs. Use this — NOT the older
  `pokeyelp-suggest-tags` function which has its own divergent vocabulary.
- Read API for swipe-derived archetype: `computeTasteArchetype(userId)` in
  `src/lib/pokeiq/tasteArchetype.ts`. Not surfaced in UI yet.

Voting / writing tags is unchanged: `voteTag(card_id, text)` in
`src/lib/pokeiq/tags.ts` resolves free text → canonical via `resolveTag` →
`trackTagVote` → `card_tag_votes` → aggregated into `card_tag_stats`.

Spec: `docs/TASTE_PROFILE_V2.md`.