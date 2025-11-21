-- Create reusable function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add subscription tier and wallet columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'premium_annual')),
  ADD COLUMN subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trial')),
  ADD COLUMN trial_ends_at timestamptz,
  ADD COLUMN gift_wallet_balance decimal(10,2) DEFAULT 0.00 CHECK (gift_wallet_balance >= 0),
  ADD COLUMN wallet_auto_reload boolean DEFAULT false,
  ADD COLUMN wallet_reload_threshold decimal(10,2) DEFAULT 50.00 CHECK (wallet_reload_threshold >= 0),
  ADD COLUMN wallet_reload_amount decimal(10,2) DEFAULT 100.00 CHECK (wallet_reload_amount >= 0);

-- Update scheduled_gifts table with automation columns
ALTER TABLE public.scheduled_gifts
  ADD COLUMN automation_enabled boolean DEFAULT false,
  ADD COLUMN wallet_reserved boolean DEFAULT false,
  ADD COLUMN wallet_reservation_amount decimal(10,2),
  ADD COLUMN address_requested_at timestamptz,
  ADD COLUMN address_reminder_sent integer DEFAULT 0 CHECK (address_reminder_sent >= 0);

-- Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'reservation', 'charge', 'refund', 'auto_reload')),
  amount decimal(10,2) NOT NULL,
  balance_after decimal(10,2) NOT NULL CHECK (balance_after >= 0),
  scheduled_gift_id uuid REFERENCES public.scheduled_gifts(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_transactions
CREATE POLICY "Users can view their own wallet transactions"
  ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet transactions"
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to wallet transactions"
  ON public.wallet_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_scheduled_gift_id ON public.wallet_transactions(scheduled_gift_id);

-- Create function to validate recipient limits based on subscription tier
CREATE OR REPLACE FUNCTION public.validate_recipient_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_count INTEGER;
  user_tier TEXT;
BEGIN
  -- Get the user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Count existing recipients for this user
  SELECT COUNT(*) INTO recipient_count
  FROM public.recipients
  WHERE user_id = NEW.user_id;
  
  -- Check if limit is exceeded for free tier
  IF user_tier = 'free' AND recipient_count >= 3 THEN
    RAISE EXCEPTION 'Free tier limited to 3 recipients. Upgrade to premium for unlimited recipients.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce recipient limits
CREATE TRIGGER enforce_recipient_limit
  BEFORE INSERT ON public.recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_recipient_limit();

-- Create trigger for wallet_transactions updated_at
CREATE TRIGGER update_wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();