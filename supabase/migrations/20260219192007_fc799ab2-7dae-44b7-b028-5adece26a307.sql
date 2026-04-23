
-- Add source tracking and PPT-specific enrichment columns to market_snapshots
ALTER TABLE public.market_snapshots
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'justtcg',
  ADD COLUMN IF NOT EXISTS ppt_id text,
  ADD COLUMN IF NOT EXISTS price_nm numeric,
  ADD COLUMN IF NOT EXISTS price_lp numeric,
  ADD COLUMN IF NOT EXISTS price_mp numeric,
  ADD COLUMN IF NOT EXISTS price_hp numeric,
  ADD COLUMN IF NOT EXISTS price_dmg numeric,
  ADD COLUMN IF NOT EXISTS primary_printing text,
  ADD COLUMN IF NOT EXISTS pokemon_type text,
  ADD COLUMN IF NOT EXISTS energy_type text[],
  ADD COLUMN IF NOT EXISTS hp text,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS artist text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sellers integer,
  ADD COLUMN IF NOT EXISTS listings integer;

-- Index for PPT source queries and dedup
CREATE INDEX IF NOT EXISTS idx_market_snapshots_source ON public.market_snapshots(source);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_ppt_id ON public.market_snapshots(ppt_id) WHERE ppt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_market_snapshots_tcgplayer_source ON public.market_snapshots(tcgplayer_id, source);
