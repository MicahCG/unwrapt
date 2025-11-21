-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule automation lifecycle processing to run daily at 9 AM UTC
SELECT cron.schedule(
  'process-automation-lifecycle-daily',
  '0 9 * * *', -- Every day at 9 AM UTC
  $$
  SELECT net.http_post(
    url:='https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/process-automation-lifecycle',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4c3N3eHpwemppbXJycGNycnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzUxNzQsImV4cCI6MjA2Mzg1MTE3NH0.ibhP9oc8-zV7NGwrGU7t2HVWn6esdl2qtWBosPGgvEc"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);