-- The "Authenticated users can update their own profile" policy has no
-- WITH CHECK clause, so any signed-in user can currently change ANY column
-- on their own row via a plain client update, including subscription_tier,
-- subscription_status, trial_ends_at, gift_wallet_balance, and
-- stripe_payment_method_id - self-granting VIP access or wallet funds with
-- no payment. RLS WITH CHECK can't restrict individual columns, so this uses
-- a trigger instead, which fires regardless of RLS and is the standard
-- pattern for column-level write protection on Postgres/Supabase.
--
-- Legitimate server-side writes (Stripe webhook, admin tools, wallet-reload
-- functions) all run with the service_role key, which bypasses this check.
-- User-settable preference columns (auto_reload_enabled/threshold/amount,
-- default_gift_budget_min/max, autopilot_level, notification toggles, etc.)
-- are untouched and remain client-writable.

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.gift_wallet_balance IS DISTINCT FROM OLD.gift_wallet_balance
    OR NEW.stripe_payment_method_id IS DISTINCT FROM OLD.stripe_payment_method_id
  THEN
    RAISE EXCEPTION 'subscription, trial, wallet balance, and payment method fields can only be changed by the server';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_columns ON public.profiles;

CREATE TRIGGER protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();
