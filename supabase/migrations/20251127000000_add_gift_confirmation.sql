-- Add gift_confirmed_at to track when user/system confirms the gift is ready to proceed
ALTER TABLE public.scheduled_gifts
ADD COLUMN IF NOT EXISTS gift_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wallet_reservation_date TIMESTAMPTZ;

-- Add index for querying pending confirmations
CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_pending_confirmation
ON public.scheduled_gifts(wallet_reserved, gift_confirmed_at, automation_enabled)
WHERE wallet_reserved = true AND gift_confirmed_at IS NULL AND automation_enabled = true;

COMMENT ON COLUMN public.scheduled_gifts.gift_confirmed_at IS 'Timestamp when user or system confirmed the gift is ready to proceed with purchase';
COMMENT ON COLUMN public.scheduled_gifts.wallet_reservation_date IS 'Timestamp when wallet funds were reserved for this gift';
