# Subscription Flow - Complete Test Plan

## Test Execution Date
December 8, 2025

---

## 📋 Pre-Test Checklist

### Edge Functions Deployed
Check that these edge functions are deployed to Supabase:
- [ ] `create-subscription-checkout`
- [ ] `stripe-webhook`
- [ ] `verify-payment` (for gift payments, not subscriptions)

**How to verify**:
```bash
# List all deployed functions
npx supabase functions list
```

### Stripe Configuration
- [ ] Stripe Secret Key configured in Supabase environment
- [ ] Stripe Webhook Secret configured in Supabase environment
- [ ] Webhook endpoint configured in Stripe Dashboard

**Webhook URL**:
```
https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/stripe-webhook
```

**Required Webhook Events** (configure in Stripe Dashboard):
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_failed`
- ✅ `customer.subscription.trial_will_end`

### Environment Variables
- [x] `VITE_SUPABASE_URL` - ✅ Configured
- [x] `VITE_SUPABASE_PUBLISHABLE_KEY` - ✅ Configured
- [x] `VITE_SUPABASE_PROJECT_ID` - ✅ Configured

---

## 🔍 Code Verification Results

### ✅ Issues Fixed in This Session

#### 1. Route Mismatch (FIXED)
**File**: `supabase/functions/create-subscription-checkout/index.ts:94`
- **Before**: `success_url: ${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`
- **After**: `success_url: ${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`
- **Why**: App routing uses `/payment/success` not `/payment-success`

#### 2. Missing session_id Handling (FIXED)
**File**: `src/pages/PaymentSuccess.tsx`
- **Added**: `pollSubscriptionStatus()` function with exponential backoff
- **Polls**: Up to 5 times (1s, 2s, 3s, 4s intervals)
- **Purpose**: Detects when Stripe webhook has upgraded user to VIP
- **Handles**: Billing portal flows where session_id is missing

### ✅ Component Flow Verification

#### Frontend → Stripe Checkout
```
User clicks "Upgrade to VIP"
  ↓
VIPUpgradeModal.tsx (line 29)
  ↓
Calls: create-subscription-checkout edge function
  ↓
Edge function creates Stripe session
  ↓
Returns: { sessionId, url }
  ↓
Browser redirects to Stripe Checkout
```

#### Stripe → Webhook → Database
```
User completes payment
  ↓
Stripe fires: checkout.session.completed
  ↓
Webhook received at: stripe-webhook edge function
  ↓
Extracts: supabase_user_id from metadata
  ↓
Updates profiles table:
  - subscription_tier = 'vip'
  - subscription_status = 'active' or 'trialing'
  - trial_ends_at = timestamp (if trial)
```

#### Stripe → Redirect → Success Page
```
Payment complete
  ↓
Stripe redirects to: /payment/success?session_id={ID}
  ↓
PaymentSuccess.tsx loads
  ↓
If session_id exists:
  - Calls verify-payment (not used for subscriptions)
  - Shows success message

If session_id missing:
  - Polls database for VIP status
  - Detects webhook processing
  - Shows success when VIP confirmed
```

---

## 🧪 Test Scenarios

### Test 1: Normal Subscription Flow (Primary Path)

**Steps**:
1. [ ] Open app at http://localhost:8080/
2. [ ] Login with test account
3. [ ] Verify current tier is "free"
4. [ ] Click "Upgrade to VIP" button
5. [ ] Verify modal shows $4.99/month pricing
6. [ ] Click "Continue to Checkout"
7. [ ] Browser redirects to Stripe Checkout
8. [ ] Use Stripe test card: `4242 4242 4242 4242`
9. [ ] Complete payment form
10. [ ] Click "Pay"

**Expected Results**:
- [ ] Redirected to `/payment/success?session_id=cs_test_...`
- [ ] PaymentSuccess page shows "Verifying Payment..."
- [ ] Within 2-3 seconds: Success message appears
- [ ] Confetti animation plays
- [ ] VIP benefits list displayed
- [ ] Console shows: "User is VIP, subscription confirmed"

**Database Verification**:
```sql
SELECT subscription_tier, subscription_status, trial_ends_at, updated_at
FROM profiles
WHERE id = 'YOUR_USER_ID';
```
Expected: `subscription_tier = 'vip'`, `subscription_status = 'active'`

**Stripe Verification**:
- [ ] Check Stripe Dashboard → Payments
- [ ] Verify payment succeeded
- [ ] Check subscription created
- [ ] Verify customer metadata has `supabase_user_id`

---

### Test 2: Webhook Processing (Backend Verification)

**Steps**:
1. [ ] After completing Test 1 payment
2. [ ] Go to Stripe Dashboard → Developers → Webhooks
3. [ ] Click on webhook endpoint for your app
4. [ ] Find the `checkout.session.completed` event
5. [ ] Click to view event details

**Expected Results**:
- [ ] Event shows "Succeeded" status
- [ ] Response code: 200
- [ ] Response body: `{"received": true}`
- [ ] Event data includes metadata with `supabase_user_id`

**Supabase Logs**:
```bash
# View edge function logs (if using Supabase CLI)
npx supabase functions logs stripe-webhook --limit 10
```

Expected log messages:
- [ ] "🎣 Processing Stripe webhook"
- [ ] "📨 Webhook event type: checkout.session.completed"
- [ ] "✅ Checkout completed for user: [user-id]"
- [ ] "✅ User [user-id] upgraded to VIP"

---

### Test 3: Payment Success Without session_id (New Polling Feature)

**Steps**:
1. [ ] Complete a subscription payment
2. [ ] After Stripe redirects, manually remove `session_id` from URL
3. [ ] Navigate to: `http://localhost:8080/payment/success` (no params)
4. [ ] Watch console logs

**Expected Results**:
- [ ] Page shows "Verifying Payment..."
- [ ] Console logs polling attempts:
  - "PaymentSuccess: No session_id, polling subscription status..."
  - "PaymentSuccess: Poll attempt 1/5"
  - "PaymentSuccess: User is VIP, subscription confirmed"
- [ ] Success message appears (may take 1-10 seconds)
- [ ] Confetti plays
- [ ] VIP benefits displayed

---

### Test 4: Dashboard VIP Status Display

**Steps**:
1. [ ] After successful subscription
2. [ ] Click "Go to Dashboard" button
3. [ ] Observe dashboard

**Expected Results**:
- [ ] VIP badge visible near user menu
- [ ] Crown icon (👑) displayed
- [ ] Subscription badge shows "VIP" or "VIP (Trial)"
- [ ] Free tier limitations removed
- [ ] VIP onboarding modal may appear (if first time VIP)

---

### Test 5: Subscription Cancellation

**Steps**:
1. [ ] In Stripe Dashboard, find the subscription
2. [ ] Cancel the subscription
3. [ ] Wait for webhook to process

**Expected Results**:
- [ ] Webhook fires: `customer.subscription.deleted`
- [ ] User downgraded to free tier
- [ ] All automations paused
- [ ] Console shows: "🚫 Subscription cancelled for user"

**Database Verification**:
```sql
SELECT subscription_tier, subscription_status
FROM profiles
WHERE id = 'YOUR_USER_ID';

SELECT automation_enabled
FROM recipients
WHERE user_id = 'YOUR_USER_ID';
```
Expected:
- `subscription_tier = 'free'`, `subscription_status = 'cancelled'`
- All `automation_enabled = false`

---

## 🐛 Debugging Checklist

If payment succeeds but app doesn't show VIP:

### Check 1: Webhook Received?
- [ ] Go to Stripe Dashboard → Webhooks
- [ ] Verify event delivered successfully
- [ ] Check response code (should be 200)

### Check 2: Edge Function Logs
```bash
npx supabase functions logs stripe-webhook --limit 20
```
Look for error messages

### Check 3: Database Updated?
```sql
SELECT * FROM profiles WHERE id = 'YOUR_USER_ID';
```
Check if `subscription_tier` updated

### Check 4: Environment Variables
```bash
# In Supabase Dashboard → Settings → Edge Functions
```
Verify:
- [ ] STRIPE_SECRET_KEY is set
- [ ] STRIPE_WEBHOOK_SECRET is set
- [ ] SUPABASE_SERVICE_ROLE_KEY is set

### Check 5: Browser Console
- [ ] Open DevTools → Console
- [ ] Look for PaymentSuccess logs
- [ ] Check for polling messages
- [ ] Verify API calls succeeded

---

## 📊 Success Criteria

### ✅ All Tests Pass When:
1. [ ] Payment completes successfully in Stripe
2. [ ] Stripe logs show payment succeeded
3. [ ] Webhook delivers successfully (200 response)
4. [ ] Database shows `subscription_tier = 'vip'`
5. [ ] User sees success page with confetti
6. [ ] Dashboard shows VIP badge
7. [ ] Polling works when session_id missing
8. [ ] Cancellation downgrades user correctly

---

## 🚀 Deployment Steps

Before deploying to production:

1. [ ] Test all scenarios in Stripe test mode
2. [ ] Deploy edge functions:
   ```bash
   npx supabase functions deploy create-subscription-checkout
   npx supabase functions deploy stripe-webhook
   ```
3. [ ] Configure webhook in Stripe Dashboard (production mode)
4. [ ] Set production environment variables in Supabase
5. [ ] Update Stripe price IDs to production values
6. [ ] Test with real card (small amount first)
7. [ ] Verify webhook delivers in production
8. [ ] Monitor logs for first few production payments

---

## 📝 Notes

### Known Limitations
- `verify-payment` edge function is for gift payments, not subscriptions
- Subscriptions rely entirely on webhook processing
- Polling adds 1-10 second delay when session_id missing

### Performance
- Normal flow (with session_id): Instant verification
- Webhook flow (without session_id): 1-10 seconds polling
- Webhook processing: < 1 second typically

### Security
- All edge functions use JWT verification where needed
- Stripe webhooks verified with signing secret
- User authentication required for checkout creation
- Metadata includes `supabase_user_id` for tracking

---

## ✅ Test Execution Summary

**Tested By**: _____________
**Date**: _____________
**Environment**: [ ] Local [ ] Staging [ ] Production
**Stripe Mode**: [ ] Test [ ] Live

**Overall Result**: [ ] PASS [ ] FAIL

**Issues Found**:
_____________________________________________________________
_____________________________________________________________

**Next Steps**:
_____________________________________________________________
_____________________________________________________________
