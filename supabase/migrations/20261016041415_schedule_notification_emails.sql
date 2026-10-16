-- Schedule the two new notification-preference-gated email jobs.
-- Mirrors the existing process-automation-lifecycle-daily cron job.

-- Occasion reminders: daily, 7 days before a recipient's birthday/anniversary.
SELECT cron.schedule(
  'send-occasion-reminders-daily',
  '0 13 * * *', -- Every day at 1 PM UTC
  $$
  SELECT net.http_post(
    url:='https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/send-occasion-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4c3N3eHpwemppbXJycGNycnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzUxNzQsImV4cCI6MjA2Mzg1MTE3NH0.ibhP9oc8-zV7NGwrGU7t2HVWn6esdl2qtWBosPGgvEc"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- Gift tips: weekly, Monday 2 PM UTC.
SELECT cron.schedule(
  'send-gift-tips-weekly',
  '0 14 * * 1',
  $$
  SELECT net.http_post(
    url:='https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/send-gift-tips',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4c3N3eHpwemppbXJycGNycnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzUxNzQsImV4cCI6MjA2Mzg1MTE3NH0.ibhP9oc8-zV7NGwrGU7t2HVWn6esdl2qtWBosPGgvEc"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);
