-- Remove the recipient limit trigger that blocks free users from adding >3 recipients
-- We want to allow storage of unlimited recipients, but limit UI interaction for free tier

DROP TRIGGER IF EXISTS validate_recipient_limit_trigger ON public.recipients;

-- Keep the function for potential future use, but don't use it as a trigger
-- The UI will handle showing only 3 recipients for free users while allowing all to be stored