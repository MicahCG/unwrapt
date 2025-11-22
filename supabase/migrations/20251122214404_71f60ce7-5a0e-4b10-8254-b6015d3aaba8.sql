-- Remove hard 3-recipient limit for free tier so DB can store unlimited recipients
-- This aligns with product decision to enforce limits only in the UI

-- Drop trigger enforcing recipient limit on recipients table
DROP TRIGGER IF EXISTS enforce_recipient_limit ON public.recipients;

-- Drop validation function (no longer needed)
DROP FUNCTION IF EXISTS public.validate_recipient_limit();
