CREATE TABLE public.this_or_that_matchups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_a_id text NOT NULL,
  card_b_id text NOT NULL,
  winner_card_id text NOT NULL,
  loser_card_id text NOT NULL,
  winner_name text,
  winner_set text,
  winner_rarity text,
  winner_artist text,
  winner_price numeric,
  winner_era text,
  winner_type text,
  winner_tags text[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX this_or_that_matchups_user_idx ON public.this_or_that_matchups(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.this_or_that_matchups TO authenticated;
GRANT ALL ON public.this_or_that_matchups TO service_role;

ALTER TABLE public.this_or_that_matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own matchups"
  ON public.this_or_that_matchups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view their own matchups"
  ON public.this_or_that_matchups
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);