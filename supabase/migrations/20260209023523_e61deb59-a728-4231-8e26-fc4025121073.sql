
-- Drop the existing overly broad and incorrectly configured policies
DROP POLICY IF EXISTS "Service role has full access to notifications" ON public.notification_queue;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notification_queue;

-- Create a proper PERMISSIVE SELECT policy so users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notification_queue
FOR SELECT
TO authenticated
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Prevent any direct INSERT/UPDATE/DELETE from regular users
-- Only edge functions using the service role should write to this table
CREATE POLICY "No direct insert for users"
ON public.notification_queue
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct update for users"
ON public.notification_queue
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct delete for users"
ON public.notification_queue
FOR DELETE
TO authenticated
USING (false);
