
CREATE TABLE public.pullorpass_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email text,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_pullorpass_referrals_referrer ON public.pullorpass_referrals(referrer_id);
CREATE UNIQUE INDEX idx_pullorpass_referrals_referred_user ON public.pullorpass_referrals(referred_user_id) WHERE referred_user_id IS NOT NULL;

GRANT SELECT ON public.pullorpass_referrals TO authenticated;
GRANT ALL ON public.pullorpass_referrals TO service_role;

ALTER TABLE public.pullorpass_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own outgoing referrals"
  ON public.pullorpass_referrals
  FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid());
