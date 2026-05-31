-- Tighten collector_similarity: not used by client; restrict access to service role only
DROP POLICY IF EXISTS "Users read own neighbors" ON public.collector_similarity;
REVOKE SELECT ON public.collector_similarity FROM authenticated, anon;

-- Tighten buylist_settings: split admin_email reads from non-sensitive settings
DROP POLICY IF EXISTS "Users can read non-sensitive settings" ON public.buylist_settings;

CREATE POLICY "Authenticated can read non-admin settings"
ON public.buylist_settings
FOR SELECT
TO authenticated
USING (key <> 'admin_email');

CREATE POLICY "Only admin can read admin_email"
ON public.buylist_settings
FOR SELECT
TO authenticated
USING (key = 'admin_email' AND (auth.jwt() ->> 'email') = value);