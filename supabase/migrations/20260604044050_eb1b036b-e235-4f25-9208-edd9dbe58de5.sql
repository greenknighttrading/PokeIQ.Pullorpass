
CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'bryantjen06@gmail.com';
$$;

CREATE OR REPLACE FUNCTION public.get_admin_likes(p_user_id uuid)
RETURNS SETOF public.pokeiq_likes
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.* FROM public.pokeiq_likes l
  WHERE public.is_admin_email() AND l.user_id = p_user_id
  ORDER BY l.liked_at DESC
  LIMIT 1000;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_swipe_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_admin_email()
    THEN COALESCE((SELECT COUNT(*)::int FROM public.pullorpass_swipes WHERE user_id = p_user_id), 0)
    ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_recent_passes(p_user_id uuid)
RETURNS TABLE(card_id text, card_name text, card_set text, card_image text, card_price numeric, card_rarity text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.card_id, s.card_name, s.card_set, s.card_image, s.card_price, s.card_rarity, s.created_at
  FROM public.pullorpass_swipes s
  WHERE public.is_admin_email() AND s.user_id = p_user_id AND s.decision = 'pass'
  ORDER BY s.created_at DESC
  LIMIT 40;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_likes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_swipe_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_recent_passes(uuid) TO authenticated;
