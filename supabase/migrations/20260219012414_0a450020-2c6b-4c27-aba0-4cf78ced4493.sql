
-- Drop existing restrictive policy and replace with permissive one allowing both anon and authenticated
DROP POLICY IF EXISTS "Anyone authenticated can read market snapshots" ON public.market_snapshots;

CREATE POLICY "Anyone can read market snapshots"
ON public.market_snapshots
FOR SELECT
USING (true);
