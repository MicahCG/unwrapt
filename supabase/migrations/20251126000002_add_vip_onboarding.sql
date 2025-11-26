-- Add VIP onboarding tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS vip_onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vip_onboarding_started_at timestamptz,
ADD COLUMN IF NOT EXISTS vip_onboarding_completed_at timestamptz;

-- Index for quickly finding users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_profiles_vip_onboarding
ON public.profiles(subscription_tier, vip_onboarding_completed)
WHERE subscription_tier = 'vip';

-- Comments
COMMENT ON COLUMN public.profiles.vip_onboarding_completed IS 'Whether user has completed VIP welcome onboarding flow';
COMMENT ON COLUMN public.profiles.vip_onboarding_started_at IS 'When user first saw VIP onboarding modal';
COMMENT ON COLUMN public.profiles.vip_onboarding_completed_at IS 'When user completed VIP onboarding';
