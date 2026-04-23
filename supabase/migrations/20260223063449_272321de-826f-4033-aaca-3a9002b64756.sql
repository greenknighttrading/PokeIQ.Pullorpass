
-- Atomic trigger: increment use_count on buylist_invites when access is inserted
CREATE OR REPLACE FUNCTION public.increment_invite_use_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE buylist_invites
  SET use_count = use_count + 1
  WHERE code = NEW.invite_code
    AND is_active = true
    AND (max_uses IS NULL OR use_count < max_uses);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite code is invalid, inactive, or has reached its maximum uses';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_invite_before_access
  BEFORE INSERT ON public.buylist_access
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_invite_use_count();

-- Also tighten the RLS INSERT policy to validate invite at DB level
DROP POLICY IF EXISTS "Users can insert own access" ON public.buylist_access;

CREATE POLICY "Users can insert own access"
ON public.buylist_access FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM buylist_invites
    WHERE code = invite_code
      AND is_active = true
      AND (max_uses IS NULL OR use_count < max_uses)
  )
);
