-- Fix user_metrics RLS policies - restrict to owner-only access
-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Enable insert for service role and users" ON user_metrics;
DROP POLICY IF EXISTS "Enable update for service role and users" ON user_metrics;

-- Service role needs full access for calculate_user_metrics() function
CREATE POLICY "Service role has full access to user metrics"
ON user_metrics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users cannot directly insert metrics (only via service role/functions)
CREATE POLICY "Users cannot insert metrics directly"
ON user_metrics
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Users cannot update metrics directly (only via service role/functions)
CREATE POLICY "Users cannot update metrics directly"
ON user_metrics
FOR UPDATE
TO authenticated
USING (false);

-- Enable RLS on notification_queue table
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Service role needs full access for processing notifications
CREATE POLICY "Service role has full access to notifications"
ON notification_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view their own notifications based on email
CREATE POLICY "Users can view their own notifications"
ON notification_queue
FOR SELECT
TO authenticated
USING (
  user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);