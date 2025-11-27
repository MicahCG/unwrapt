# Email Automation Deployment Guide

## Overview

Your complete email notification system is now set up! This guide will walk you through deploying it to production.

## What's Been Implemented

### 📧 Email Types

1. **Automation Flow Emails:**
   - `automation_enabled` - Sent when user enables automation
   - `funds_reserved` - Sent when funds are reserved (14 days before)
   - `gift_confirmed_with_address` - Address exists, gift processing
   - `gift_confirmed_need_address` - Needs address confirmation
   - `address_confirmation_request` - Requesting address (10 days before)
   - `address_confirmation_reminder` - Reminder after 3 days
   - `address_escalation` - Urgent notice (24 hours before)
   - `gift_sent` - Gift shipped successfully
   - `gift_expired` - Gift expired without fulfillment

2. **Wallet & Support Emails:**
   - `low_wallet_balance` - Insufficient funds warning
   - `auto_reload_failed` - Auto-reload attempt failed
   - `automation_failed` - General automation error

3. **Legacy Emails** (kept for backward compatibility):
   - `recipient_added`
   - `gift_scheduled`

### ⏰ Cron Job Schedule

- **Daily at 9 AM UTC**: Runs `process-automation-lifecycle`
  - Checks all automated gifts
  - Sends appropriate emails based on gift stage
  - Handles fund reservations, address requests, and fulfillment

### 🎨 Email Features

- Beautiful branded templates with Unwrapt colors (#D2B887)
- Gift product images included
- Call-to-action buttons (Confirm Address, Modify Gift, etc.)
- Mobile-responsive design
- Two-state confirmation system (with/without address)

## Deployment Steps

### 1. Deploy Supabase Functions

```bash
# Navigate to your project root
cd /Users/giraudelc/Downloads/Projects/Unwrapt/Code/unwrapt

# Deploy the updated email function
npx supabase functions deploy send-notification-email

# Deploy the automation lifecycle function
npx supabase functions deploy process-automation-lifecycle
```

### 2. Verify Environment Variables

Make sure these are set in your Supabase project settings:

```bash
# Required for emails
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Already configured (verify they exist)
SHOPIFY_ACCESS_TOKEN=xxxxx
SHOPIFY_STORE_URL=xxxxx
STRIPE_SECRET_KEY=xxxxx
```

To check/set environment variables:
1. Go to https://supabase.com/dashboard/project/zxsswxzpzjimrrpcrrto
2. Navigate to Settings → Edge Functions → Secrets
3. Verify `RESEND_API_KEY` exists

### 3. Apply Database Migrations

The cron job migration is already in your migrations folder. To apply it (if not already applied):

```bash
# Run all pending migrations
npx supabase db push
```

This will set up the daily cron job at 9 AM UTC.

### 4. Verify Cron Job is Running

After deployment, check if the cron job is scheduled:

```sql
-- Run this query in your Supabase SQL Editor
SELECT * FROM cron.job WHERE jobname = 'process-automation-lifecycle-daily';
```

You should see one row showing the schedule `0 9 * * *` (daily at 9 AM UTC).

### 5. Test the Email System

#### Option A: Use the Dev Panel (Recommended for Testing)

1. Add test funds to your wallet using the Developer Testing panel
2. Enable automation for a recipient
3. Click "Run Automation Lifecycle Now" to manually trigger processing
4. Check your email for notifications

#### Option B: Test Individual Email Types

```javascript
// Call from browser console or use Supabase Functions testing
await supabase.functions.invoke('send-notification-email', {
  body: {
    type: 'automation_enabled',
    recipientEmail: 'your-email@example.com',
    userName: 'Test User',
    data: {
      recipientName: 'John Doe',
      occasion: 'Birthday',
      amount: 50
    }
  }
});
```

### 6. Update Production URLs

In `send-notification-email/index.ts`, update the app URL on line 62:

```typescript
const appUrl = "https://unwrapt.com"; // Change to your actual domain
```

Then redeploy:
```bash
npx supabase functions deploy send-notification-email
```

### 7. Monitor Email Delivery

#### Check Resend Dashboard:
1. Go to https://resend.com/emails
2. Verify emails are being sent successfully
3. Check delivery rates and opens

#### Check Supabase Logs:
```bash
# View function logs
npx supabase functions logs send-notification-email
npx supabase functions logs process-automation-lifecycle
```

## Adjusting the Cron Schedule

If you want to change when the automation runs (currently 9 AM UTC):

### Create a new migration:
```bash
npx supabase migration new update_cron_schedule
```

### Add this SQL:
```sql
-- Unschedule the old job
SELECT cron.unschedule('process-automation-lifecycle-daily');

-- Schedule with new time (example: 10 AM UTC)
SELECT cron.schedule(
  'process-automation-lifecycle-daily',
  '0 10 * * *', -- Minute Hour Day Month DayOfWeek
  $$
  SELECT net.http_post(
    url:='https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/process-automation-lifecycle',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4c3N3eHpwemppbXJycGNycnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNzUxNzQsImV4cCI6MjA2Mzg1MTE3NH0.ibhP9oc8-zV7NGwrGU7t2HVWn6esdl2qtWBosPGgvEc"}'::jsonb,
    body:='{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);
```

### Apply the migration:
```bash
npx supabase db push
```

## Common Cron Patterns

- `0 9 * * *` - Daily at 9 AM
- `0 */6 * * *` - Every 6 hours
- `0 9,21 * * *` - At 9 AM and 9 PM
- `*/30 * * * *` - Every 30 minutes
- `0 9 * * 1-5` - Weekdays at 9 AM

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key:**
   ```bash
   # Test the key
   curl -X POST 'https://api.resend.com/emails' \
     -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"from":"test@unwrapt.com","to":"your-email@test.com","subject":"Test","html":"Test"}'
   ```

2. **Check Function Logs:**
   ```bash
   npx supabase functions logs send-notification-email --tail
   ```

3. **Verify Email Domain:**
   - Go to Resend dashboard
   - Make sure `unwrapt.com` is verified
   - Update the `from` address if using a different domain

### Cron Job Not Running

1. **Verify Extension is Enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. **Check Cron Job Status:**
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobname = 'process-automation-lifecycle-daily'
   ORDER BY start_time DESC
   LIMIT 10;
   ```

3. **Manually Trigger:**
   ```bash
   npx supabase functions invoke process-automation-lifecycle
   ```

### Gifts Not Auto-Confirming

1. **Verify Migration Applied:**
   ```sql
   SELECT * FROM scheduled_gifts
   WHERE automation_enabled = true
   LIMIT 5;
   ```
   Check that `address_confirmed_at` is being set.

2. **Check Recipient Address Data:**
   ```sql
   SELECT name, street, city, state, zip_code, country
   FROM recipients
   WHERE id = 'recipient-id';
   ```

3. **Run Manual Trigger:**
   Use the "Run Automation Lifecycle Now" button in dev panel

## Email Customization

To customize email content, edit:
`/supabase/functions/send-notification-email/index.ts`

Key functions:
- `getEmailSubject()` - Email subject lines
- `getEmailContent()` - HTML templates
- `getBaseEmailStyles()` - CSS styling
- `formatDate()` - Date formatting

After making changes:
```bash
npx supabase functions deploy send-notification-email
```

## Monitoring Best Practices

1. **Set up Resend Webhooks** to track:
   - Email delivery
   - Bounces
   - Opens and clicks

2. **Monitor Automation Logs:**
   ```sql
   SELECT * FROM automation_logs
   ORDER BY created_at DESC
   LIMIT 100;
   ```

3. **Check Wallet Transactions:**
   ```sql
   SELECT * FROM wallet_transactions
   WHERE transaction_type = 'reservation'
   AND status = 'pending';
   ```

## Next Steps

1. ✅ Deploy functions to production
2. ✅ Verify cron job is running
3. ✅ Test with real data
4. ✅ Monitor email delivery
5. 🎯 Set up Resend webhooks (optional)
6. 🎯 Add custom tracking/analytics (optional)

## Support

- **Resend Docs:** https://resend.com/docs
- **Supabase Cron:** https://supabase.com/docs/guides/database/extensions/pg_cron
- **Supabase Functions:** https://supabase.com/docs/guides/functions

---

**Ready to go live! 🚀**

All code is in place. Just run the deployment commands above and you're set!
