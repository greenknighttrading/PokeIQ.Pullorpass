
-- Allow authenticated users to insert their own snapshots
CREATE POLICY "Users can insert own snapshots"
ON public.portfolio_value_snapshots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own snapshots
CREATE POLICY "Users can update own snapshots"
ON public.portfolio_value_snapshots
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
