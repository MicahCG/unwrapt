-- Additive columns to support Goody-based order placement and fulfillment,
-- alongside the existing Shopify-sourced columns (left intact for historical
-- order records; new gifts write to the goody_* columns instead).

ALTER TABLE public.scheduled_gifts
  ADD COLUMN IF NOT EXISTS goody_order_id text,
  ADD COLUMN IF NOT EXISTS goody_tracking_number text;

ALTER TABLE public.recipients
  ADD COLUMN IF NOT EXISTS default_gift_goody_product_id text;
