
-- Restrict pokeyelp_reviews insert/delete to authenticated only
DROP POLICY IF EXISTS "Users insert own reviews" ON public.pokeyelp_reviews;
DROP POLICY IF EXISTS "Users delete own reviews" ON public.pokeyelp_reviews;

CREATE POLICY "Users insert own reviews"
ON public.pokeyelp_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews"
ON public.pokeyelp_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add admin SELECT policy on buylist_access for auditing
CREATE POLICY "Admin can read all access grants"
ON public.buylist_access
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = (
    SELECT value FROM public.buylist_settings WHERE key = 'admin_email'
  )
);

-- Add admin-only SELECT policy on market_sync_status (currently has RLS enabled with no policies)
CREATE POLICY "Admin can read sync status"
ON public.market_sync_status
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = (
    SELECT value FROM public.buylist_settings WHERE key = 'admin_email'
  )
);
