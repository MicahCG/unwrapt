# 🚀 Quick Test Guide - Subscription Flow

## Before You Start

### 1. Development Server
Your dev server is already running at: **http://localhost:8080/**

### 2. Required: Deploy Edge Functions
```bash
# Deploy the subscription checkout function
npx supabase functions deploy create-subscription-checkout

# Deploy the webhook handler
npx supabase functions deploy stripe-webhook
```

### 3. Stripe Webhook Setup
Go to Stripe Dashboard → Developers → Webhooks

**Add Endpoint**:
- URL: `https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/stripe-webhook`
- Events to send:
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `invoice.payment_failed`
  - ✅ `customer.subscription.trial_will_end`

**Copy the webhook signing secret** and add to Supabase:
```bash
# Set the webhook secret in Supabase
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🧪 Testing Steps

### Step 1: Login
1. Open http://localhost:8080/
2. Login with your test account
3. You should see the dashboard

### Step 2: Check Current Status
- Look for subscription badge (should show "Free")
- Check console for user profile loading

### Step 3: Start Subscription Flow
1. Find and click "Upgrade to VIP" button
   - OR look for a Crown icon/VIP upgrade prompt
2. Modal should appear showing $4.99/month pricing
3. Click "Continue to Checkout"

### Step 4: Complete Payment (Test Mode)
You'll be redirected to Stripe Checkout

**Use test card**:
- Card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

Click "Pay"

### Step 5: Watch the Success Flow
After payment, you'll be redirected to the success page.

**Open Browser Console** (F12) to watch logs:
```
PaymentSuccess: URL params: {...}
PaymentSuccess: Verifying session: cs_test_...
PaymentSuccess: Polling subscription status...
PaymentSuccess: Poll attempt 1/5
PaymentSuccess: User is VIP, subscription confirmed via profile check
```

**You should see**:
- ✅ "Welcome to VIP!" message
- ✅ Confetti animation
- ✅ VIP benefits listed
- ✅ "Go to Dashboard" button

### Step 6: Verify in Dashboard
1. Click "Go to Dashboard"
2. Look for VIP badge
3. Check that free tier limitations are gone

---

## 🔍 Verification Checklist

### ✅ Frontend (Browser)
- [ ] Payment success page loads
- [ ] Success message appears within 1-10 seconds
- [ ] Confetti plays
- [ ] Console shows polling logs
- [ ] No error messages in console

### ✅ Stripe Dashboard
Go to: Stripe Dashboard → Payments

- [ ] Payment shows "Succeeded"
- [ ] Amount: $4.99
- [ ] Customer created
- [ ] Subscription created
- [ ] Customer has metadata: `supabase_user_id`

### ✅ Stripe Webhooks
Go to: Stripe Dashboard → Developers → Webhooks

- [ ] Event: `checkout.session.completed` delivered
- [ ] Status: Succeeded (200)
- [ ] Response: `{"received": true}`

### ✅ Database
Run in Supabase SQL Editor:
```sql
SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  trial_ends_at,
  updated_at
FROM profiles
WHERE email = 'YOUR_EMAIL'
ORDER BY updated_at DESC
LIMIT 1;
```

Expected:
- [ ] `subscription_tier` = `'vip'`
- [ ] `subscription_status` = `'active'` or `'trialing'`
- [ ] `updated_at` is recent

---

## 🐛 Common Issues & Solutions

### Issue: "Session Not Found" error
**Cause**: Webhook not configured or failed

**Fix**:
1. Check Stripe webhook is set up
2. Verify webhook secret in Supabase
3. Check webhook delivery in Stripe Dashboard

### Issue: Payment succeeds but no VIP status
**Cause**: Webhook might have failed

**Solutions**:
1. Check Stripe webhook delivery status
2. View edge function logs:
   ```bash
   npx supabase functions logs stripe-webhook
   ```
3. Manually check database (see query above)

### Issue: Infinite loading on success page
**Cause**: Webhook hasn't processed yet

**Solutions**:
1. Wait 10 seconds and refresh page
2. Check if webhook delivered in Stripe
3. Go directly to dashboard to check VIP status

### Issue: Redirect to wrong URL
**Cause**: Edge function has wrong success URL

**Fix**: ✅ Already fixed in this session
- Updated from `/payment-success` to `/payment/success`

---

## 📊 Expected Console Logs

### Successful Flow (With session_id):
```
PaymentSuccess: URL params: { sessionId: 'cs_test_...', ... }
PaymentSuccess: Verifying session: cs_test_...
PaymentSuccess: Polling subscription status after checkout...
PaymentSuccess: Starting subscription status polling...
PaymentSuccess: Poll attempt 1/5
PaymentSuccess: User is VIP, subscription confirmed via profile check
```

### Successful Flow (Without session_id):
```
PaymentSuccess: URL params: { sessionId: null, ... }
PaymentSuccess: No session_id, polling subscription status...
PaymentSuccess: Starting subscription status polling...
PaymentSuccess: Poll attempt 1/5
[waits 1 second]
PaymentSuccess: Poll attempt 2/5
[waits 2 seconds]
PaymentSuccess: User is VIP, subscription confirmed via profile check
```

---

## 🎯 What We Fixed Today

1. **Route Mismatch** ✅
   - Fixed success URL in `create-subscription-checkout`
   - Now correctly redirects to `/payment/success`

2. **Missing session_id Handling** ✅
   - Added polling mechanism to `PaymentSuccess.tsx`
   - Polls database 5 times with exponential backoff
   - Works for billing portal flows

3. **Improved UX** ✅
   - Better loading messages
   - Informative error messages
   - Console logging for debugging

---

## 🚀 Ready to Test!

1. Make sure dev server is running (it is!)
2. Deploy edge functions (see commands above)
3. Configure Stripe webhook (see instructions above)
4. Follow testing steps
5. Watch the magic happen! ✨

---

## 📞 Need Help?

If something doesn't work:
1. Check browser console for errors
2. Check Stripe Dashboard → Webhooks for delivery status
3. Check Supabase edge function logs
4. Verify database shows VIP status
5. Share the specific error message

Good luck! 🎉
