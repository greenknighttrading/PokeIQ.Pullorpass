
-- Settings table first (referenced by other policies)
CREATE TABLE public.buylist_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buylist_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.buylist_settings FOR SELECT TO authenticated
  USING (true);

-- Temporarily allow any authenticated user to insert settings (for seeding)
CREATE POLICY "Admin can insert settings"
  ON public.buylist_settings FOR INSERT TO authenticated
  WITH CHECK (true);

-- Seed default settings first
INSERT INTO public.buylist_settings (key, value) VALUES
  ('near_zone_pct', '10'),
  ('admin_email', '');

-- Now admin-only update
CREATE POLICY "Admin can update settings"
  ON public.buylist_settings FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

-- BUY List items
CREATE TABLE public.buylist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  set_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Sealed' CHECK (category IN ('Sealed', 'Single', 'Slab')),
  language TEXT NOT NULL DEFAULT 'English',
  image_url TEXT,
  url_reference TEXT,
  notes TEXT,
  tcg_api_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buylist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read items"
  ON public.buylist_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert items"
  ON public.buylist_items FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

CREATE POLICY "Admin can update items"
  ON public.buylist_items FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

CREATE POLICY "Admin can delete items"
  ON public.buylist_items FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

-- Price snapshots
CREATE TABLE public.buylist_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.buylist_items(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'manual'
);

ALTER TABLE public.buylist_price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read price snapshots"
  ON public.buylist_price_snapshots FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert price snapshots"
  ON public.buylist_price_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

-- Picks
CREATE TABLE public.buylist_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.buylist_items(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 10),
  buy_zone_type TEXT NOT NULL DEFAULT 'threshold' CHECK (buy_zone_type IN ('threshold', 'range')),
  buy_price NUMERIC(10,2),
  buy_low NUMERIC(10,2),
  buy_high NUMERIC(10,2),
  allocation_pct INTEGER DEFAULT 10 CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  rationale JSONB DEFAULT '[]'::jsonb,
  commentary TEXT,
  entry_style TEXT DEFAULT 'DCA' CHECK (entry_style IN ('DCA', 'Pullback', 'Breakout', 'Lump Sum')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buylist_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read picks"
  ON public.buylist_picks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can insert picks"
  ON public.buylist_picks FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

CREATE POLICY "Admin can update picks"
  ON public.buylist_picks FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

CREATE POLICY "Admin can delete picks"
  ON public.buylist_picks FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

-- Invite codes
CREATE TABLE public.buylist_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER DEFAULT 100,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.buylist_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invites for validation"
  ON public.buylist_invites FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin can manage invites insert"
  ON public.buylist_invites FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

CREATE POLICY "Admin can manage invites update"
  ON public.buylist_invites FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

CREATE POLICY "Admin can manage invites delete"
  ON public.buylist_invites FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));

-- Access tracking
CREATE TABLE public.buylist_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  invite_code TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.buylist_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own access"
  ON public.buylist_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own access"
  ON public.buylist_access FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Seed invite code
INSERT INTO public.buylist_invites (code, is_active, max_uses) VALUES
  ('POKEIQ2025', true, 100);

-- Triggers
CREATE TRIGGER update_buylist_items_updated_at
  BEFORE UPDATE ON public.buylist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buylist_picks_updated_at
  BEFORE UPDATE ON public.buylist_picks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
