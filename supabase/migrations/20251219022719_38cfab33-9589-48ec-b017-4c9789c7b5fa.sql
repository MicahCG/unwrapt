-- Fix function search_path for all functions that don't have it set

-- update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- calculate_delivery_date function
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

-- check_upcoming_gift_events function
CREATE OR REPLACE FUNCTION public.check_upcoming_gift_events()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recipient_record RECORD;
  occasion_type TEXT;
  occasion_date DATE;
BEGIN
  -- Find all recipients with birthdays or anniversaries exactly 7 days away
  FOR recipient_record IN
    SELECT 
      r.id as recipient_id,
      r.name as recipient_name,
      r.birthday,
      r.anniversary,
      p.email as user_email,
      p.full_name as user_name
    FROM public.recipients r
    JOIN public.profiles p ON r.user_id = p.id
    WHERE 
      (DATE(r.birthday) = CURRENT_DATE + INTERVAL '7 days' 
       OR DATE(r.anniversary) = CURRENT_DATE + INTERVAL '7 days')
  LOOP
    -- Determine which occasion is coming up
    IF DATE(recipient_record.birthday) = CURRENT_DATE + INTERVAL '7 days' THEN
      occasion_type := 'Birthday';
      occasion_date := recipient_record.birthday;
    ELSE
      occasion_type := 'Anniversary';
      occasion_date := recipient_record.anniversary;
    END IF;
    
    -- Insert into notification queue instead of making HTTP call
    INSERT INTO public.notification_queue (
      notification_type,
      recipient_name,
      occasion_type,
      occasion_date,
      user_email,
      user_name,
      status
    ) VALUES (
      'upcoming_event_reminder',
      recipient_record.recipient_name,
      occasion_type,
      occasion_date,
      recipient_record.user_email,
      recipient_record.user_name,
      'pending'
    );
    
  END LOOP;
END;
$$;

-- get_products_by_vibe_and_budget function
CREATE OR REPLACE FUNCTION public.get_products_by_vibe_and_budget(p_vibe gift_vibe, p_max_price numeric)
RETURNS SETOF products
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.products
  WHERE gift_vibe = p_vibe
    AND price <= p_max_price
    AND active = true
    AND available_for_sale = true
  ORDER BY rank ASC, price ASC;
$$;

-- get_house_essentials function
CREATE OR REPLACE FUNCTION public.get_house_essentials(p_max_price numeric DEFAULT 100)
RETURNS SETOF products
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.products
  WHERE gift_vibe = 'CALM_COMFORT'
    AND price <= p_max_price
    AND active = true
    AND available_for_sale = true
  ORDER BY rank ASC, price ASC
  LIMIT 3;
$$;