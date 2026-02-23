-- Update delivery date calculation to account for CJ Dropshipping ~2.5 week shipping time
-- Orders placed 21 days before occasion, arrives ~3 days before
CREATE OR REPLACE FUNCTION public.calculate_delivery_date(occasion_date date)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN occasion_date - INTERVAL '3 days';
END;
$$;