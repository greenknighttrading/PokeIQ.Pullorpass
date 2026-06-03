
CREATE OR REPLACE FUNCTION public.classify_set_era(s text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN s IS NULL THEN NULL
    -- Modern code-prefix checks first
    WHEN s ~* '^sv([: 0-9]|$)'   THEN 'sv'
    WHEN s ~* '^swsh([: 0-9]|$)' THEN 'swsh'
    WHEN s ~* '^sm([: 0-9-]|$)'  THEN 'sm'
    WHEN s ~* '^xy([: 0-9 -]|$)' THEN 'xy'
    WHEN s ~* '^bw([: 0-9]|$)'   THEN 'bw'
    WHEN s ~* '^(dp|hgss)([: 0-9]|$)' THEN 'dp'
    WHEN s ~* '^ex([: 0-9]|$)'   THEN 'ex'
    -- Expansion keywords (modern)
    WHEN s ~* '(scarlet ?& ?violet|paldea|obsidian flames|paradox rift|paldean fates|temporal forces|twilight masquerade|shrouded fable|stellar crown|surging sparks|prismatic evolutions|journey together|destined rivals|black bolt|white flare|\m151\M)' THEN 'sv'
    WHEN s ~* '(sword ?& ?shield|rebel clash|darkness ablaze|vivid voltage|battle styles|chilling reign|evolving skies|fusion strike|brilliant stars|astral radiance|lost origin|silver tempest|crown zenith|pokemon go|celebrations|shining fates)' THEN 'swsh'
    WHEN s ~* '(sun ?& ?moon|guardians rising|burning shadows|crimson invasion|ultra prism|forbidden light|celestial storm|lost thunder|team up|unbroken bonds|unified minds|cosmic eclipse|hidden fates|shining legends|detective pikachu|dragon majesty)' THEN 'sm'
    WHEN s ~* '(flashfire|furious fists|phantom forces|primal clash|roaring skies|ancient origins|breakthrough|breakpoint|fates collide|steam siege|evolutions|generations|double crisis|kalos)' THEN 'xy'
    WHEN s ~* '(black ?& ?white|emerging powers|noble victories|next destinies|dark explorers|dragons exalted|boundaries crossed|plasma|legendary treasures)' THEN 'bw'
    WHEN s ~* '(diamond|pearl|platinum|mysterious treasures|secret wonders|great encounters|majestic dawn|legends awakened|stormfront|rising rivals|supreme victors|arceus|heartgold|soulsilver|unleashed|undaunted|triumphant|call of legends)' THEN 'dp'
    -- EX-era: catch both "EX Foo" prefix sets AND standalone DB names
    WHEN s ~* '^(ruby ?(and|&) ?sapphire|sandstorm|dragon|team magma vs team aqua|hidden legends|firered ?(and|&|/) ?leafgreen|firered|leafgreen|team rocket returns|deoxys|emerald|unseen forces|delta species|legend maker|holon phantoms|crystal guardians|dragon frontiers|power keepers)$' THEN 'ex'
    WHEN s ~* '(ex (ruby|sandstorm|dragon|team magma|team aqua|hidden legends|firered|leafgreen|deoxys|emerald|unseen forces|delta species|legend maker|holon|crystal guardians|dragon frontiers|power keepers|battle stadium|trainer kit))' THEN 'ex'
    -- WOTC last
    WHEN s ~* '(^base set|^jungle$|^fossil$|^team rocket$|gym heroes|gym challenge|^neo |expedition|aquapolis|skyridge|legendary collection|base set 2|base set \(shadowless\))' THEN 'wotc'
    ELSE NULL
  END
$function$;

UPDATE public.market_snapshots
SET era = public.classify_set_era(set_name)
WHERE set_name IS NOT NULL;
