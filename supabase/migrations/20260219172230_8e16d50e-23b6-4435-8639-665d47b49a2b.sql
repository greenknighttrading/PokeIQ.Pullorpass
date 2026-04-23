-- Allow public (anon) read access to buylist_picks for The Brief
DROP POLICY "Anyone authenticated can read picks" ON public.buylist_picks;
CREATE POLICY "Anyone can read active picks" ON public.buylist_picks FOR SELECT USING (active = true);
