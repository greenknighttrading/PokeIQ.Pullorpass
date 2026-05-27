
-- 1) buylist_picks: gate behind buylist access
DROP POLICY IF EXISTS "Anyone can read active picks" ON public.buylist_picks;
CREATE POLICY "Users with buylist access can read picks"
  ON public.buylist_picks
  FOR SELECT
  TO authenticated
  USING (active = true AND public.has_buylist_access(auth.uid()));

REVOKE SELECT ON public.buylist_picks FROM anon;
GRANT SELECT ON public.buylist_picks TO authenticated;

-- 2) pokeiq_credits: remove client INSERT/UPDATE, add SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users insert own credits" ON public.pokeiq_credits;
DROP POLICY IF EXISTS "Users update own credits" ON public.pokeiq_credits;

CREATE OR REPLACE FUNCTION public.change_pokeiq_credits(p_delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  current_credits integer;
  new_credits integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Enforce sane bounds per call to prevent arbitrary credit grants
  IF p_delta IS NULL OR p_delta > 10 OR p_delta < -100 THEN
    RAISE EXCEPTION 'Invalid credit delta';
  END IF;

  INSERT INTO public.pokeiq_credits (user_id, credits, updated_at)
  VALUES (uid, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT credits INTO current_credits
  FROM public.pokeiq_credits
  WHERE user_id = uid
  FOR UPDATE;

  new_credits := COALESCE(current_credits, 0) + p_delta;
  IF new_credits < 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE public.pokeiq_credits
  SET credits = new_credits, updated_at = now()
  WHERE user_id = uid;

  RETURN new_credits;
END;
$$;

REVOKE ALL ON FUNCTION public.change_pokeiq_credits(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.change_pokeiq_credits(integer) TO authenticated;

-- 3) market_sync_status: explicitly deny anon/authenticated reads (service_role bypasses RLS)
REVOKE SELECT ON public.market_sync_status FROM anon, authenticated;
