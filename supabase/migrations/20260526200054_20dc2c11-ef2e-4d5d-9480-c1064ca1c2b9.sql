
-- Enable pgvector for embedding columns
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================================
-- 1) EVENT FIREHOSE
-- =========================================================================

CREATE TABLE public.pokeiq_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id text,
  event_type text NOT NULL,
  card_id text,
  tag_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_page text,
  client_ts timestamptz,
  server_ts timestamptz NOT NULL DEFAULT now(),
  ingest_batch_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pokeiq_events_user_time   ON public.pokeiq_events (user_id, server_ts DESC);
CREATE INDEX idx_pokeiq_events_card_time   ON public.pokeiq_events (card_id, server_ts DESC) WHERE card_id IS NOT NULL;
CREATE INDEX idx_pokeiq_events_type_time   ON public.pokeiq_events (event_type, server_ts DESC);
CREATE INDEX idx_pokeiq_events_batch       ON public.pokeiq_events (user_id, ingest_batch_id) WHERE ingest_batch_id IS NOT NULL;

GRANT SELECT, INSERT ON public.pokeiq_events TO authenticated;
GRANT ALL ON public.pokeiq_events TO service_role;
ALTER TABLE public.pokeiq_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own events"
  ON public.pokeiq_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own events"
  ON public.pokeiq_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 2) TAG TAXONOMY GRAPH
-- =========================================================================

CREATE TABLE public.tag_clusters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  centroid_embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tag_clusters TO anon, authenticated;
GRANT ALL ON public.tag_clusters TO service_role;
ALTER TABLE public.tag_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tag_clusters"
  ON public.tag_clusters FOR SELECT USING (true);

CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'mood',  -- mood | aesthetic | era | character | meta
  cluster_id uuid REFERENCES public.tag_clusters(id) ON DELETE SET NULL,
  embedding vector(1536),
  is_canonical boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',   -- active | merged | banned
  source text NOT NULL DEFAULT 'seed',     -- seed | user | ai
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tags_category ON public.tags (category) WHERE status = 'active';
CREATE INDEX idx_tags_cluster  ON public.tags (cluster_id) WHERE cluster_id IS NOT NULL;

GRANT SELECT ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tags"
  ON public.tags FOR SELECT USING (true);

CREATE TABLE public.tag_synonyms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alias_tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  canonical_tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  confidence numeric NOT NULL DEFAULT 1.0,
  decided_by text NOT NULL DEFAULT 'admin',  -- ai | admin | vote
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alias_tag_id, canonical_tag_id)
);

GRANT SELECT ON public.tag_synonyms TO anon, authenticated;
GRANT ALL ON public.tag_synonyms TO service_role;
ALTER TABLE public.tag_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tag_synonyms"
  ON public.tag_synonyms FOR SELECT USING (true);

-- =========================================================================
-- 3) CARD COMMUNITY AGGREGATES
-- =========================================================================

CREATE TABLE public.card_community_stats (
  card_id text NOT NULL PRIMARY KEY,
  views integer NOT NULL DEFAULT 0,
  hovers integer NOT NULL DEFAULT 0,
  swipes_pull integer NOT NULL DEFAULT 0,
  swipes_pass integer NOT NULL DEFAULT 0,
  swipes_love integer NOT NULL DEFAULT 0,
  swipes_super integer NOT NULL DEFAULT 0,
  pull_pct numeric,
  hover_ms_p50 numeric,
  repeat_view_rate numeric,
  popularity_score numeric NOT NULL DEFAULT 0,
  trending_score_7d numeric NOT NULL DEFAULT 0,
  trending_score_30d numeric NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  last_computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_community_popular ON public.card_community_stats (popularity_score DESC);
CREATE INDEX idx_card_community_trending ON public.card_community_stats (trending_score_7d DESC);

GRANT SELECT ON public.card_community_stats TO anon, authenticated;
GRANT ALL ON public.card_community_stats TO service_role;
ALTER TABLE public.card_community_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card_community_stats"
  ON public.card_community_stats FOR SELECT USING (true);

CREATE TABLE public.card_tag_stats (
  card_id text NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  vote_count integer NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  ai_suggested_count integer NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0,
  decayed_weight numeric NOT NULL DEFAULT 0,
  source_mix jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_voted_at timestamptz,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, tag_id)
);

CREATE INDEX idx_card_tag_stats_card_weight ON public.card_tag_stats (card_id, decayed_weight DESC);
CREATE INDEX idx_card_tag_stats_tag ON public.card_tag_stats (tag_id, decayed_weight DESC);

GRANT SELECT ON public.card_tag_stats TO anon, authenticated;
GRANT ALL ON public.card_tag_stats TO service_role;
ALTER TABLE public.card_tag_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card_tag_stats"
  ON public.card_tag_stats FOR SELECT USING (true);

CREATE TABLE public.card_embeddings (
  card_id text NOT NULL PRIMARY KEY,
  art_embedding vector(1536),
  tag_embedding vector(1536),
  source text NOT NULL DEFAULT 'computed',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_embeddings TO anon, authenticated;
GRANT ALL ON public.card_embeddings TO service_role;
ALTER TABLE public.card_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card_embeddings"
  ON public.card_embeddings FOR SELECT USING (true);

-- =========================================================================
-- 4) ARCHETYPES + COLLECTOR PROFILE
-- =========================================================================

CREATE TABLE public.archetypes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  seed_traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  centroid_embedding vector(1536),
  member_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.archetypes TO anon, authenticated;
GRANT ALL ON public.archetypes TO service_role;
ALTER TABLE public.archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read archetypes"
  ON public.archetypes FOR SELECT USING (true);

CREATE TABLE public.pokeiq_profiles (
  user_id uuid NOT NULL PRIMARY KEY,
  -- hard attribute aggregates
  top_artists jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_eras jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_pokemon jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_rarities jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- scalar taste dimensions (0..1)
  nostalgia_score numeric NOT NULL DEFAULT 0.5,
  chaos_score numeric NOT NULL DEFAULT 0.5,
  art_focus_score numeric NOT NULL DEFAULT 0.5,
  grail_appetite numeric NOT NULL DEFAULT 0.5,
  rarity_lean numeric NOT NULL DEFAULT 0.5,
  value_lean numeric NOT NULL DEFAULT 0.5,
  jp_lean numeric NOT NULL DEFAULT 0.0,
  sealed_lean numeric NOT NULL DEFAULT 0.0,
  -- vector + archetype
  taste_embedding vector(1536),
  archetype_id uuid REFERENCES public.archetypes(id) ON DELETE SET NULL,
  archetype_confidence numeric NOT NULL DEFAULT 0,
  -- meta
  signal_count integer NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'seedling',  -- seedling | sprouting | established | master
  model_version text NOT NULL DEFAULT 'heuristic-v1',
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pokeiq_profiles TO authenticated;
GRANT ALL ON public.pokeiq_profiles TO service_role;
ALTER TABLE public.pokeiq_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"
  ON public.pokeiq_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile"
  ON public.pokeiq_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.pokeiq_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- 5) SOCIAL / SIMILARITY
-- =========================================================================

CREATE TABLE public.collector_similarity (
  user_id uuid NOT NULL,
  neighbor_id uuid NOT NULL,
  similarity numeric NOT NULL,
  method text NOT NULL DEFAULT 'jaccard',  -- jaccard | cosine | hybrid
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, neighbor_id)
);

CREATE INDEX idx_collector_sim_user ON public.collector_similarity (user_id, similarity DESC);

GRANT SELECT ON public.collector_similarity TO authenticated;
GRANT ALL ON public.collector_similarity TO service_role;
ALTER TABLE public.collector_similarity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own neighbors"
  ON public.collector_similarity FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.collector_follows (
  follower_id uuid NOT NULL,
  followee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX idx_follows_followee ON public.collector_follows (followee_id);

GRANT SELECT, INSERT, DELETE ON public.collector_follows TO authenticated;
GRANT ALL ON public.collector_follows TO service_role;
ALTER TABLE public.collector_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own follows"
  ON public.collector_follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = followee_id);
CREATE POLICY "Users create own follows"
  ON public.collector_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users remove own follows"
  ON public.collector_follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- =========================================================================
-- 6) RECOMMENDATION LAYER
-- =========================================================================

CREATE TABLE public.recommendations_feed (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  surface text NOT NULL,                -- home | scanner | binder | pulse | matches
  card_id text NOT NULL,
  score numeric NOT NULL,
  reason_codes text[] NOT NULL DEFAULT '{}',
  model_version text NOT NULL DEFAULT 'attr-overlap-v1',
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX idx_recfeed_user_surface ON public.recommendations_feed (user_id, surface, score DESC);
CREATE INDEX idx_recfeed_expires ON public.recommendations_feed (expires_at) WHERE expires_at IS NOT NULL;

GRANT SELECT ON public.recommendations_feed TO authenticated;
GRANT ALL ON public.recommendations_feed TO service_role;
ALTER TABLE public.recommendations_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own recommendations"
  ON public.recommendations_feed FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.recommendation_impressions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id text NOT NULL,
  surface text NOT NULL,
  slot integer NOT NULL DEFAULT 0,
  model_version text,
  shown_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  dismissed_at timestamptz,
  led_to_action text
);

CREATE INDEX idx_recimp_user_time ON public.recommendation_impressions (user_id, shown_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.recommendation_impressions TO authenticated;
GRANT ALL ON public.recommendation_impressions TO service_role;
ALTER TABLE public.recommendation_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own impressions"
  ON public.recommendation_impressions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own impressions"
  ON public.recommendation_impressions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own impressions"
  ON public.recommendation_impressions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================================================================
-- 7) updated_at triggers (reuse existing function)
-- =========================================================================

CREATE TRIGGER trg_tags_updated BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tag_clusters_updated BEFORE UPDATE ON public.tag_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_archetypes_updated BEFORE UPDATE ON public.archetypes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.pokeiq_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 8) SEED: 12 archetypes
-- =========================================================================

INSERT INTO public.archetypes (slug, name, description, seed_traits) VALUES
  ('vintage-purist',     'Vintage Purist',     'WOTC-era loyalist who values original print scarcity above all.', '{"era":"vintage","grail_appetite":0.7,"nostalgia_score":0.95}'),
  ('art-connoisseur',    'Art Connoisseur',    'Follows artists and illustration craft over rarity or hype.',     '{"art_focus_score":0.95,"chaos_score":0.4}'),
  ('chase-hunter',       'Chase Hunter',       'Chases secret rares, alt arts, and modern grails.',               '{"grail_appetite":0.95,"rarity_lean":0.9,"value_lean":0.8}'),
  ('budget-completionist','Budget Completionist','Builds master sets methodically, prefers value over flash.',     '{"value_lean":0.2,"sealed_lean":0.2}'),
  ('sealed-investor',    'Sealed Investor',    'Holds sealed product as long-duration appreciation play.',         '{"sealed_lean":0.95,"value_lean":0.7}'),
  ('jp-aesthete',        'JP Aesthete',        'Drawn to Japanese exclusives, holos, and unique print runs.',      '{"jp_lean":0.95,"art_focus_score":0.8}'),
  ('vintage-chaos',      'Vintage Chaos Collector','Eclectic vintage taste — error cards, oddballs, off-meta picks.','{"era":"vintage","chaos_score":0.9}'),
  ('modern-meta',        'Modern Meta',        'Tracks current sets, hot Pokémon of the moment, modern alt arts.', '{"era":"ultraModern","value_lean":0.6}'),
  ('character-loyalist', 'Character Loyalist', 'Collects deeply around one or two favorite Pokémon.',              '{"chaos_score":0.2}'),
  ('graded-trophy',      'Graded Trophy Hunter','Focused on PSA/CGC high-grade slabs and pop reports.',           '{"grail_appetite":0.8,"value_lean":0.8}'),
  ('nostalgia-romantic', 'Nostalgia Romantic', 'Driven by childhood memory, base set energy, soft palettes.',      '{"nostalgia_score":0.95,"art_focus_score":0.7}'),
  ('experimental-trader','Experimental Trader','Wide-ranging, flips frequently, follows market signals.',          '{"chaos_score":0.85,"value_lean":0.7}');

-- =========================================================================
-- 9) SEED: tag clusters + canonical tags
-- =========================================================================

INSERT INTO public.tag_clusters (name, description) VALUES
  ('warmth',     'cozy, nostalgic, comforting moods'),
  ('intensity',  'cinematic, dramatic, epic moods'),
  ('beauty',     'gorgeous, elegant, refined aesthetics'),
  ('chaos',      'weird, chaotic, oddball, funny energy'),
  ('darkness',   'creepy, eerie, ominous, edgy'),
  ('rarity',     'grail, chase, underrated, slept-on'),
  ('craft',      'art-forward, illustration, painterly, linework'),
  ('era-feel',   'vintage feel, modern feel, retro, futuristic'),
  ('character',  'cute, fierce, regal, playful character energy');

INSERT INTO public.tags (slug, display_name, category, cluster_id) VALUES
  -- warmth
  ('nostalgic',   'Nostalgic',  'mood',      (SELECT id FROM public.tag_clusters WHERE name='warmth')),
  ('cozy',        'Cozy',       'mood',      (SELECT id FROM public.tag_clusters WHERE name='warmth')),
  ('comforting',  'Comforting', 'mood',      (SELECT id FROM public.tag_clusters WHERE name='warmth')),
  ('wholesome',   'Wholesome',  'mood',      (SELECT id FROM public.tag_clusters WHERE name='warmth')),
  ('serene',      'Serene',     'mood',      (SELECT id FROM public.tag_clusters WHERE name='warmth')),
  -- intensity
  ('cinematic',   'Cinematic',  'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='intensity')),
  ('dramatic',    'Dramatic',   'mood',      (SELECT id FROM public.tag_clusters WHERE name='intensity')),
  ('epic',        'Epic',       'mood',      (SELECT id FROM public.tag_clusters WHERE name='intensity')),
  ('heroic',      'Heroic',     'mood',      (SELECT id FROM public.tag_clusters WHERE name='intensity')),
  ('powerful',    'Powerful',   'mood',      (SELECT id FROM public.tag_clusters WHERE name='intensity')),
  -- beauty
  ('beautiful',   'Beautiful',  'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='beauty')),
  ('elegant',     'Elegant',    'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='beauty')),
  ('refined',     'Refined',    'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='beauty')),
  ('graceful',    'Graceful',   'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='beauty')),
  ('dreamy',      'Dreamy',     'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='beauty')),
  -- chaos
  ('chaotic',     'Chaotic',    'mood',      (SELECT id FROM public.tag_clusters WHERE name='chaos')),
  ('weird',       'Weird',      'mood',      (SELECT id FROM public.tag_clusters WHERE name='chaos')),
  ('funny',       'Funny',      'mood',      (SELECT id FROM public.tag_clusters WHERE name='chaos')),
  ('oddball',     'Oddball',    'mood',      (SELECT id FROM public.tag_clusters WHERE name='chaos')),
  ('cursed',      'Cursed',     'mood',      (SELECT id FROM public.tag_clusters WHERE name='chaos')),
  -- darkness
  ('creepy',      'Creepy',     'mood',      (SELECT id FROM public.tag_clusters WHERE name='darkness')),
  ('eerie',       'Eerie',      'mood',      (SELECT id FROM public.tag_clusters WHERE name='darkness')),
  ('ominous',     'Ominous',    'mood',      (SELECT id FROM public.tag_clusters WHERE name='darkness')),
  ('edgy',        'Edgy',       'mood',      (SELECT id FROM public.tag_clusters WHERE name='darkness')),
  ('moody',       'Moody',      'mood',      (SELECT id FROM public.tag_clusters WHERE name='darkness')),
  -- rarity
  ('grail',       'Grail',      'meta',      (SELECT id FROM public.tag_clusters WHERE name='rarity')),
  ('chase',       'Chase',      'meta',      (SELECT id FROM public.tag_clusters WHERE name='rarity')),
  ('underrated',  'Underrated', 'meta',      (SELECT id FROM public.tag_clusters WHERE name='rarity')),
  ('slept-on',    'Slept On',   'meta',      (SELECT id FROM public.tag_clusters WHERE name='rarity')),
  ('iconic',      'Iconic',     'meta',      (SELECT id FROM public.tag_clusters WHERE name='rarity')),
  -- craft
  ('art-forward', 'Art Forward','aesthetic', (SELECT id FROM public.tag_clusters WHERE name='craft')),
  ('painterly',   'Painterly',  'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='craft')),
  ('detailed',    'Detailed',   'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='craft')),
  ('minimal',     'Minimal',    'aesthetic', (SELECT id FROM public.tag_clusters WHERE name='craft')),
  ('illustrative','Illustrative','aesthetic',(SELECT id FROM public.tag_clusters WHERE name='craft')),
  -- era-feel
  ('vintage-feel','Vintage Feel','era',      (SELECT id FROM public.tag_clusters WHERE name='era-feel')),
  ('retro',       'Retro',      'era',       (SELECT id FROM public.tag_clusters WHERE name='era-feel')),
  ('modern-feel', 'Modern Feel','era',       (SELECT id FROM public.tag_clusters WHERE name='era-feel')),
  ('futuristic',  'Futuristic', 'era',       (SELECT id FROM public.tag_clusters WHERE name='era-feel')),
  ('classic',     'Classic',    'era',       (SELECT id FROM public.tag_clusters WHERE name='era-feel')),
  -- character
  ('cute',        'Cute',       'character', (SELECT id FROM public.tag_clusters WHERE name='character')),
  ('fierce',      'Fierce',     'character', (SELECT id FROM public.tag_clusters WHERE name='character')),
  ('regal',       'Regal',      'character', (SELECT id FROM public.tag_clusters WHERE name='character')),
  ('playful',     'Playful',    'character', (SELECT id FROM public.tag_clusters WHERE name='character')),
  ('majestic',    'Majestic',   'character', (SELECT id FROM public.tag_clusters WHERE name='character'));

-- Seed common synonym pairs (alias -> canonical)
WITH s AS (
  SELECT slug, id FROM public.tags
)
INSERT INTO public.tag_synonyms (alias_tag_id, canonical_tag_id, decided_by)
SELECT a.id, c.id, 'seed' FROM s a, s c
WHERE (a.slug, c.slug) IN (
  ('graceful','elegant'),
  ('dreamy','beautiful'),
  ('comforting','cozy'),
  ('wholesome','cozy'),
  ('ominous','eerie'),
  ('moody','eerie'),
  ('oddball','weird'),
  ('cursed','creepy'),
  ('slept-on','underrated'),
  ('classic','retro')
)
ON CONFLICT DO NOTHING;
