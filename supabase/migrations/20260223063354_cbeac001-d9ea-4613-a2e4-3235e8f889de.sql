
-- Replace the open SELECT policy with one that hides admin_email from non-admins
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.buylist_settings;

CREATE POLICY "Users can read non-sensitive settings"
ON public.buylist_settings FOR SELECT TO authenticated
USING (
  key != 'admin_email'
  OR (auth.jwt() ->> 'email') = value
);
