
-- Daily set value aggregation table
CREATE TABLE public.set_value_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  set_name text NOT NULL,
  total_value numeric NOT NULL DEFAULT 0,
  cards_count integer NOT NULL DEFAULT 0,
  avg_card_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, set_name)
);

-- Enable RLS (public read)
ALTER TABLE public.set_value_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read set_value_daily"
  ON public.set_value_daily FOR SELECT
  USING (true);

-- Index for fast time-series queries
CREATE INDEX idx_set_value_daily_set_date 
  ON public.set_value_daily(set_name, snapshot_date DESC);

CREATE INDEX idx_set_value_daily_date 
  ON public.set_value_daily(snapshot_date DESC);

-- Backfill from existing market_snapshots
INSERT INTO public.set_value_daily (snapshot_date, set_name, total_value, cards_count, avg_card_price)
SELECT 
  snapshot_date,
  set_name,
  SUM(price) as total_value,
  COUNT(*) as cards_count,
  AVG(price) as avg_card_price
FROM market_snapshots
WHERE set_name IS NOT NULL 
  AND price > 0
  AND game = 'Pokemon'
  AND set_name !~* '^misc|miscellaneous'
GROUP BY snapshot_date, set_name
ON CONFLICT (snapshot_date, set_name) DO NOTHING;
