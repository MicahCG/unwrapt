-- Add auto-reload columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_reload_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reload_threshold numeric DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS auto_reload_amount numeric DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;

-- Add automation columns to recipients table
ALTER TABLE public.recipients
ADD COLUMN IF NOT EXISTS default_gift_variant_id text,
ADD COLUMN IF NOT EXISTS automation_enabled boolean DEFAULT false;

-- Add default_gift_variant_id to scheduled_gifts table
ALTER TABLE public.scheduled_gifts
ADD COLUMN IF NOT EXISTS default_gift_variant_id text;

-- Create automation_logs table for tracking lifecycle events
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid REFERENCES public.recipients(id) ON DELETE CASCADE,
  scheduled_gift_id uuid REFERENCES public.scheduled_gifts(id) ON DELETE CASCADE,
  stage text NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on automation_logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_logs
CREATE POLICY "Users can view their own automation logs"
ON public.automation_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to automation logs"
ON public.automation_logs FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_automation_logs_user_id ON public.automation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_scheduled_gift_id ON public.automation_logs(scheduled_gift_id);
CREATE INDEX IF NOT EXISTS idx_recipients_automation ON public.recipients(user_id, automation_enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_automation ON public.scheduled_gifts(recipient_id, automation_enabled, delivery_date);

-- Function to check and trigger auto-reload
CREATE OR REPLACE FUNCTION public.check_auto_reload(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_available_balance numeric;
  v_pending_reservations numeric;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calculate pending reservations
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_pending_reservations
  FROM public.wallet_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'reservation'
    AND status = 'pending';

  -- Calculate available balance
  v_available_balance := COALESCE(v_profile.gift_wallet_balance, 0) - v_pending_reservations;

  -- Check if auto-reload should trigger
  IF v_profile.auto_reload_enabled = true 
     AND v_available_balance < v_profile.auto_reload_threshold THEN
    
    RETURN jsonb_build_object(
      'should_reload', true,
      'available_balance', v_available_balance,
      'threshold', v_profile.auto_reload_threshold,
      'reload_amount', v_profile.auto_reload_amount,
      'payment_method_id', v_profile.stripe_payment_method_id
    );
  END IF;

  RETURN jsonb_build_object(
    'should_reload', false,
    'available_balance', v_available_balance
  );
END;
$$;

-- Function to get available wallet balance
CREATE OR REPLACE FUNCTION public.get_available_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_pending_reservations numeric;
BEGIN
  -- Get current balance
  SELECT COALESCE(gift_wallet_balance, 0) INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id;

  -- Get pending reservations
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_pending_reservations
  FROM public.wallet_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'reservation'
    AND status = 'pending';

  RETURN v_balance - v_pending_reservations;
END;
$$;