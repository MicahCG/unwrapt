
-- Add notification preference columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS savings_alerts boolean NOT NULL DEFAULT true;
