-- Update the calculate_user_metrics function to calculate time saved based on recipients with scheduled gifts
CREATE OR REPLACE FUNCTION public.calculate_user_metrics(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  recipient_count INTEGER;
  scheduled_count INTEGER;
  delivered_count INTEGER;
  recipients_with_gifts INTEGER;
  time_saved INTEGER;
BEGIN
  -- Count recipients
  SELECT COUNT(*) INTO recipient_count
  FROM public.recipients
  WHERE user_id = user_uuid;
  
  -- Count scheduled gifts
  SELECT COUNT(*) INTO scheduled_count
  FROM public.scheduled_gifts
  WHERE user_id = user_uuid;
  
  -- Count delivered gifts
  SELECT COUNT(*) INTO delivered_count
  FROM public.scheduled_gifts
  WHERE user_id = user_uuid AND status = 'delivered';
  
  -- Count recipients with scheduled gifts (unique recipients)
  SELECT COUNT(DISTINCT recipient_id) INTO recipients_with_gifts
  FROM public.scheduled_gifts
  WHERE user_id = user_uuid;
  
  -- Calculate estimated time saved (192 minutes = 3 hours 12 minutes per recipient with scheduled gifts)
  time_saved := recipients_with_gifts * 192;
  
  -- Upsert metrics
  INSERT INTO public.user_metrics (user_id, total_recipients, total_scheduled_gifts, total_delivered_gifts, estimated_time_saved)
  VALUES (user_uuid, recipient_count, scheduled_count, delivered_count, time_saved)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_recipients = EXCLUDED.total_recipients,
    total_scheduled_gifts = EXCLUDED.total_scheduled_gifts,
    total_delivered_gifts = EXCLUDED.total_delivered_gifts,
    estimated_time_saved = EXCLUDED.estimated_time_saved,
    last_calculated = now(),
    updated_at = now();
END;
$function$;