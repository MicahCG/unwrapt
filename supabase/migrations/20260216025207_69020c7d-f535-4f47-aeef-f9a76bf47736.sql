-- Add apartment/unit number column to recipients table
ALTER TABLE public.recipients ADD COLUMN IF NOT EXISTS apartment text DEFAULT NULL;