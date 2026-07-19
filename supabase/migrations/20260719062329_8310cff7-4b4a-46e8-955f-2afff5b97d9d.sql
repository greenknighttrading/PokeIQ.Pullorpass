
-- Daily This or That: shared 5 battles per day, EST reset

CREATE TABLE IF NOT EXISTS public.daily_battles (
  battle_date date PRIMARY KEY,
  pairs jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_battles TO anon, authenticated;
GRANT ALL ON public.daily_battles TO service_role;
ALTER TABLE public.daily_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily battles" ON public.daily_battles FOR SELECT USING (true);

-- Add daily columns to matchup vote table
ALTER TABLE public.this_or_that_matchups
  ADD COLUMN IF NOT EXISTS battle_date date,
  ADD COLUMN IF NOT EXISTS matchup_index int;

CREATE UNIQUE INDEX IF NOT EXISTS this_or_that_daily_unique
  ON public.this_or_that_matchups(user_id, battle_date, matchup_index)
  WHERE battle_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS this_or_that_battle_date_idx
  ON public.this_or_that_matchups(battle_date)
  WHERE battle_date IS NOT NULL;

-- RPC: ensure today's daily battles exist; generates 5 pairs of similarly-priced cards
CREATE OR REPLACE FUNCTION public.ensure_daily_battles(p_date date DEFAULT ((now() AT TIME ZONE 'America/New_York')::date))
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pairs jsonb;
  v_seed float8;
BEGIN
  SELECT pairs INTO v_pairs FROM public.daily_battles WHERE battle_date = p_date;
  IF FOUND THEN RETURN v_pairs; END IF;

  -- deterministic seed from date
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
      AND ms.name !~* '(reverse holo|1st edition|\ycode\y|\yenergy\y|\ytrainer\y|booster|\bbox\b|\bpack\b|\btin\b|etb|elite trainer|bundle|blister|\bdeck\b|collection|\bcase\b|premium collection|prerelease|sealed|unopened)'
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
$$;
GRANT EXECUTE ON FUNCTION public.ensure_daily_battles(date) TO anon, authenticated;

-- RPC: aggregated community results per matchup for a given date
CREATE OR REPLACE FUNCTION public.get_daily_battle_results(p_date date DEFAULT ((now() AT TIME ZONE 'America/New_York')::date))
RETURNS TABLE(matchup_index int, winner_card_id text, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.matchup_index, m.winner_card_id, COUNT(*)::bigint AS votes
  FROM public.this_or_that_matchups m
  WHERE m.battle_date = p_date AND m.matchup_index IS NOT NULL
  GROUP BY m.matchup_index, m.winner_card_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_daily_battle_results(date) TO anon, authenticated;

-- RPC: current user's picks for today (used to hydrate progress)
CREATE OR REPLACE FUNCTION public.get_my_daily_battle_picks(p_date date DEFAULT ((now() AT TIME ZONE 'America/New_York')::date))
RETURNS TABLE(matchup_index int, winner_card_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.matchup_index, m.winner_card_id
  FROM public.this_or_that_matchups m
  WHERE m.user_id = auth.uid() AND m.battle_date = p_date AND m.matchup_index IS NOT NULL
  ORDER BY m.matchup_index;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_daily_battle_picks(date) TO authenticated;
