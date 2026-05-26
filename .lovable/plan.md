## PokeIQ — Scalable Taste Graph & Community Recommendation Architecture

Re-architect PokeIQ from a likes table into a **collector identity graph + Pokémon taste intelligence engine** that works for 10 users today and 1M users later without restructuring. Today: AI/heuristic estimates fill the gaps. Tomorrow: real community data gradually replaces them through the same interfaces.

---

### Guiding principles

1. **Every interaction is an event.** Append-only event log is the source of truth. All aggregates, profiles, and recommendations are derived.
2. **Derived = cheap to recompute.** Profiles, card stats, and similarity are materialized tables refreshed by cron — never block the UI.
3. **One interface, two data sources.** Every read (`getCardCommunity`, `getCollectorProfile`, `getRecommendations`) returns the same shape whether backed by real data or AI/heuristic fallback, with a `confidence` and `source` field.
4. **Vector-ready from day one.** pgvector columns on cards and users so we can flip from heuristic scoring to embedding similarity without migrations.
5. **Tag taxonomy is a graph, not a string column.** Tags have IDs, synonyms, clusters, and decay — so "beautiful" and "gorgeous" merge cleanly later.

---

### 1. Data model

#### 1a. Event layer (append-only, never updated)

```text
pokeiq_events                  -- the firehose; partitioned by month later
  id, user_id, session_id, event_type, card_id?, tag_id?,
  payload jsonb, source_page, client_ts, server_ts, ingest_batch_id
```

`event_type` enum: `card_view`, `card_hover`, `card_swipe`, `tag_vote`, `tag_reject`, `tag_custom`, `scan`, `recommendation_shown`, `recommendation_click`, `profile_view`, `binder_view`, `session_start`, `session_end`.

`payload` carries event-specific fields: swipe `action` (pull/pass/love/super_like), `velocity_px_ms`, `hover_ms`, `repeat_view_count`, `tag_text`, `confidence`, `source` (ai/user), `rec_slot`, `rec_model_version`, etc.

Why: one schema absorbs every future signal. No migration when we add `super_like` or `cinematic_tag_vote`.

#### 1b. Card-level community aggregates (materialized)

```text
card_community_stats
  card_id PK, views, hovers, swipes_pull, swipes_pass, swipes_love, swipes_super,
  pull_pct, hover_ms_p50, repeat_view_rate, popularity_score,
  trending_score_7d, trending_score_30d, last_computed_at

card_tag_stats               -- replaces flat card_tag_aggregates
  card_id, tag_id, vote_count, unique_users, ai_suggested_count,
  confidence (0-1), last_voted_at, decayed_weight, source_mix jsonb
```

Refreshed nightly via cron edge function from `pokeiq_events`. Below a threshold of real data, `confidence < 0.3` and the read API falls back to AI estimates.

#### 1c. Tag taxonomy (graph)

```text
tags
  id PK, slug, display_name, category (mood/aesthetic/era/character/meta),
  cluster_id, embedding vector(1536), is_canonical, status (active/merged/banned),
  created_at, source (seed/user/ai)

tag_synonyms                  -- "gorgeous" -> "beautiful"
  alias_tag_id, canonical_tag_id, confidence, decided_by (ai/admin/vote)

tag_clusters
  id, name, centroid_embedding vector(1536), description
```

Every existing string tag gets resolved to a `tag_id` on write. Synonyms merge under a canonical tag; clustering happens offline. Decay = exponential weight on `last_voted_at` recomputed by cron.

#### 1d. Collector identity (per-user taste profile)

```text
pokeiq_profiles
  user_id PK,
  -- hard attribute aggregates (existing tasteProfile shape, persisted)
  top_artists jsonb, top_sets jsonb, top_eras jsonb, top_types jsonb,
  top_pokemon jsonb, top_rarities jsonb, price_distribution jsonb,
  -- scalar dimensions (0-1 normalized)
  nostalgia_score, chaos_score, art_focus_score, grail_appetite,
  rarity_lean, value_lean, jp_lean, sealed_lean,
  -- taste vector — empty until we have embeddings, but column exists day one
  taste_embedding vector(1536),
  -- archetype (heuristic today, ML later)
  archetype_id, archetype_confidence,
  -- meta
  signal_count int,                     -- # of meaningful events backing this
  stage text,                           -- seedling/sprouting/established/master
  last_computed_at, model_version
```

```text
archetypes
  id, name ("Vintage Chaos Collector"), description, seed_traits jsonb,
  centroid_embedding vector(1536), member_count
```

Profiles are recomputed by cron from events + likes. `signal_count < 20` → fall back to AI-inferred archetype with low confidence.

#### 1e. Social / similarity layer

```text
collector_similarity          -- top-N neighbors per user, refreshed nightly
  user_id, neighbor_id, similarity float, method (cosine/jaccard/hybrid),
  computed_at, PRIMARY KEY (user_id, neighbor_id)

collector_follows             -- future-facing, table exists now
  follower_id, followee_id, created_at
```

When `signal_count` is low, neighbors are picked by archetype overlap instead of vector cosine — same table, same read API.

#### 1f. Recommendation layer

```text
recommendations_feed          -- precomputed per user, per surface
  user_id, surface (home/scanner/binder/pulse), card_id,
  score, reason_codes text[], model_version, generated_at, expires_at

recommendation_impressions    -- joined back to events for learning loop
  user_id, card_id, surface, slot, shown_at, clicked_at?, dismissed_at?,
  led_to_action text?
```

The read path is always `select … from recommendations_feed where user_id=… and surface=…`. The generator behind it can swap from attribute-overlap (today) → collaborative filtering → embedding ANN (later) without touching the client.

#### 1g. Scanner → "Card Intelligence"

No new table; it's a read API that joins:
- `card_community_stats` → pull%, popularity, trending
- `card_tag_stats` (top 8 tags by decayed_weight) → community tags
- `collector_similarity` ∩ users-who-loved-this → "collectors most likely to love this"
- `pgvector` neighbors on a `card_embeddings` table → similar cards / emotionally adjacent

```text
card_embeddings
  card_id PK, art_embedding vector(1536), tag_embedding vector(1536),
  source (clip/ai/computed), updated_at
```

---

### 2. Service layer (single interface, dual source)

All reads go through typed helpers in `src/lib/pokeiq/`. Each helper returns `{ data, confidence, source: 'community' | 'ai_estimate' | 'hybrid' }`.

```text
src/lib/pokeiq/
  events.ts            track(event_type, payload)  — fire-and-forget queue
  cardIntelligence.ts  getCardIntel(cardId)        — community + AI blended
  profile.ts           getProfile(userId)          — heuristic or vector
  recommend.ts         getRecommendations(userId, surface, n)
  similarity.ts        getNeighbors(userId, n)
  tags.ts              resolveTag(text), voteTag, suggestTags(cardId)
  archetypes.ts        classify(profile), listArchetypes()
```

A `confidence_floor` per surface decides when AI estimates are shown vs hidden. The UI never branches on "do we have data" — it branches on `confidence`.

---

### 3. Event pipeline

- **Client → edge function `ingest-events`** (batched, sendBeacon on unload, debounced hover/view).
- Edge function validates with Zod, stamps `server_ts`, writes to `pokeiq_events`.
- Hot path stops there — no joins, no triggers blocking the user.
- **Cron edge functions** (nightly + 15-min for hot stats):
  - `compute-card-stats` → rebuilds `card_community_stats`, `card_tag_stats`
  - `compute-profiles` → rebuilds `pokeiq_profiles` for users with new events
  - `compute-similarity` → top-50 neighbors per active user
  - `compute-recommendations` → precomputes `recommendations_feed`
  - `compute-tag-graph` → clusters, synonym suggestions, decay
  - `archive-events` → roll events older than 90d into monthly partitions / cold storage

All cron jobs are idempotent and chunked so they scale linearly. Run on Supabase pg_cron initially, swap to external worker when volume demands it.

---

### 4. AI / heuristic fallback (so it feels alive at N=10)

Where real signal is thin, the same read API returns AI-generated estimates marked `source: 'ai_estimate'`:

- **Card tags:** Lovable AI (`google/gemini-2.5-flash`) generates 6–8 mood/aesthetic tags from card name + set + artist + image_url. Cached in `card_tag_stats` with `ai_suggested_count` and low `confidence` until users vote.
- **Card community stats:** when `views < 10`, blend with set-level priors (popularity, rarity tier) so pull% isn't 0/0.
- **Collector archetype:** rule-based classifier over `pokeiq_profiles` scalars maps to the nearest of ~12 seeded archetypes. Real ML clustering replaces it once `signal_count` crosses a threshold globally.
- **Similarity:** Jaccard over top_artists/top_sets/top_eras when embeddings aren't populated. Same `collector_similarity` table.
- **Trending:** falls back to global `market_snapshots.price_change_7d` movers when event volume is low.

Rule: never fabricate raw social numbers ("523 collectors loved this"). Always show qualitative or relative framings when confidence is low ("Rare taste · early signal").

---

### 5. Migration & rollout phases

**Phase 1 — Foundation (this milestone)**
1. Migration: `pokeiq_events`, `tags`, `tag_synonyms`, `tag_clusters`, `card_community_stats`, `card_tag_stats`, `pokeiq_profiles`, `archetypes`, `collector_similarity`, `collector_follows`, `recommendations_feed`, `recommendation_impressions`, `card_embeddings`. Enable `vector` extension. RLS + GRANTs for each.
2. Edge function `ingest-events` (Zod-validated, batched).
3. `src/lib/pokeiq/` service layer with AI-fallback implementations.
4. Wire existing PokeYelp swipes, PullOrPass swipes, tag votes, and Matches views into `track()`. Keep existing tables; events run alongside.
5. Seed `archetypes` (12 hand-authored) and `tags` (200 curated mood/aesthetic seeds) via insert.

**Phase 2 — Aggregation (next)**
6. Cron functions: `compute-card-stats`, `compute-profiles`, `compute-tag-graph`.
7. Scanner page reads from `getCardIntel()` — community tags + reactions + similar cards UI.
8. Matches page reads from `getProfile()` + `getRecommendations()`.

**Phase 3 — Intelligence (when data justifies)**
9. Embed cards (CLIP-style on art, text on tags) into `card_embeddings`.
10. Embed users by averaging their liked-card embeddings into `pokeiq_profiles.taste_embedding`.
11. Swap `compute-similarity` and `compute-recommendations` to use pgvector ANN.
12. Replace rule-based archetypes with k-means clusters over `taste_embedding`.

**Phase 4 — Social (UI flip)**
13. Expose follows, binder comparison, "you are 92% similar to…", taste rarity percentile. Backend already supports it from Phase 1.

---

### 6. Technical notes

- pgvector: `create extension vector` in the first migration. Use `vector(1536)` (OpenAI/Gemini embedding default). HNSW indexes on `card_embeddings.art_embedding`, `card_embeddings.tag_embedding`, `pokeiq_profiles.taste_embedding`, `tags.embedding`, `archetypes.centroid_embedding`.
- Partitioning: `pokeiq_events` declared as range-partitioned by `server_ts` month. Today one partition; cron creates next month's partition. Trivial to add later if we skip now, but adding the partition key up front avoids rewriting.
- RLS: events insert allowed for `auth.uid() = user_id`; reads restricted to owner for raw events. Aggregated tables (`card_community_stats`, `card_tag_stats`, `archetypes`, anonymized `collector_similarity` for the requesting user only) public-read. `pokeiq_profiles` owner-read + a `public_profile_view` for opt-in social fields later.
- GRANTs: every new public-schema table gets explicit GRANTs to `anon`/`authenticated`/`service_role` per access pattern, in the same migration.
- Idempotency: `ingest_batch_id` + unique partial indexes prevent dup events when the client retries.
- Privacy: raw events never leave the user's RLS scope; only aggregates are public. `compute-*` functions run as service_role.
- Cost control: hover/view events client-debounced (1 per card per 30s). Cron chunked to 1000 users per run.

---

### 7. Files to create / change

**Migrations (1 file)**
- `supabase/migrations/<ts>_pokeiq_taste_graph.sql` — all tables in §1, RLS, GRANTs, indexes, pgvector, seed archetypes + canonical tags.

**Edge functions (5 new)**
- `supabase/functions/ingest-events/index.ts`
- `supabase/functions/compute-card-stats/index.ts`
- `supabase/functions/compute-profiles/index.ts`
- `supabase/functions/compute-tag-graph/index.ts`
- `supabase/functions/suggest-card-tags/index.ts` (Lovable AI, on-demand fallback)

**Client service layer (new)**
- `src/lib/pokeiq/events.ts`, `cardIntelligence.ts`, `profile.ts`, `recommend.ts`, `similarity.ts`, `tags.ts`, `archetypes.ts`, `types.ts`

**Wiring (small edits)**
- `src/pages/PokeYelp.tsx`, `src/pages/PullOrPass.tsx`, `src/pages/Matches.tsx`, `src/components/cards/CardDetailModal.tsx` → call `track()` and read through the new service layer (no UI rewrite in this phase).

**Replaced gradually (not deleted)**
- `src/lib/tasteProfile.ts`, `src/lib/recommendCards.ts`, `src/lib/likesService.ts` keep working; new service layer wraps them so we can swap implementations without breaking pages.

---

### Out of scope for this milestone

- New UI for Card Intelligence, social comparisons, "Wrapped"-style stories — Phase 2/4.
- Real embeddings + ANN — Phase 3, once data justifies the credit spend.
- Following/feed UI — Phase 4.

If approved, I'll start with Phase 1: the migration and the service layer skeleton with AI fallbacks so today's small userbase already sees a "live-feeling" product, and every swipe from now on is captured in the firehose.
