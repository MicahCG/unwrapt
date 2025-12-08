# ✅ Pre-Test Checklist - Subscription Flow

## Before You Start Testing

### ✅ Completed
- [x] **Dev server running** - http://localhost:8080/
- [x] **Code fixes applied**
  - [x] Fixed route from `/payment-success` to `/payment/success`
  - [x] Added polling mechanism for missing session_id
  - [x] Updated verifyPayment to use polling
  - [x] Improved error messages and UX
- [x] **Build successful** - No TypeScript errors
- [x] **Documentation created**
  - [x] TESTING_SUMMARY.md
  - [x] QUICK_TEST_GUIDE.md
  - [x] SUBSCRIPTION_TEST_PLAN.md

### ⏳ Required Before Testing

#### 1. Deploy Edge Functions
```bash
# Make sure you're in the project directory
cd /Users/giraudelc/Downloads/Projects/Unwrapt/Code/unwrapt

# Login to Supabase (if not already)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref zxsswxzpzjimrrpcrrto

# Deploy the edge functions
npx supabase functions deploy create-subscription-checkout
npx supabase functions deploy stripe-webhook
```

**Expected output**:
```
Deploying function create-subscription-checkout...
✓ Deployed function create-subscription-checkout in X.XXs

Deploying function stripe-webhook...
✓ Deployed function stripe-webhook in X.XXs
```

#### 2. Configure Stripe Webhook

**Step 2a: Get Webhook URL**
```
https://zxsswxzpzjimrrpcrrto.supabase.co/functions/v1/stripe-webhook
```

**Step 2b: Add in Stripe Dashboard**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click: "Add endpoint"
3. Paste webhook URL
4. Click: "Select events"
5. Choose these events:
   - [x] `checkout.session.completed`
   - [x] `customer.subscription.updated`
   - [x] `customer.subscription.deleted`
   - [x] `invoice.payment_failed`
   - [x] `customer.subscription.trial_will_end`
6. Click: "Add endpoint"

**Step 2c: Get Signing Secret**
1. After creating endpoint, click to view it
2. Click: "Reveal" next to "Signing secret"
3. Copy the secret (starts with `whsec_`)

**Step 2d: Set Secret in Supabase**
```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

**Expected output**:
```
Finished supabase secrets set on project zxsswxzpzjimrrpcrrto.
```

#### 3. Verify Environment Variables

Check Supabase Dashboard → Project Settings → Edge Functions

Required secrets:
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (from step 2c)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-configured)

If missing STRIPE_SECRET_KEY:
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

---

## 🧪 Ready to Test?

### Quick Verification
Run this command to verify everything is set up:

```bash
# Check if functions are deployed
npx supabase functions list

# Should show:
# - create-subscription-checkout
# - stripe-webhook
# (among others)
```

### Test Payment Card
Use Stripe's test card for payments:
- **Card**: 4242 4242 4242 4242
- **Expiry**: Any future date (12/25)
- **CVC**: Any 3 digits (123)
- **ZIP**: Any 5 digits (12345)

---

## 🎯 Testing Flow

Once the above is complete:

1. **Open app**: http://localhost:8080/
2. **Login** to your test account
3. **Click** "Upgrade to VIP"
4. **Complete** payment with test card
5. **Watch** success page load
6. **Verify** VIP status in dashboard

**Expected time**: Payment → Success page → VIP confirmed = 2-10 seconds

---

## 🐛 Quick Debug Commands

If something doesn't work:

```bash
# View webhook function logs
npx supabase functions logs stripe-webhook --limit 20

# View checkout function logs
npx supabase functions logs create-subscription-checkout --limit 20

# Check if secrets are set
npx supabase secrets list
```

---

## 📊 Success Indicators

You'll know it's working when:
- ✅ Stripe shows payment succeeded
- ✅ Webhook delivers (200 response)
- ✅ Success page shows confetti
- ✅ Dashboard shows VIP badge
- ✅ Database has `subscription_tier = 'vip'`

---

## 🚀 Let's Test!

Once you've completed the "Required Before Testing" section above, you're ready to go!

**Start here**: Open `QUICK_TEST_GUIDE.md` for step-by-step testing instructions.

Good luck! 🎉
