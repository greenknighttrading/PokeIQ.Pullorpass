
-- ============================================
-- 1) JustTCG TABLES (Analytics Engine)
-- ============================================

CREATE TABLE public.cards_justtcg (
  id text PRIMARY KEY,
  tcgplayer_id text,
  name text NOT NULL,
  game text NOT NULL DEFAULT 'pokemon',
  set_code text,
  set_name text,
  number text,
  rarity text,
  is_sealed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_justtcg_game_set ON public.cards_justtcg (game, set_code);
CREATE INDEX idx_cards_justtcg_set_number ON public.cards_justtcg (set_code, number);
CREATE INDEX idx_cards_justtcg_tcgplayer ON public.cards_justtcg (tcgplayer_id);

ALTER TABLE public.cards_justtcg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cards_justtcg" ON public.cards_justtcg FOR SELECT USING (true);

-- ---

CREATE TABLE public.variants_justtcg (
  id text PRIMARY KEY,
  card_id text NOT NULL REFERENCES public.cards_justtcg(id) ON DELETE CASCADE,
  condition text,
  printing text,
  language text,
  tcgplayer_sku_id text,
  price_current numeric,
  last_updated bigint,
  variant_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_justtcg_card ON public.variants_justtcg (card_id);
CREATE INDEX idx_variants_justtcg_sku ON public.variants_justtcg (tcgplayer_sku_id);
CREATE INDEX idx_variants_justtcg_cpl ON public.variants_justtcg (condition, printing, language);

ALTER TABLE public.variants_justtcg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read variants_justtcg" ON public.variants_justtcg FOR SELECT USING (true);

-- ---

CREATE TABLE public.metrics_snapshots_justtcg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id text NOT NULL REFERENCES public.variants_justtcg(id) ON DELETE CASCADE,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  period text NOT NULL CHECK (period IN ('24h', '7d', '30d')),
  price_change_pct numeric,
  avg_price numeric,
  min_price numeric,
  max_price numeric,
  stddev numeric,
  cov numeric,
  iqr numeric,
  trend_slope numeric,
  price_changes_count integer,
  price_relative_to_30d_range numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_justtcg_lookup ON public.metrics_snapshots_justtcg (variant_id, period, as_of_date);

ALTER TABLE public.metrics_snapshots_justtcg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read metrics_snapshots_justtcg" ON public.metrics_snapshots_justtcg FOR SELECT USING (true);

-- ============================================
-- 2) PPT TABLES (Metadata/UX Layer)
-- ============================================

CREATE TABLE public.cards_ppt (
  ppt_id text PRIMARY KEY,
  tcgplayer_id text UNIQUE,
  name text NOT NULL,
  set_name text,
  card_number text,
  total_set_number text,
  rarity text,
  card_type text,
  pokemon_type text,
  energy_type text[],
  hp integer,
  stage text,
  flavor_text text,
  artist text,
  tcgplayer_url text,
  image_cdn_url text,
  image_cdn_url_200 text,
  image_cdn_url_400 text,
  image_cdn_url_800 text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_ppt_tcgplayer ON public.cards_ppt (tcgplayer_id);
CREATE INDEX idx_cards_ppt_set_number ON public.cards_ppt (set_name, card_number);

ALTER TABLE public.cards_ppt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cards_ppt" ON public.cards_ppt FOR SELECT USING (true);

-- ---

CREATE TABLE public.sets_ppt (
  id text PRIMARY KEY,
  name text NOT NULL,
  tcgplayer_id text,
  total_cards integer,
  release_date text,
  series text,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sets_ppt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sets_ppt" ON public.sets_ppt FOR SELECT USING (true);

-- ---

CREATE TABLE public.sealed_ppt (
  id text PRIMARY KEY,
  tcgplayer_id text UNIQUE,
  name text NOT NULL,
  set_name text,
  category text,
  image_cdn_url text,
  market_price numeric,
  low_price numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sealed_ppt_tcgplayer ON public.sealed_ppt (tcgplayer_id);

ALTER TABLE public.sealed_ppt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sealed_ppt" ON public.sealed_ppt FOR SELECT USING (true);

-- ============================================
-- 3) MAPPING TABLES
-- ============================================

CREATE TABLE public.set_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_set text NOT NULL,
  alias text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alias, source)
);

ALTER TABLE public.set_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read set_aliases" ON public.set_aliases FOR SELECT USING (true);

-- ---

CREATE TABLE public.printing_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_printing text NOT NULL,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(alias)
);

ALTER TABLE public.printing_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read printing_aliases" ON public.printing_aliases FOR SELECT USING (true);

-- ---

CREATE TABLE public.user_asset_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  upload_fingerprint text NOT NULL,
  resolved_variant_id text,
  resolved_tcgplayer_id text,
  confidence numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, upload_fingerprint)
);

CREATE INDEX idx_user_asset_mappings_user ON public.user_asset_mappings (user_id);
CREATE INDEX idx_user_asset_mappings_fingerprint ON public.user_asset_mappings (upload_fingerprint);

ALTER TABLE public.user_asset_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own mappings" ON public.user_asset_mappings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mappings" ON public.user_asset_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mappings" ON public.user_asset_mappings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mappings" ON public.user_asset_mappings FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4) TRIGGERS for updated_at
-- ============================================

CREATE TRIGGER update_cards_justtcg_updated_at BEFORE UPDATE ON public.cards_justtcg FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_variants_justtcg_updated_at BEFORE UPDATE ON public.variants_justtcg FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cards_ppt_updated_at BEFORE UPDATE ON public.cards_ppt FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sets_ppt_updated_at BEFORE UPDATE ON public.sets_ppt FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sealed_ppt_updated_at BEFORE UPDATE ON public.sealed_ppt FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
