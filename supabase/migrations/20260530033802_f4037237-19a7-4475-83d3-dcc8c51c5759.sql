
-- Restrict portfolio policies to authenticated role only (was 'public').
DROP POLICY IF EXISTS "Users can read own portfolio data" ON public.portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolio data" ON public.portfolios;
DROP POLICY IF EXISTS "Users can update own portfolio data" ON public.portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolio data" ON public.portfolios;

CREATE POLICY "Users can read own portfolio data"
  ON public.portfolios FOR SELECT TO authenticated
  USING (session_id = auth.uid()::text);

CREATE POLICY "Users can insert own portfolio data"
  ON public.portfolios FOR INSERT TO authenticated
  WITH CHECK (session_id = auth.uid()::text);

CREATE POLICY "Users can update own portfolio data"
  ON public.portfolios FOR UPDATE TO authenticated
  USING (session_id = auth.uid()::text)
  WITH CHECK (session_id = auth.uid()::text);

CREATE POLICY "Users can delete own portfolio data"
  ON public.portfolios FOR DELETE TO authenticated
  USING (session_id = auth.uid()::text);
