
-- Table to store daily portfolio value snapshots
CREATE TABLE public.portfolio_value_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_market_value NUMERIC NOT NULL DEFAULT 0,
  total_cost_basis NUMERIC NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- RLS
ALTER TABLE public.portfolio_value_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON public.portfolio_value_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert snapshots"
  ON public.portfolio_value_snapshots FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update snapshots"
  ON public.portfolio_value_snapshots FOR UPDATE
  USING (true);

-- Index for fast user+date queries
CREATE INDEX idx_portfolio_snapshots_user_date 
  ON public.portfolio_value_snapshots(user_id, snapshot_date DESC);
