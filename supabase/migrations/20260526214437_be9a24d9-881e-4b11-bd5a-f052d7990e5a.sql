
-- 1) Drop redundant service_role RLS policies (service_role bypasses RLS at connection level)
DROP POLICY IF EXISTS "Service role can insert snapshots" ON public.portfolio_value_snapshots;
DROP POLICY IF EXISTS "Service role can upsert snapshots" ON public.portfolio_value_snapshots;
DROP POLICY IF EXISTS "Service role can insert sentiment_cache" ON public.sentiment_cache;
DROP POLICY IF EXISTS "Service role can update sentiment_cache" ON public.sentiment_cache;
DROP POLICY IF EXISTS "Service role can insert greatest_hits_cache" ON public.greatest_hits_cache;
DROP POLICY IF EXISTS "Service role can update greatest_hits_cache" ON public.greatest_hits_cache;

-- 2) Restrict pokeyelp_reviews public read access (hide user_ids from anon)
DROP POLICY IF EXISTS "Anyone can read pokeyelp_reviews" ON public.pokeyelp_reviews;
CREATE POLICY "Authenticated users can read pokeyelp_reviews"
ON public.pokeyelp_reviews
FOR SELECT
TO authenticated
USING (true);

-- 3) Helper to check buylist access (admin or has access grant)
CREATE OR REPLACE FUNCTION public.has_buylist_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.buylist_access WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.buylist_settings s
    WHERE s.key = 'admin_email'
      AND s.value = (auth.jwt() ->> 'email')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_buylist_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_buylist_access(uuid) TO authenticated;

-- 4) Restrict buylist_items SELECT to users with buylist_access
DROP POLICY IF EXISTS "Anyone authenticated can read items" ON public.buylist_items;
CREATE POLICY "Users with buylist access can read items"
ON public.buylist_items
FOR SELECT
TO authenticated
USING (public.has_buylist_access(auth.uid()));

-- 5) Restrict buylist_price_snapshots SELECT similarly
DROP POLICY IF EXISTS "Anyone authenticated can read price snapshots" ON public.buylist_price_snapshots;
CREATE POLICY "Users with buylist access can read price snapshots"
ON public.buylist_price_snapshots
FOR SELECT
TO authenticated
USING (public.has_buylist_access(auth.uid()));
