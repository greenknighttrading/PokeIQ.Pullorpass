
-- Tighten INSERT/UPDATE to service role only (role = 'service_role')
DROP POLICY "Service role can insert snapshots" ON public.portfolio_value_snapshots;
DROP POLICY "Service role can update snapshots" ON public.portfolio_value_snapshots;

CREATE POLICY "Service role can insert snapshots"
  ON public.portfolio_value_snapshots FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can upsert snapshots"
  ON public.portfolio_value_snapshots FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'service_role');
