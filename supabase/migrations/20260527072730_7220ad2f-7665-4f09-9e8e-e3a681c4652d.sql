-- Lock down pokeyelp_reviews: owner-only reads
DROP POLICY IF EXISTS "Authenticated users can read pokeyelp_reviews" ON public.pokeyelp_reviews;
CREATE POLICY "Users read own pokeyelp_reviews"
ON public.pokeyelp_reviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Lock down market_sync_status: no public/authenticated reads (service role bypasses RLS)
DROP POLICY IF EXISTS "Anyone authenticated can read sync status" ON public.market_sync_status;
REVOKE SELECT ON public.market_sync_status FROM anon, authenticated;