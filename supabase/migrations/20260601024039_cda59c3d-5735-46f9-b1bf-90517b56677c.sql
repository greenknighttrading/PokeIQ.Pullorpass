-- ============================================================
-- Taste Profile v2 — multi-dimensional tags + taste archetypes
-- Non-destructive: keeps every existing tag and vote.
-- ============================================================

-- 1) New canonical tags across 5 dimensions
INSERT INTO public.tags (slug, display_name, category, is_canonical, source, status)
SELECT v.slug, v.display_name, v.category, true, 'system', 'active'
FROM (VALUES
  -- Emotional Response
  ('peaceful',     'Peaceful',     'emotional'),
  ('joyful',       'Joyful',       'emotional'),
  ('exciting',     'Exciting',     'emotional'),
  ('hopeful',      'Hopeful',      'emotional'),
  ('emotional',    'Emotional',    'emotional'),
  ('mysterious',   'Mysterious',   'emotional'),
  ('intense',      'Intense',      'emotional'),
  -- Aesthetic Style
  ('dreamlike',    'Dreamlike',    'aesthetic'),
  ('minimalist',   'Minimalist',   'aesthetic'),
  ('colorful',     'Colorful',     'aesthetic'),
  ('dark',         'Dark',         'aesthetic'),
  ('whimsical',    'Whimsical',    'aesthetic'),
  -- Storytelling
  ('adventure',    'Adventure',    'storytelling'),
  ('discovery',    'Discovery',    'storytelling'),
  ('friendship',   'Friendship',   'storytelling'),
  ('growth',       'Growth',       'storytelling'),
  ('journey',      'Journey',      'storytelling'),
  ('battle',       'Battle',       'storytelling'),
  ('exploration',  'Exploration',  'storytelling'),
  ('slice-of-life','Slice of Life','storytelling'),
  ('hero-moment',  'Hero Moment',  'storytelling'),
  ('family',       'Family',       'storytelling'),
  -- Collector Signal
  ('grail-worthy',       'Grail-Worthy',       'collector_signal'),
  ('vintage-feeling',    'Vintage Feeling',    'collector_signal'),
  ('modern-feeling',     'Modern Feeling',     'collector_signal'),
  ('rare-feeling',       'Rare Feeling',       'collector_signal'),
  ('popular-pokemon',    'Popular Pokémon',    'collector_signal'),
  ('underrated-pokemon', 'Underrated Pokémon', 'collector_signal'),
  ('niche',              'Niche',              'collector_signal'),
  ('accessible',         'Accessible',         'collector_signal'),
  ('prestige',           'Prestige',           'collector_signal'),
  -- Thematic
  ('nature',       'Nature',       'thematic'),
  ('fantasy',      'Fantasy',      'thematic'),
  ('city',         'City',         'thematic'),
  ('ocean',        'Ocean',        'thematic'),
  ('space',        'Space',        'thematic'),
  ('seasonal',     'Seasonal',     'thematic'),
  ('legendary',    'Legendary',    'thematic'),
  ('mythical',     'Mythical',     'thematic'),
  ('trainer-theme','Trainer',      'thematic'),
  ('environment',  'Environment',  'thematic')
) AS v(slug, display_name, category)
ON CONFLICT (slug) DO NOTHING;

-- 2) Recategorize a few existing tags into the new dimensions
UPDATE public.tags SET category = 'emotional'
 WHERE slug IN ('cozy','powerful','nostalgic') AND category <> 'emotional';

UPDATE public.tags SET category = 'aesthetic'
 WHERE slug IN ('cute','epic') AND category <> 'aesthetic';

UPDATE public.tags SET category = 'collector_signal'
 WHERE slug IN ('iconic','underrated','chase') AND category <> 'collector_signal';

-- 3) Deprecate near-duplicates via tag_synonyms (votes still resolve to canonical)
INSERT INTO public.tag_synonyms (alias_tag_id, canonical_tag_id, confidence, decided_by)
SELECT a.id, c.id, 1.0, 'system'
FROM (VALUES
  ('dreamy','dreamlike'),
  ('minimal','minimalist'),
  ('grail','grail-worthy'),
  ('vintage-feel','vintage-feeling'),
  ('modern-feel','modern-feeling'),
  ('slept-on','underrated')
) AS p(alias_slug, canon_slug)
JOIN public.tags a ON a.slug = p.alias_slug
JOIN public.tags c ON c.slug = p.canon_slug
ON CONFLICT (alias_tag_id, canonical_tag_id) DO NOTHING;

UPDATE public.tags SET status = 'merged'
 WHERE slug IN ('dreamy','minimal','grail','vintage-feel','modern-feel','slept-on');

-- 4) Six new taste archetypes
INSERT INTO public.archetypes (slug, name, description, seed_traits)
VALUES
  ('cozy-collector',  'Cozy Collector',
   'Warm, peaceful cards that feel comforting and emotionally rich.',
   '{"kind":"taste","high_weight":["cozy","peaceful","friendship","slice-of-life","nostalgic","wholesome","comforting","serene"]}'::jsonb),
  ('art-curator',     'Art Curator',
   'Collects beauty, creativity, and artistic expression.',
   '{"kind":"taste","high_weight":["beautiful","elegant","dreamlike","cinematic","colorful","painterly","art-forward","refined"]}'::jsonb),
  ('adventure-hunter','Adventure Hunter',
   'Drawn to exploration, wonder, and movement.',
   '{"kind":"taste","high_weight":["adventure","journey","discovery","exploration","epic","hero-moment"]}'::jsonb),
  ('nostalgia-keeper','Nostalgia Keeper',
   'Values familiar Pokémon, childhood memories, and timeless imagery.',
   '{"kind":"taste","high_weight":["nostalgic","vintage-feeling","iconic","friendship","hopeful","classic","retro"]}'::jsonb),
  ('power-seeker',    'Power Seeker',
   'Loves powerful Pokémon and high-impact moments.',
   '{"kind":"taste","high_weight":["powerful","intense","epic","battle","prestige","fierce","dramatic"]}'::jsonb),
  ('specialist',      'Specialist',
   'Drawn to overlooked, unusual, and niche cards.',
   '{"kind":"taste","high_weight":["underrated","underrated-pokemon","niche","accessible","whimsical","oddball","weird"]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 5) tag_archetype_weights table
CREATE TABLE IF NOT EXISTS public.tag_archetype_weights (
  tag_id       uuid NOT NULL REFERENCES public.tags(id)       ON DELETE CASCADE,
  archetype_id uuid NOT NULL REFERENCES public.archetypes(id) ON DELETE CASCADE,
  weight       numeric NOT NULL DEFAULT 1.0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tag_id, archetype_id)
);

GRANT SELECT ON public.tag_archetype_weights TO anon, authenticated;
GRANT ALL    ON public.tag_archetype_weights TO service_role;

ALTER TABLE public.tag_archetype_weights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tag_archetype_weights'
      AND policyname='Anyone can read tag_archetype_weights'
  ) THEN
    CREATE POLICY "Anyone can read tag_archetype_weights"
      ON public.tag_archetype_weights FOR SELECT USING (true);
  END IF;
END $$;

-- 6) Seed weights from each taste archetype's seed_traits.high_weight
INSERT INTO public.tag_archetype_weights (tag_id, archetype_id, weight)
SELECT t.id, a.id, 1.0
FROM public.archetypes a
CROSS JOIN LATERAL jsonb_array_elements_text(a.seed_traits->'high_weight') AS s(slug)
JOIN public.tags t ON t.slug = s.slug
WHERE a.slug IN ('cozy-collector','art-curator','adventure-hunter','nostalgia-keeper','power-seeker','specialist')
ON CONFLICT (tag_id, archetype_id) DO NOTHING;
