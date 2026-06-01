# PokeIQ Taste Profile v2

Replaces the flat tag system with a structured **trait model** that captures
*why* collectors like cards — emotional and aesthetic experience, not card mechanics.

Powers: Pull or Pass recommendations · Taste Profile · card matching · future
personalized recommendations · collection insights.

## Core philosophy
Every card is multi-dimensional. A single card can simultaneously be Cozy,
Beautiful, Nostalgic, Adventurous, and Epic. We score across multiple
dimensions instead of forcing one category.

## 5 Trait Dimensions

Each dimension is a `category` value on `public.tags`. The AI suggester
(`supabase/functions/suggest-card-tags`) picks 1-3 tags from each dimension
per card (7-12 total).

1. **Emotional Response** (`emotional`, `mood`) — how the card makes the collector feel.
   Cozy, Peaceful, Joyful, Exciting, Hopeful, Emotional, Mysterious, Intense, Powerful, Nostalgic, …
2. **Aesthetic Style** (`aesthetic`, `character`) — what the artwork looks like.
   Cute, Beautiful, Dreamlike, Cinematic, Elegant, Colorful, Minimalist, Dark, Epic, Whimsical, …
3. **Storytelling** (`storytelling`) — the story the card is telling.
   Adventure, Discovery, Friendship, Growth, Journey, Battle, Exploration, Slice of Life, Hero Moment, Family.
4. **Collector Signal** (`collector_signal`, `meta`, `era`) — collector appeal.
   Vintage Feeling, Modern Feeling, Iconic, Rare Feeling, Grail-Worthy, Popular Pokémon, Underrated Pokémon, Niche, Accessible, Prestige.
5. **Thematic Elements** (`thematic`) — themes in the artwork.
   Nature, Fantasy, City, Ocean, Space, Seasonal, Legendary, Mythical, Trainer, Environment.

## Taste Archetypes (swipe-derived)

Users see an archetype, not raw scores. Six archetypes seeded in
`public.archetypes` with `seed_traits.kind = 'taste'`:

| Slug | Name | High-weight tags |
| --- | --- | --- |
| `cozy-collector`  | Cozy Collector  | cozy, peaceful, friendship, slice-of-life, nostalgic, wholesome, comforting, serene |
| `art-curator`     | Art Curator     | beautiful, elegant, dreamlike, cinematic, colorful, painterly, art-forward, refined |
| `adventure-hunter`| Adventure Hunter| adventure, journey, discovery, exploration, epic, hero-moment |
| `nostalgia-keeper`| Nostalgia Keeper| nostalgic, vintage-feeling, iconic, friendship, hopeful, classic, retro |
| `power-seeker`    | Power Seeker    | powerful, intense, epic, battle, prestige, fierce, dramatic |
| `specialist`      | Specialist      | underrated, underrated-pokemon, niche, accessible, whimsical, oddball, weird |

Weights live in `public.tag_archetype_weights (tag_id, archetype_id, weight)`.
Compute the leading archetype via `computeTasteArchetype(userId)` in
`src/lib/pokeiq/tasteArchetype.ts`.

## Two separate profile systems

| | Collector Personality | Taste Profile |
| --- | --- | --- |
| **Question** | How do you collect? | What cards do you love? |
| **Source** | Personality test | Pull or Pass swiping |
| **Examples** | Investor, Gambler, Curator, Showman | Cozy Collector, Art Curator, Adventure Hunter, Nostalgia Keeper, Power Seeker, Specialist |
| **Storage** | `pokeiq_profiles.archetype_id` (personality archetypes) | derived from `card_tag_votes` × `tag_archetype_weights` |

The magic happens when both combine — e.g. *"You collect like an Investor,
but your taste profile is heavily Nostalgia Keeper."*

## Backward compatibility

- All existing 45 canonical tags and their votes are preserved.
- Some tags were recategorized into v2 dimensions (Cozy/Powerful/Nostalgic →
  Emotional; Cute/Epic → Aesthetic; Iconic/Underrated/Chase → Collector Signal).
- Six near-duplicates were merged via `tag_synonyms` (kept as aliases so old
  votes still resolve): Dreamy→Dreamlike, Minimal→Minimalist, Grail→Grail-Worthy,
  Vintage Feel→Vintage Feeling, Modern Feel→Modern Feeling, Slept On→Underrated.
- The legacy `pokeyelp-suggest-tags` function (separate vocabulary) is not
  used by the canonical tag pipeline and should be retired or repointed at
  `suggest-card-tags` next pass.

## Status

- Tags + archetypes + weights: **live**.
- AI suggester emitting across all 5 dimensions: **live**.
- Taste archetype computation helper: **live, not yet surfaced in UI**.
- Surface in Smart Profile / Matches: **TODO**.