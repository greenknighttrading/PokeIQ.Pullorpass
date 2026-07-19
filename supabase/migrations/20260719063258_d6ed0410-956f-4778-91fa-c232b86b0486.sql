CREATE OR REPLACE FUNCTION public.ensure_daily_battles(p_date date DEFAULT ((now() AT TIME ZONE 'America/New_York'::text))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pairs jsonb;
  v_seed float8;
BEGIN
  SELECT pairs INTO v_pairs FROM public.daily_battles WHERE battle_date = p_date;
  IF FOUND THEN RETURN v_pairs; END IF;

  v_seed := ((extract(epoch from p_date)::bigint % 100000)::float8) / 100000.0;
  PERFORM setseed(v_seed);

  WITH pool AS (
    SELECT DISTINCT ON (ms.card_id)
      ms.card_id, ms.name, ms.set_name, ms.rarity, ms.price, ms.tcgplayer_id,
      'https://tcgplayer-cdn.tcgplayer.com/product/' || ms.tcgplayer_id || '_in_1000x1000.jpg' AS image_url
    FROM public.market_snapshots ms
    WHERE ms.game = 'Pokemon'
      AND ms.product_type = 'card'
      AND ms.price >= 10
      AND ms.tcgplayer_id IS NOT NULL
      AND ms.name !~* '(reverse holo|1st edition|\ycode\y|\yenergy\y|\ytrainer\y|booster|\bbox\b|\bpack\b|\btin\b|etb|elite trainer|bundle|blister|\bdeck\b|collection|\bcase\b|premium collection|prerelease|sealed|unopened|oversized|oversize|jumbo)'
    ORDER BY ms.card_id, ms.price DESC
  ),
  shuffled AS (
    SELECT p.*, row_number() OVER (ORDER BY random()) AS rn
    FROM pool p
    LIMIT 300
  ),
  candidates AS (
    SELECT a.card_id AS a_id,
           jsonb_build_object(
             'card_id', a.card_id, 'name', a.name, 'set_name', a.set_name,
             'rarity', a.rarity, 'price', a.price, 'image_url', a.image_url
           ) AS a_json,
           (
             SELECT jsonb_build_object(
                      'card_id', b.card_id, 'name', b.name, 'set_name', b.set_name,
                      'rarity', b.rarity, 'price', b.price, 'image_url', b.image_url
                    )
             FROM shuffled b
             WHERE b.card_id <> a.card_id
               AND abs(b.price - a.price) / greatest(a.price, 0.01) <= 0.10
             ORDER BY random()
             LIMIT 1
           ) AS b_json,
           a.rn
    FROM shuffled a
    ORDER BY a.rn
    LIMIT 60
  ),
  valid AS (
    SELECT a_json, b_json FROM candidates WHERE b_json IS NOT NULL LIMIT 5
  )
  SELECT jsonb_agg(jsonb_build_object('a', a_json, 'b', b_json))
  INTO v_pairs
  FROM valid;

  IF v_pairs IS NULL OR jsonb_array_length(v_pairs) < 5 THEN
    RAISE EXCEPTION 'daily_battles: insufficient card pool to build 5 pairs';
  END IF;

  INSERT INTO public.daily_battles(battle_date, pairs)
  VALUES (p_date, v_pairs)
  ON CONFLICT (battle_date) DO NOTHING;

  SELECT pairs INTO v_pairs FROM public.daily_battles WHERE battle_date = p_date;
  RETURN v_pairs;
END;
$function$;

-- Purge any already-generated future/today entries containing oversized/jumbo so they regenerate
DELETE FROM public.daily_battles
WHERE battle_date >= ((now() AT TIME ZONE 'America/New_York')::date)
  AND (pairs::text ~* 'oversized|oversize|jumbo');