-- Fix RLS policies for recipients table to restrict access to authenticated users only
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own recipients" ON public.recipients;
DROP POLICY IF EXISTS "Users can delete their own recipients" ON public.recipients;
DROP POLICY IF EXISTS "Users can update their own recipients" ON public.recipients;
DROP POLICY IF EXISTS "Users can view their own recipients" ON public.recipients;

-- Create new policies that only apply to authenticated users
CREATE POLICY "Authenticated users can create their own recipients" 
ON public.recipients
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own recipients" 
ON public.recipients
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own recipients" 
ON public.recipients
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own recipients" 
ON public.recipients
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Also fix similar issues in other sensitive tables
-- Fix scheduled_gifts table policies
DROP POLICY IF EXISTS "Users can create their own scheduled gifts" ON public.scheduled_gifts;
DROP POLICY IF EXISTS "Users can view their own scheduled gifts" ON public.scheduled_gifts;
DROP POLICY IF EXISTS "Users can update their own scheduled gifts" ON public.scheduled_gifts;
DROP POLICY IF EXISTS "Users can delete their own scheduled gifts" ON public.scheduled_gifts;

CREATE POLICY "Authenticated users can create their own scheduled gifts" 
ON public.scheduled_gifts
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own scheduled gifts" 
ON public.scheduled_gifts
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own scheduled gifts" 
ON public.scheduled_gifts
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own scheduled gifts" 
ON public.scheduled_gifts
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix payments table policies
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

CREATE POLICY "Authenticated users can insert their own payments" 
ON public.payments
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own payments" 
ON public.payments
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own payments" 
ON public.payments
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can insert their own profile" 
ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Fix calendar_integrations table policies
DROP POLICY IF EXISTS "Users can create their own calendar integrations" ON public.calendar_integrations;
DROP POLICY IF EXISTS "Users can view their own calendar integrations" ON public.calendar_integrations;
DROP POLICY IF EXISTS "Users can update their own calendar integrations" ON public.calendar_integrations;
DROP POLICY IF EXISTS "Users can delete their own calendar integrations" ON public.calendar_integrations;

CREATE POLICY "Authenticated users can create their own calendar integrations" 
ON public.calendar_integrations
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their own calendar integrations" 
ON public.calendar_integrations
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own calendar integrations" 
ON public.calendar_integrations
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own calendar integrations" 
ON public.calendar_integrations
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);