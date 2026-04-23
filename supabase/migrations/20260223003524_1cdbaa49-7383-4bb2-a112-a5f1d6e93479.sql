
CREATE TABLE public.greatest_hits_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  pokemon_name text NOT NULL,
  avg_change_7d numeric NOT NULL DEFAULT 0,
  card_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, pokemon_name)
);

ALTER TABLE public.greatest_hits_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read greatest_hits_cache"
  ON public.greatest_hits_cache FOR SELECT USING (true);

-- Service role / edge functions can insert
CREATE POLICY "Service can insert greatest_hits_cache"
  ON public.greatest_hits_cache FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update greatest_hits_cache"
  ON public.greatest_hits_cache FOR UPDATE USING (true);
