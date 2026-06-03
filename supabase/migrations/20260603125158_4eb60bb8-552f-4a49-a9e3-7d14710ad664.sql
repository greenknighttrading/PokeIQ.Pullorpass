-- Add language column with classifier trigger to market_snapshots
ALTER TABLE public.market_snapshots ADD COLUMN IF NOT EXISTS language text;

CREATE OR REPLACE FUNCTION public.classify_card_language(card_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN card_name ~* '\(jp\)|japanese' THEN 'japanese'
    WHEN card_name ~* '\(kr\)|korean'   THEN 'korean'
    WHEN card_name ~* '\(cn\)|chinese'  THEN 'chinese'
    ELSE 'english'
  END;
$$;

CREATE OR REPLACE FUNCTION public.market_snapshots_set_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.language := public.classify_card_language(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_market_snapshots_set_language ON public.market_snapshots;
CREATE TRIGGER trg_market_snapshots_set_language
BEFORE INSERT OR UPDATE OF name ON public.market_snapshots
FOR EACH ROW EXECUTE FUNCTION public.market_snapshots_set_language();

-- Backfill existing rows
UPDATE public.market_snapshots
SET language = public.classify_card_language(name)
WHERE language IS NULL;

-- Index to support feed filter queries
CREATE INDEX IF NOT EXISTS idx_market_snapshots_language
ON public.market_snapshots (game, product_type, language, price);