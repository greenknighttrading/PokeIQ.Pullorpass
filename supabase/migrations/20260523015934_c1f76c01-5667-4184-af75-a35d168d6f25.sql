
CREATE TABLE public.pokeyelp_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  card_set TEXT,
  card_image TEXT,
  card_price NUMERIC,
  tags TEXT[] NOT NULL DEFAULT '{}',
  custom_tags TEXT[] NOT NULL DEFAULT '{}',
  credits_awarded INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pokeyelp_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pokeyelp_reviews"
ON public.pokeyelp_reviews FOR SELECT USING (true);

CREATE POLICY "Users insert own reviews"
ON public.pokeyelp_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews"
ON public.pokeyelp_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_pokeyelp_reviews_card ON public.pokeyelp_reviews(card_id);
CREATE INDEX idx_pokeyelp_reviews_user ON public.pokeyelp_reviews(user_id);

CREATE TABLE public.pokeiq_credits (
  user_id UUID NOT NULL PRIMARY KEY,
  credits INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pokeiq_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credits"
ON public.pokeiq_credits FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own credits"
ON public.pokeiq_credits FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own credits"
ON public.pokeiq_credits FOR UPDATE USING (auth.uid() = user_id);
