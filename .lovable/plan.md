## PokeIQ MVP Refactor — Hard-Attribute Taste Engine

Shift PokeIQ from subjective "vibe" inference to a grounded, metadata-driven preference system built on what users actually like.

---

### 1. Data Layer — Persistent Likes with Full Metadata

**New table: `pokeiq_likes`** (migration)
- `id`, `user_id`, `card_id` (unique per user)
- `card_name`, `pokemon_name`, `artist`, `set_name`, `set_id`, `era`
- `card_type` (Pokémon/Trainer/Energy), `pokemon_type` (Water/Fire/...), `rarity`, `language`
- `release_year`, `price`, `price_tier` (budget/mid/premium/grail)
- `product_category` (single/sealed/graded), `card_number`, `variant`/`printing`
- `image_url`, `liked_at`
- RLS: users read/write only their own rows
- Indexes on `(user_id, liked_at)`, `(user_id, artist)`, `(user_id, set_name)`, `(user_id, era)`

When a user swipes "pull" in PokeYelp or marks a like elsewhere, we upsert into `pokeiq_likes` with as much metadata as we can hydrate from `cards_ppt` (artist, set, rarity, type, pokemon_type, hp, image) joined with `market_snapshots` (price, set era classification).

### 2. Likes-First UX

**`/matches` → repurposed as `/likes`** (route alias kept for back-compat)
- Primary tab: **Likes** (binder grid 3×3, paginated) — this is now the hero surface
- Secondary tab: **Recommended** (formerly Matches) — de-emphasized
- Filters driven by hard attributes: Artist, Set, Era, Type, Rarity, Price Tier, Product Category
- Remove the "Vibes you like today" chip filter; replace with hard-attribute facets
- Keep the "PokeIQ Recommends" banner row at top, now powered by the new recommender (see §4)

### 3. Taste Profile Engine — `src/lib/tasteProfile.ts` rewrite

Replace subjective descriptor scoring with aggregation over `pokeiq_likes`:

```text
input: liked cards array
output: TasteProfile {
  topArtists: [{name, count, pct}]
  topSets: [...]
  topEras: [...]
  topPokemonTypes: [...]
  topRarities: [...]
  topPokemon: [...]
  priceDistribution: { budget, mid, premium, grail }
  languageLean: { en, jp }
  productMix: { singles, sealed, graded }
  insights: string[]   // "You frequently like cards illustrated by Komiya."
  stage: 'seedling' | 'sprouting' | 'established'  // by likes count
}
```

Insight generator emits sentences only when a pattern crosses a confidence threshold (e.g. ≥30% concentration or ≥3 occurrences). No archetype names, no vibe descriptors.

**Progressive disclosure by liked-count:**
- `< 20`: "PokeIQ is learning — like more cards to unlock your taste profile." Show running counts.
- `20–49`: Basic profile (top artist/set/era/type).
- `50–99`: Full hard-attribute profile + similarity-based recommendations.
- `100+`: Tease future "Vibe profile unlocked soon" (gated, not built).

### 4. Recommendation Engine — `src/lib/recommendCards.ts` (new)

Score candidate cards from `cards_ppt` joined with `market_snapshots` using weighted attribute overlap with the user's likes:

```text
score = 3*artistMatch + 2*pokemonMatch + 2*typeMatch
      + 2*rarityMatch + 1.5*eraMatch + 1*setMatch
      + 1*priceTierMatch + 0.5*languageMatch
      - alreadyLikedPenalty
```

Returns top-N diversified (cap per artist/set) for:
- The "Recommended for you" banner on `/likes`
- The "Recommended" tab
- (Optional later) seeding the PokeYelp swipe pool

### 5. PokeYelp Integration

- Already swipes for review; on each "pull" decision, also upsert into `pokeiq_likes` with hydrated metadata (single query against `cards_ppt` + `market_snapshots` by `card_id`).
- Keep tags collection working (they go to `card_tag_votes`) but stop surfacing them as the primary taste signal in the UI. Tags become a future signal for the post-MVP vibe layer.

### 6. UI Cleanup

- `Matches.tsx`: rebuild around Likes-first model, hard-attribute filter chips, new TasteProfile renderer.
- `tasteProfile.ts`: rewrite (descriptors → attribute aggregates).
- Remove "Vibes you like today" copy; replace with "Your collecting patterns".
- Keep `MatchPulse` microinteraction but trigger it on strong recommendation hits, not random.

---

### Technical Notes

- Migration: `pokeiq_likes` table + RLS + indexes. Backfill from existing `pullorpass_swipes WHERE decision='pull'` for current users so the profile isn't empty on first load.
- Era classification reuses `src/lib/eraClassification.ts`.
- Price tier reuses tier logic from `pullorpass.ts` (`<15 / <50 / <200 / chase`).
- All metadata hydration happens client-side via existing Supabase reads from `cards_ppt`, `market_snapshots`, `sets_ppt` — no new edge functions.
- Roadmap items (AI vibe analysis, emotional tagging) are explicitly **not** built; only a gated teaser at 100+ likes.

### Files Changed
- `supabase/migrations/<ts>_pokeiq_likes.sql` (new)
- `src/lib/tasteProfile.ts` (rewrite)
- `src/lib/recommendCards.ts` (new)
- `src/lib/likesService.ts` (new — upsert/fetch helpers)
- `src/pages/Matches.tsx` (refactor to Likes-first)
- `src/pages/PokeYelp.tsx` (write-through to `pokeiq_likes` on pull)
