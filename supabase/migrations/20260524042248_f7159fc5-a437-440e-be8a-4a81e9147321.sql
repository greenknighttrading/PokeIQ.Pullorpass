-- ============================================================
-- Per-card community tag aggregates
-- Scales to thousands of users: writes are O(tags) upserts on
-- a tiny (card_id, tag) PK; reads are a single indexed lookup.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.card_tag_aggregates (
  card_id      text NOT NULL,
  tag          text NOT NULL,
  vote_count   integer NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  last_voted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_card_tag_agg_card    ON public.card_tag_aggregates(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tag_agg_tag     ON public.card_tag_aggregates(tag);
CREATE INDEX IF NOT EXISTS idx_card_tag_agg_count   ON public.card_tag_aggregates(card_id, vote_count DESC);

ALTER TABLE public.card_tag_aggregates ENABLE ROW LEVEL SECURITY;

-- Anyone can read aggregate tag counts (no PII, just card_id + tag + count)
CREATE POLICY "Anyone can read card tag aggregates"
  ON public.card_tag_aggregates FOR SELECT
  USING (true);

-- Only triggers (security definer) write; no direct client writes.

-- ============================================================
-- Per-user vote ledger (dedupes so one user can't inflate counts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.card_tag_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     text NOT NULL,
  user_id     uuid NOT NULL,
  tag         text NOT NULL,
  source      text NOT NULL DEFAULT 'swipe', -- 'swipe' | 'review'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_card_tag_votes_card ON public.card_tag_votes(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tag_votes_user ON public.card_tag_votes(user_id);

ALTER TABLE public.card_tag_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tag votes"
  ON public.card_tag_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tag votes"
  ON public.card_tag_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Aggregate updater: bump counts when a new vote is inserted
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_card_tag_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.card_tag_aggregates (card_id, tag, vote_count, unique_users, last_voted_at)
  VALUES (NEW.card_id, NEW.tag, 1, 1, now())
  ON CONFLICT (card_id, tag) DO UPDATE
    SET vote_count    = card_tag_aggregates.vote_count + 1,
        unique_users  = card_tag_aggregates.unique_users + 1,
        last_voted_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_card_tag_aggregate ON public.card_tag_votes;
CREATE TRIGGER trg_bump_card_tag_aggregate
AFTER INSERT ON public.card_tag_votes
FOR EACH ROW EXECUTE FUNCTION public.bump_card_tag_aggregate();

-- ============================================================
-- Auto-ingest tags from swipes & pokeyelp reviews
-- (so the client doesn't need separate writes — every existing
-- flow contributes to the community tag DB automatically)
-- ============================================================
CREATE OR REPLACE FUNCTION public.ingest_tags_from_swipe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  IF NEW.user_id IS NULL OR NEW.card_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.tags IS NULL OR array_length(NEW.tags, 1) IS NULL THEN RETURN NEW; END IF;
  FOREACH t IN ARRAY NEW.tags LOOP
    IF t IS NULL OR length(trim(t)) = 0 THEN CONTINUE; END IF;
    -- Skip non-emotional control tags
    IF t IN ('Match','Loved') THEN CONTINUE; END IF;
    INSERT INTO public.card_tag_votes (card_id, user_id, tag, source)
    VALUES (NEW.card_id, NEW.user_id, t, 'swipe')
    ON CONFLICT (card_id, user_id, tag) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingest_tags_from_swipe ON public.pullorpass_swipes;
CREATE TRIGGER trg_ingest_tags_from_swipe
AFTER INSERT ON public.pullorpass_swipes
FOR EACH ROW EXECUTE FUNCTION public.ingest_tags_from_swipe();

CREATE OR REPLACE FUNCTION public.ingest_tags_from_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t text;
  all_tags text[];
BEGIN
  IF NEW.user_id IS NULL OR NEW.card_id IS NULL THEN RETURN NEW; END IF;
  all_tags := COALESCE(NEW.tags, '{}') || COALESCE(NEW.custom_tags, '{}');
  IF array_length(all_tags, 1) IS NULL THEN RETURN NEW; END IF;
  FOREACH t IN ARRAY all_tags LOOP
    IF t IS NULL OR length(trim(t)) = 0 THEN CONTINUE; END IF;
    INSERT INTO public.card_tag_votes (card_id, user_id, tag, source)
    VALUES (NEW.card_id, NEW.user_id, t, 'review')
    ON CONFLICT (card_id, user_id, tag) DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingest_tags_from_review ON public.pokeyelp_reviews;
CREATE TRIGGER trg_ingest_tags_from_review
AFTER INSERT ON public.pokeyelp_reviews
FOR EACH ROW EXECUTE FUNCTION public.ingest_tags_from_review();

-- ============================================================
-- Backfill from existing history
-- ============================================================
INSERT INTO public.card_tag_votes (card_id, user_id, tag, source, created_at)
SELECT s.card_id, s.user_id, t, 'swipe', s.created_at
FROM public.pullorpass_swipes s, unnest(s.tags) AS t
WHERE s.user_id IS NOT NULL
  AND s.card_id IS NOT NULL
  AND t IS NOT NULL AND length(trim(t)) > 0
  AND t NOT IN ('Match','Loved')
ON CONFLICT (card_id, user_id, tag) DO NOTHING;

INSERT INTO public.card_tag_votes (card_id, user_id, tag, source, created_at)
SELECT r.card_id, r.user_id, t, 'review', r.created_at
FROM public.pokeyelp_reviews r,
     unnest(COALESCE(r.tags,'{}') || COALESCE(r.custom_tags,'{}')) AS t
WHERE r.user_id IS NOT NULL
  AND r.card_id IS NOT NULL
  AND t IS NOT NULL AND length(trim(t)) > 0
ON CONFLICT (card_id, user_id, tag) DO NOTHING;

-- Recompute aggregates from the vote ledger as the source of truth
TRUNCATE public.card_tag_aggregates;
INSERT INTO public.card_tag_aggregates (card_id, tag, vote_count, unique_users, last_voted_at)
SELECT card_id, tag, COUNT(*)::int, COUNT(DISTINCT user_id)::int, MAX(created_at)
FROM public.card_tag_votes
GROUP BY card_id, tag;