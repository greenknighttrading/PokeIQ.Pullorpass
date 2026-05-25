
-- ──────────────────────────────────────────────────────────
-- PokeIQ Likes — hard-attribute taste foundation
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pokeiq_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  -- Identity
  card_name TEXT NOT NULL,
  pokemon_name TEXT,
  artist TEXT,
  -- Set / era
  set_name TEXT,
  set_id TEXT,
  era TEXT,
  release_year INT,
  -- Card metadata
  card_type TEXT,
  pokemon_type TEXT,
  rarity TEXT,
  language TEXT DEFAULT 'English',
  card_number TEXT,
  variant TEXT,
  product_category TEXT DEFAULT 'single',
  -- Value
  price NUMERIC,
  price_tier TEXT,
  -- Media
  image_url TEXT,
  -- Provenance
  source TEXT NOT NULL DEFAULT 'swipe',
  liked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pokeiq_likes_user_card_unique UNIQUE (user_id, card_id)
);

ALTER TABLE public.pokeiq_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own likes"
  ON public.pokeiq_likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own likes"
  ON public.pokeiq_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own likes"
  ON public.pokeiq_likes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own likes"
  ON public.pokeiq_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pokeiq_likes_user_liked_at_idx
  ON public.pokeiq_likes (user_id, liked_at DESC);
CREATE INDEX IF NOT EXISTS pokeiq_likes_user_artist_idx
  ON public.pokeiq_likes (user_id, artist);
CREATE INDEX IF NOT EXISTS pokeiq_likes_user_set_idx
  ON public.pokeiq_likes (user_id, set_name);
CREATE INDEX IF NOT EXISTS pokeiq_likes_user_era_idx
  ON public.pokeiq_likes (user_id, era);
CREATE INDEX IF NOT EXISTS pokeiq_likes_user_rarity_idx
  ON public.pokeiq_likes (user_id, rarity);

CREATE TRIGGER update_pokeiq_likes_updated_at
  BEFORE UPDATE ON public.pokeiq_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from existing pull swipes (one row per user/card, keep earliest)
INSERT INTO public.pokeiq_likes
  (user_id, card_id, card_name, set_name, image_url, price, rarity, liked_at, source)
SELECT DISTINCT ON (s.user_id, s.card_id)
  s.user_id, s.card_id, s.card_name, s.card_set, s.card_image,
  s.card_price, s.card_rarity, s.created_at, 'backfill'
FROM public.pullorpass_swipes s
WHERE s.decision = 'pull' AND s.card_id IS NOT NULL
ORDER BY s.user_id, s.card_id, s.created_at ASC
ON CONFLICT (user_id, card_id) DO NOTHING;
