-- Releases of pending holds use status = 'cancelled'. The original check only
-- allowed pending/completed/failed, so swap/unreserve updates were rejected.
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_status_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]));
