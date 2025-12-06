-- Drop the problematic policies on automation_logs
DROP POLICY IF EXISTS "Service role has full access to automation logs" ON public.automation_logs;
DROP POLICY IF EXISTS "Users can view their own automation logs" ON public.automation_logs;

-- Create proper PERMISSIVE policy for authenticated users only
CREATE POLICY "Users can view their own automation logs"
ON public.automation_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create INSERT policy for authenticated users
CREATE POLICY "Users can insert their own automation logs"
ON public.automation_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);