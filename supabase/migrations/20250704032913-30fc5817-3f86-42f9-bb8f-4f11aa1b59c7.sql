-- Add gift_image_url field to scheduled_gifts table to store actual product images
ALTER TABLE public.scheduled_gifts 
ADD COLUMN gift_image_url TEXT;