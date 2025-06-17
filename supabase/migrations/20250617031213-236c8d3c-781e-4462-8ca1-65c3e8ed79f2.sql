
-- Add individual address columns to the recipients table
ALTER TABLE public.recipients 
ADD COLUMN IF NOT EXISTS street text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'United States';

-- Update any existing recipients that have address data in the JSONB column
UPDATE public.recipients 
SET 
  street = address->>'street',
  city = address->>'city', 
  state = address->>'state',
  zip_code = address->>'zipCode',
  country = COALESCE(address->>'country', 'United States')
WHERE address IS NOT NULL;

-- We can keep the address JSONB column for backward compatibility
-- but the individual columns will be the primary way to store address data
