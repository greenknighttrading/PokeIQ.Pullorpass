
CREATE TABLE public.sentiment_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL UNIQUE,
  cards_total integer NOT NULL DEFAULT 0,
  cards_up integer NOT NULL DEFAULT 0,
  cards_down integer NOT NULL DEFAULT 0,
  cards_up_pct integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sentiment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sentiment_cache"
  ON public.sentiment_cache FOR SELECT USING (true);

CREATE POLICY "Service role can insert sentiment_cache"
  ON public.sentiment_cache FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Service role can update sentiment_cache"
  ON public.sentiment_cache FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'service_role');
