UPDATE public.pokeiq_likes l
SET
  artist       = COALESCE(l.artist,       c.artist),
  card_type    = COALESCE(l.card_type,    c.card_type),
  pokemon_type = COALESCE(l.pokemon_type, c.pokemon_type),
  card_number  = COALESCE(l.card_number,  c.card_number),
  rarity       = COALESCE(l.rarity,       c.rarity),
  set_name     = COALESCE(l.set_name,     c.set_name),
  image_url    = COALESCE(l.image_url,    c.image_cdn_url_400)
FROM public.cards_ppt c
WHERE c.ppt_id = l.card_id;

UPDATE public.pokeiq_likes l
SET
  set_id       = COALESCE(l.set_id, s.id),
  release_year = COALESCE(
    l.release_year,
    NULLIF(substring(s.release_date FROM '(\d{4})'), '')::int
  )
FROM public.sets_ppt s
WHERE l.set_name IS NOT NULL
  AND lower(s.name) = lower(l.set_name);

UPDATE public.pokeiq_likes
SET price_tier = CASE
  WHEN price IS NULL OR price <= 0 THEN 'unknown'
  WHEN price <  15  THEN 'budget'
  WHEN price <  50  THEN 'mid'
  WHEN price < 200  THEN 'premium'
  ELSE 'grail'
END
WHERE price_tier IS NULL;

UPDATE public.pokeiq_likes
SET era = CASE
  WHEN set_name ~* 'scarlet|paldea|obsidian|^151|paradox|temporal|twilight masquerade|shrouded|stellar|surging|prismatic|journey together|destined rivals' THEN 'sv'
  WHEN set_name ~* 'sword|shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral|lost origin|silver tempest|crown zenith|shining fates|celebrations|champion''s path' THEN 'swsh'
  WHEN set_name ~* 'sun & moon|sun and moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|dragon majesty' THEN 'sm'
  WHEN set_name ~* '^xy|flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|kalos' THEN 'xy'
  WHEN set_name ~* 'black & white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures' THEN 'bw'
  WHEN set_name ~* 'diamond|pearl|platinum|mysterious treasures|secret wonders|stormfront|majestic dawn|legends awakened|rising rivals|supreme victors|arceus|heartgold|soulsilver|hgss|call of legends' THEN 'dp'
  WHEN set_name ~* 'ex (ruby|sandstorm|dragon|team magma|hidden legends|fire red|deoxys|emerald|unseen forces|delta|legend maker|holon|crystal guardians|dragon frontiers|power keepers)' THEN 'ex'
  WHEN set_name ~* 'base set|jungle|fossil|team rocket|^gym |^neo |expedition|aquapolis|skyridge|legendary collection' THEN 'vintage'
  ELSE era
END
WHERE era IS NULL AND set_name IS NOT NULL;

UPDATE public.pokeiq_likes
SET product_category = CASE
  WHEN card_name ~* '\b(psa|bgs|cgc|sgc|beckett)\s*\d' THEN 'graded'
  WHEN card_name ~* 'booster|box|pack|deck|tin|etb|bundle|collection|case' THEN 'sealed'
  ELSE 'single'
END
WHERE product_category IS NULL OR product_category = 'single';

UPDATE public.pokeiq_likes
SET pokemon_name = NULLIF(
  split_part(
    regexp_replace(card_name, '\m(ex|gx|v|vmax|vstar|prime|legend|break|star|delta)\M', '', 'gi'),
    ' ', 1
  ),
  ''
)
WHERE pokemon_name IS NULL;