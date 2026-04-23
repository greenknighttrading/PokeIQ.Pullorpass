-- Table to store daily aggregated market index values
CREATE TABLE public.market_index (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  total_market_value numeric NOT NULL DEFAULT 0,
  total_cards integer NOT NULL DEFAULT 0,
  sp500_close numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_index ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read market index"
  ON public.market_index
  FOR SELECT
  USING (true);

-- Create index for date lookups
CREATE INDEX idx_market_index_date ON public.market_index (date DESC);