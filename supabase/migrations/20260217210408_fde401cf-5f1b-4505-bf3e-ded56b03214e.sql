
-- Add item fields directly to buylist_picks
ALTER TABLE public.buylist_picks
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS set_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Sealed',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS url_reference text,
  ADD COLUMN IF NOT EXISTS tcg_api_id text;

-- Copy data from buylist_items into buylist_picks
UPDATE public.buylist_picks p
SET
  name = i.name,
  set_name = i.set_name,
  category = i.category,
  language = i.language,
  image_url = i.image_url,
  url_reference = i.url_reference,
  tcg_api_id = i.tcg_api_id
FROM public.buylist_items i
WHERE p.item_id = i.id;

-- Make item_id nullable (no longer required)
ALTER TABLE public.buylist_picks ALTER COLUMN item_id DROP NOT NULL;

-- Set name NOT NULL after data is copied (with a default for safety)
UPDATE public.buylist_picks SET name = 'Unknown' WHERE name IS NULL;
ALTER TABLE public.buylist_picks ALTER COLUMN name SET NOT NULL;
