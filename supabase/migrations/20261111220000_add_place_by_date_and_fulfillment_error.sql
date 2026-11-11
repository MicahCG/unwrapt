-- Additive: place-by date for the ordering job, plus a visible fulfillment error.
-- place_by_date = occasion_date - (shipping lead days + 3 day arrival buffer).
-- Default lead is 21 days when a gift has no per-item lead (same as Thea).
-- Safe to re-run: new columns use IF NOT EXISTS, and the backfill only fills blanks
-- on gifts that have not been ordered or closed.

ALTER TABLE public.scheduled_gifts
  ADD COLUMN IF NOT EXISTS shipping_lead_days integer,
  ADD COLUMN IF NOT EXISTS place_by_date date,
  ADD COLUMN IF NOT EXISTS fulfillment_error text,
  ADD COLUMN IF NOT EXISTS fulfillment_error_at timestamptz;

COMMENT ON COLUMN public.scheduled_gifts.place_by_date IS
  'Day the automation job should place the order: occasion minus shipping lead minus 3-day arrival buffer.';
COMMENT ON COLUMN public.scheduled_gifts.fulfillment_error IS
  'Latest automatic-order failure, cleared when the order is placed. Shown in the wallet and gift progress.';

UPDATE public.scheduled_gifts
SET
  shipping_lead_days = COALESCE(shipping_lead_days, 21),
  place_by_date = COALESCE(
    place_by_date,
    (occasion_date - ((COALESCE(shipping_lead_days, 21) + 3) * INTERVAL '1 day'))::date
  )
WHERE place_by_date IS NULL
  AND occasion_date IS NOT NULL
  AND goody_order_id IS NULL
  AND COALESCE(lower(status), '') NOT IN (
    'cancelled', 'canceled', 'expired', 'delivered', 'ordered', 'shipped', 'fulfilled'
  );

CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_place_by
  ON public.scheduled_gifts (place_by_date)
  WHERE place_by_date IS NOT NULL AND goody_order_id IS NULL;
