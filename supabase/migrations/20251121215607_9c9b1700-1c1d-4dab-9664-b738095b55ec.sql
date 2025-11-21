-- Update subscription_tier constraint to allow 'vip' tier
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier = ANY (ARRAY['free'::text, 'premium'::text, 'premium_annual'::text, 'vip'::text]));