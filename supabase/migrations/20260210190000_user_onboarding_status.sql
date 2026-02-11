-- Onboarding tour completion state (one row per user, for auto-run and skip tracking)
CREATE TABLE IF NOT EXISTS public.user_onboarding_status (
  user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tutorial_completed boolean NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_skipped_at TIMESTAMPTZ,
  tour_auto_run_at TIMESTAMPTZ,
  last_seen_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_status_tutorial_completed ON public.user_onboarding_status(tutorial_completed);

ALTER TABLE public.user_onboarding_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_onboarding_select_own" ON public.user_onboarding_status;
CREATE POLICY "user_onboarding_select_own"
  ON public.user_onboarding_status FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_onboarding_insert_own" ON public.user_onboarding_status;
CREATE POLICY "user_onboarding_insert_own"
  ON public.user_onboarding_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_onboarding_update_own" ON public.user_onboarding_status;
CREATE POLICY "user_onboarding_update_own"
  ON public.user_onboarding_status FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
