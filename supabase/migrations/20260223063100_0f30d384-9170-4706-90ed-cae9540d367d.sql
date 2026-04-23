
-- Drop the public SELECT policy on buylist_invites
DROP POLICY IF EXISTS "Anyone can read invites for validation" ON public.buylist_invites;

-- Only admin can read invites
CREATE POLICY "Admin can read invites"
ON public.buylist_invites
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) = (
    SELECT value FROM public.buylist_settings WHERE key = 'admin_email'
  )
);
