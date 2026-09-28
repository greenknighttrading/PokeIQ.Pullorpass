CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_streaks TO authenticated;
GRANT ALL ON public.user_streaks TO service_role;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own streak" ON public.user_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_daily_activity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'America/New_York')::date;
  r public.user_streaks;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.user_streaks WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks(user_id, current_streak, longest_streak, last_active_date)
    VALUES (uid, 1, 1, today) RETURNING * INTO r;
  ELSIF r.last_active_date = today THEN
    NULL;
  ELSE
    UPDATE public.user_streaks SET
      current_streak = CASE WHEN r.last_active_date = today - 1 THEN r.current_streak + 1 ELSE 1 END,
      longest_streak = GREATEST(r.longest_streak, CASE WHEN r.last_active_date = today - 1 THEN r.current_streak + 1 ELSE 1 END),
      last_active_date = today, updated_at = now()
    WHERE user_id = uid RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('current', r.current_streak, 'longest', r.longest_streak, 'last_active_date', r.last_active_date);
END $$;
REVOKE ALL ON FUNCTION public.record_daily_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_daily_activity() TO authenticated;