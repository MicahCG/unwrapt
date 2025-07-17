-- Fix RLS policy for user_metrics insert/upsert operations
DROP POLICY IF EXISTS "Users can create their own metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON public.user_metrics;

-- Create comprehensive policies for user_metrics table
CREATE POLICY "Enable insert for service role and users" ON public.user_metrics
FOR INSERT TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "Enable update for service role and users" ON public.user_metrics  
FOR UPDATE TO authenticated, service_role
USING (true);