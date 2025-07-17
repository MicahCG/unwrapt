-- Add unique constraint on user_id for user_metrics table to fix the ON CONFLICT error
ALTER TABLE public.user_metrics ADD CONSTRAINT user_metrics_user_id_unique UNIQUE (user_id);