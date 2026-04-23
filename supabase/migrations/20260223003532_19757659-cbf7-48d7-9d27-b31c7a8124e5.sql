
DROP POLICY "Service can insert greatest_hits_cache" ON public.greatest_hits_cache;
DROP POLICY "Service can update greatest_hits_cache" ON public.greatest_hits_cache;

CREATE POLICY "Service role can insert greatest_hits_cache"
  ON public.greatest_hits_cache FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update greatest_hits_cache"
  ON public.greatest_hits_cache FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'service_role');
