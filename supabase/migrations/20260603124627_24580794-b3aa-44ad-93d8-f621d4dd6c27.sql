-- Add era column to market_snapshots and keep it auto-classified so the
-- Pull or Pass feed filters can run server-side against an index instead
-- of pulling thousands of rows and post-filtering in the client.

ALTER TABLE public.market_snapshots
  ADD COLUMN IF NOT EXISTS era text;

CREATE OR REPLACE FUNCTION public.classify_set_era(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN s IS NULL THEN NULL
    -- WOTC / vintage (no consistent code prefix — match by set name)
    WHEN s ~* '(base set|jungle|fossil|team rocket|gym heroes|gym challenge|neo |expedition|aquapolis|skyridge|legendary collection)' THEN 'wotc'
    -- Scarlet & Violet
    WHEN s ~* '^sv([: 0-9]|$)' OR s ~* '(scarlet ?& ?violet|paldea|obsidian flames|paradox rift|paldean fates|temporal forces|twilight masquerade|shrouded fable|stellar crown|surging sparks|prismatic evolutions|journey together|destined rivals|black bolt|white flare|\m151\M)' THEN 'sv'
    -- Sword & Shield
    WHEN s ~* '^swsh([: 0-9]|$)' OR s ~* '(sword ?& ?shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|pokemon go|celebrations|shining fates)' THEN 'swsh'
    -- Sun & Moon
    WHEN s ~* '^sm([: 0-9-]|$)' OR s ~* '(sun ?& ?moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|detective pikachu|dragon majesty)' THEN 'sm'
    -- XY
    WHEN s ~* '^xy([: 0-9 -]|$)' OR s ~* '(flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|double crisis|kalos)' THEN 'xy'
    -- Black & White
    WHEN s ~* '^bw([: 0-9]|$)' OR s ~* '(black ?& ?white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures)' THEN 'bw'
    -- Diamond & Pearl + HGSS
    WHEN s ~* '^(dp|hgss)([: 0-9]|$)' OR s ~* '(diamond|pearl|platinum|mysterious treasures|secret wonders|great encounters|majestic dawn|legends awakened|stormfront|rising rivals|supreme victors|arceus|heartgold|soulsilver|unleashed|undaunted|triumphant|call of legends)' THEN 'dp'
    -- EX era
    WHEN s ~* '^ex([: 0-9]|$)' OR s ~* '(ex (ruby|sandstorm|dragon|team magma|team aqua|hidden legends|firered|leafgreen|deoxys|emerald|unseen forces|delta species|legend maker|holon|crystal guardians|dragon frontiers|power keepers))' THEN 'ex'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.market_snapshots_set_era()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.era := public.classify_set_era(NEW.set_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_market_snapshots_set_era ON public.market_snapshots;
CREATE TRIGGER trg_market_snapshots_set_era
BEFORE INSERT OR UPDATE OF set_name ON public.market_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.market_snapshots_set_era();

-- Backfill existing rows once.
UPDATE public.market_snapshots
SET era = public.classify_set_era(set_name)
WHERE era IS NULL AND set_name IS NOT NULL;

-- Composite index that matches the Pull or Pass filter query shape:
--   game = ... AND product_type IN (...) AND era IN (...) AND price BETWEEN ...
CREATE INDEX IF NOT EXISTS idx_market_snapshots_feed_filter
  ON public.market_snapshots (game, product_type, era, price)
  WHERE price IS NOT NULL AND tcgplayer_id IS NOT NULL;
