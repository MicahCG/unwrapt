-- Add unique constraint for recipient_id and occasion_date
-- This allows upsert operations when enabling automation
ALTER TABLE public.scheduled_gifts
ADD CONSTRAINT scheduled_gifts_recipient_occasion_unique
UNIQUE (recipient_id, occasion_date);

-- This ensures one automated gift per recipient per occasion date
COMMENT ON CONSTRAINT scheduled_gifts_recipient_occasion_unique
ON public.scheduled_gifts
IS 'Ensures only one automated gift per recipient per occasion date';
