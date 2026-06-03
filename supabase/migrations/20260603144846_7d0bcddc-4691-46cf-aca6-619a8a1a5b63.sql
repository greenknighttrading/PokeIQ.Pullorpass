
CREATE OR REPLACE FUNCTION public.get_public_likes(p_user_id uuid)
RETURNS SETOF public.pokeiq_likes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.*
  FROM public.pokeiq_likes l
  WHERE l.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = p_user_id
        AND up.public_profile_enabled = true
    )
  ORDER BY l.liked_at DESC
  LIMIT 1000;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_likes(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_swipe_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = p_user_id AND up.public_profile_enabled = true
    ) THEN 0
    ELSE COALESCE((SELECT COUNT(*)::int FROM public.pullorpass_swipes WHERE user_id = p_user_id), 0)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_swipe_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_recent_passes(p_user_id uuid)
RETURNS TABLE (
  card_id text, card_name text, card_set text, card_image text,
  card_price numeric, card_rarity text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.card_id, s.card_name, s.card_set, s.card_image, s.card_price, s.card_rarity, s.created_at
  FROM public.pullorpass_swipes s
  WHERE s.user_id = p_user_id
    AND s.decision = 'pass'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = p_user_id AND up.public_profile_enabled = true
    )
  ORDER BY s.created_at DESC
  LIMIT 40;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_recent_passes(uuid) TO anon, authenticated;
