
-- Tighten the settings insert policy to admin-only now that seed data exists
DROP POLICY "Admin can insert settings" ON public.buylist_settings;
CREATE POLICY "Admin can insert settings"
  ON public.buylist_settings FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' = (SELECT value FROM public.buylist_settings WHERE key = 'admin_email'));
