-- Add automation-related columns to recipients table
ALTER TABLE public.recipients
ADD COLUMN IF NOT EXISTS relationship text,
ADD COLUMN IF NOT EXISTS interests text[],
ADD COLUMN IF NOT EXISTS preferred_gift_style text CHECK (preferred_gift_style IN ('practical', 'luxury', 'handmade', 'experience', NULL));

-- Add comprehensive automation columns to scheduled_gifts table
ALTER TABLE public.scheduled_gifts
ADD COLUMN IF NOT EXISTS gift_variant_id text,
ADD COLUMN IF NOT EXISTS estimated_cost decimal(10,2),
ADD COLUMN IF NOT EXISTS delivery_date date,
ADD COLUMN IF NOT EXISTS address_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_token text UNIQUE,
ADD COLUMN IF NOT EXISTS confirmation_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS shipping_address jsonb,
ADD COLUMN IF NOT EXISTS shopify_order_id text,
ADD COLUMN IF NOT EXISTS shopify_tracking_number text,
ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
ADD COLUMN IF NOT EXISTS paused_reason text,
ADD COLUMN IF NOT EXISTS archived_at timestamptz,
ADD COLUMN IF NOT EXISTS occasion_type text DEFAULT 'birthday' CHECK (occasion_type IN ('birthday', 'anniversary', 'custom'));

-- Add status column if it doesn't exist
ALTER TABLE public.scheduled_gifts
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'funds_reserved', 'address_requested', 'address_confirmed', 'fulfilled', 'paused', 'archived'));

-- Create performance indexes for automation queries
CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_occasion_date
ON public.scheduled_gifts(occasion_date)
WHERE automation_enabled = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_automation_stage
ON public.scheduled_gifts(automation_enabled, wallet_reserved, address_confirmed_at, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_status
ON public.scheduled_gifts(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_delivery_date
ON public.scheduled_gifts(delivery_date)
WHERE automation_enabled = true;

CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_confirmation_token
ON public.scheduled_gifts(confirmation_token)
WHERE confirmation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recipients_interests
ON public.recipients USING GIN(interests)
WHERE interests IS NOT NULL;

-- Function to calculate delivery date (3 days before occasion for shipping)
CREATE OR REPLACE FUNCTION public.calculate_delivery_date(occasion_date date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN occasion_date - INTERVAL '3 days';
END;
$$;

-- Function to get gifts needing action at specific stage
CREATE OR REPLACE FUNCTION public.get_gifts_at_stage(
  stage_name text,
  days_before integer
)
RETURNS TABLE (
  gift_id uuid,
  user_id uuid,
  recipient_id uuid,
  recipient_name text,
  occasion_date date,
  gift_description text,
  estimated_cost decimal
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sg.id as gift_id,
    sg.user_id,
    sg.recipient_id,
    r.name as recipient_name,
    sg.occasion_date,
    sg.gift_description,
    sg.estimated_cost
  FROM scheduled_gifts sg
  JOIN recipients r ON r.id = sg.recipient_id
  WHERE sg.automation_enabled = true
    AND sg.occasion_date = CURRENT_DATE + (days_before || ' days')::interval
    AND CASE stage_name
      WHEN 'reserve_funds' THEN sg.wallet_reserved = false
      WHEN 'request_address' THEN sg.wallet_reserved = true AND sg.address_requested_at IS NULL
      WHEN 'send_reminder' THEN sg.address_requested_at IS NOT NULL AND sg.address_confirmed_at IS NULL AND sg.address_reminder_sent < 2
      WHEN 'escalation' THEN sg.wallet_reserved = true AND sg.address_confirmed_at IS NULL
      WHEN 'cleanup' THEN sg.status NOT IN ('fulfilled', 'archived')
      ELSE false
    END;
END;
$$;

-- Function to validate gift automation eligibility
CREATE OR REPLACE FUNCTION public.can_enable_automation(
  p_user_id uuid,
  p_gift_cost decimal
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_available_balance decimal;
  v_tier text;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- Check subscription tier
  v_tier := COALESCE(v_profile.subscription_tier, 'free');

  IF v_tier = 'free' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'subscription_required',
      'message', 'Automation is a VIP feature. Upgrade to enable.'
    );
  END IF;

  -- Get available balance
  v_available_balance := public.get_available_balance(p_user_id);

  IF v_available_balance < p_gift_cost THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'insufficient_funds',
      'message', 'Add funds to your wallet to enable automation',
      'available_balance', v_available_balance,
      'required_amount', p_gift_cost,
      'shortfall', p_gift_cost - v_available_balance
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'available_balance', v_available_balance
  );
END;
$$;

-- Update subscription tier check to include 'vip'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_subscription_tier_check
CHECK (subscription_tier IN ('free', 'vip', 'premium', 'premium_annual'));

-- Comment on new columns
COMMENT ON COLUMN public.recipients.relationship IS 'Relationship type: spouse, parent, friend, etc.';
COMMENT ON COLUMN public.recipients.interests IS 'Array of interest tags for gift personalization';
COMMENT ON COLUMN public.recipients.preferred_gift_style IS 'Preferred gift style: practical, luxury, handmade, experience';

COMMENT ON COLUMN public.scheduled_gifts.gift_variant_id IS 'Shopify product variant ID';
COMMENT ON COLUMN public.scheduled_gifts.estimated_cost IS 'Expected cost when automation was enabled';
COMMENT ON COLUMN public.scheduled_gifts.delivery_date IS 'Target delivery date (3 days before occasion)';
COMMENT ON COLUMN public.scheduled_gifts.confirmation_token IS 'Secure token for address confirmation link';
COMMENT ON COLUMN public.scheduled_gifts.shipping_address IS 'Confirmed shipping address as JSONB';
COMMENT ON COLUMN public.scheduled_gifts.shopify_order_id IS 'Shopify order ID after fulfillment';
COMMENT ON COLUMN public.scheduled_gifts.paused_reason IS 'Reason why automation was paused (insufficient_funds, no_address, etc.)';
