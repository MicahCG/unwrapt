-- Durable marker for where a signed-in user left agent onboarding.
-- Client-writable preference column (not privileged); used with early
-- recipient drafts so relaunch can resume intel/reveal instead of
-- cold-starting calendar scan.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step text
  CHECK (
    onboarding_step IS NULL
    OR onboarding_step IN (
      'import',
      'found',
      'addperson',
      'intel',
      'reveal',
      'subscription',
      'done'
    )
  );

COMMENT ON COLUMN public.profiles.onboarding_step IS
  'Agent onboarding progress: intel/reveal resume mid-flow; subscription/done → paywall.';
