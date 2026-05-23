
CREATE TABLE public.pullorpass_swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  round_id uuid NOT NULL,
  card_id text NOT NULL,
  card_name text NOT NULL,
  card_set text,
  card_image text,
  card_price numeric,
  card_rarity text,
  decision text NOT NULL CHECK (decision IN ('pull','pass')),
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pullorpass_swipes_user ON public.pullorpass_swipes(user_id, created_at DESC);
CREATE INDEX idx_pullorpass_swipes_round ON public.pullorpass_swipes(round_id);

ALTER TABLE public.pullorpass_swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own swipes" ON public.pullorpass_swipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own swipes" ON public.pullorpass_swipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own swipes" ON public.pullorpass_swipes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.pullorpass_dna (
  user_id uuid PRIMARY KEY,
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  tag_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  pull_count integer NOT NULL DEFAULT 0,
  pass_count integer NOT NULL DEFAULT 0,
  rounds_completed integer NOT NULL DEFAULT 0,
  archetype text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pullorpass_dna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own dna" ON public.pullorpass_dna FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own dna" ON public.pullorpass_dna FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own dna" ON public.pullorpass_dna FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_pullorpass_dna_updated
BEFORE UPDATE ON public.pullorpass_dna
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
