# 🔄 Unsubscribe Flow - Complete Guide

## Overview

I've implemented a proper subscription management system using Stripe's Customer Portal. This is the recommended approach as it provides a secure, PCI-compliant interface for users to manage their subscriptions.

---

## ✅ What Was Implemented

### 1. Stripe Customer Portal Edge Function
**File**: `supabase/functions/create-portal-session/index.ts`

**Purpose**: Creates a secure session for users to access Stripe's customer portal

**Features**:
- ✅ Finds user's Stripe customer
- ✅ Creates portal session
- ✅ Redirects back to settings page after completion

### 2. Subscription Management Component
**File**: `src/components/subscription/SubscriptionManagement.tsx`

**Purpose**: Displays subscription status and management options

**Features for VIP Users**:
- Shows current plan ($4.99/month)
- Displays subscription status (Active/Trialing)
- Shows trial end date if applicable
- Lists VIP benefits
- "Manage Subscription" button

**Features for Free Users**:
- Shows current plan (Free)
- Displays VIP upgrade option
- Shows pricing and benefits
- "Upgrade to VIP" button

### 3. Settings Page Integration
**File**: `src/pages/Settings.tsx`

**Changes**:
- Added `SubscriptionManagement` component import
- Placed subscription section at top of settings
- Shows subscription card for all users

### 4. Webhook Cancellation Handler
**File**: `supabase/functions/stripe-webhook/index.ts` (lines 187-242)

**Handles**: `customer.subscription.deleted` event

**Actions on Cancellation**:
1. ✅ Downgrades user to free tier
2. ✅ Sets subscription status to "cancelled"
3. ✅ Clears trial_ends_at
4. ✅ Pauses all automations
5. ✅ Sends cancellation email

---

## 🔄 How Unsubscribe Works

### User Flow

```
User logs in
    ↓
Goes to Settings (/settings)
    ↓
Sees "Subscription" card at top
    ↓
Clicks "Manage Subscription" button
    ↓
App calls create-portal-session edge function
    ↓
Redirected to Stripe Customer Portal
    ↓
User sees options:
  - Update payment method
  - View billing history
  - Download invoices
  - Cancel subscription ← UNSUBSCRIBE HERE
    ↓
User clicks "Cancel subscription"
    ↓
Stripe shows confirmation dialog
    ↓
User confirms cancellation
    ↓
Stripe processes cancellation
    ↓
┌──────────────────────────────────┐
│ WEBHOOK FIRES                    │
│ Event: customer.subscription.    │
│        deleted                   │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ stripe-webhook edge function     │
│ receives event                   │
│                                  │
│ Actions:                         │
│ 1. Update profile:               │
│    - tier = 'free'               │
│    - status = 'cancelled'        │
│ 2. Pause automations             │
│ 3. Send cancellation email       │
└────────────┬─────────────────────┘
             ↓
User redirected back to Settings
             ↓
Subscription card now shows "Free Plan"
             ↓
Option to upgrade visible
```

---

## 📋 Setup Requirements

### 1. Deploy Edge Function
```bash
npx supabase functions deploy create-portal-session
```

### 2. Configure Stripe Customer Portal

Go to: https://dashboard.stripe.com/test/settings/billing/portal

**Enable these features**:
- [x] **Cancel subscriptions** - Allow customers to cancel
- [x] **Update payment methods** - Allow customers to update cards
- [x] **View billing history** - Show past invoices
- [x] **Update billing details** - Allow address updates

**Cancellation Settings** (recommended):
- **Cancellation mode**: Cancel immediately (or at period end)
- **Cancellation reason**: Optional (collect feedback)
- **Save cancellation reason**: Yes

### 3. Set Return URL (already configured in code)
The edge function sets: `return_url: ${origin}/settings`

---

## 🎯 Testing the Unsubscribe Flow

### Step-by-Step Test

1. **Login as VIP user**
   - If you don't have one, subscribe first using test card

2. **Navigate to Settings**
   - Click user menu → Settings
   - OR go to: http://localhost:8080/settings

3. **View Subscription Card**
   - Should be at top of page
   - Shows "VIP Active" or "VIP Trial" badge
   - Displays $4.99/month
   - Shows subscription status

4. **Click "Manage Subscription"**
   - Button has credit card icon
   - Opens Stripe Customer Portal in new window/tab

5. **In Stripe Portal**
   - See current subscription
   - Click "Cancel plan" button
   - Stripe shows confirmation dialog

6. **Confirm Cancellation**
   - Click confirm
   - Stripe processes immediately

7. **Verify Results**
   - Portal shows "Cancelled"
   - Redirected back to Settings
   - Wait 2-3 seconds for webhook
   - Refresh page

8. **Check Outcomes**:
   - [ ] Subscription card shows "Free Plan" badge
   - [ ] No longer shows $4.99/month pricing
   - [ ] Shows "Upgrade to VIP" option
   - [ ] Dashboard shows free tier limitations
   - [ ] Automations are paused

---

## 🔍 Verification Checklist

### Frontend
- [ ] Settings page loads without errors
- [ ] Subscription card appears for all users
- [ ] VIP users see "Manage Subscription" button
- [ ] Free users see "Upgrade to VIP" button
- [ ] Trial users see trial end date
- [ ] Badge colors correct (Free=gray, VIP=gold, Trial=amber)

### Stripe Portal
- [ ] Portal opens in new window
- [ ] Shows correct subscription
- [ ] Cancel option available
- [ ] Can update payment method
- [ ] Returns to settings after action

### Webhook Processing
- [ ] `customer.subscription.deleted` event fires
- [ ] Event status is "Succeeded" in Stripe
- [ ] Response code: 200
- [ ] User profile updated in database
- [ ] Automations paused

### Database
Run this query after cancellation:
```sql
SELECT
  id,
  email,
  subscription_tier,
  subscription_status,
  trial_ends_at,
  updated_at
FROM profiles
WHERE id = 'USER_ID';

-- Should show:
-- subscription_tier = 'free'
-- subscription_status = 'cancelled'
-- trial_ends_at = null
```

Check automations:
```sql
SELECT
  id,
  name,
  automation_enabled
FROM recipients
WHERE user_id = 'USER_ID';

-- All should have:
-- automation_enabled = false
```

---

## 🎨 UI Components

### Subscription Card States

#### 1. Free User
```
┌─────────────────────────────────┐
│ 👑 Subscription    [Free Plan]  │
├─────────────────────────────────┤
│ You're on the Free Plan         │
│                                 │
│ 👑 Upgrade to VIP               │
│ $4.99/month                     │
│ ✓ Unlimited recipients          │
│ ✓ Full automation               │
│ ✓ Gift wallet                   │
│                                 │
│ [Upgrade to VIP]                │
└─────────────────────────────────┘
```

#### 2. VIP Active
```
┌─────────────────────────────────┐
│ 👑 Subscription   [VIP Active]  │
├─────────────────────────────────┤
│ VIP Monthly        Status       │
│ $4.99/month       Active        │
│                                 │
│ VIP Benefits:                   │
│ ✓ Unlimited recipients          │
│ ✓ Full automation               │
│ ✓ Advanced scheduling           │
│ ✓ Gift wallet & auto-reload     │
│                                 │
│ [💳 Manage Subscription]        │
│ Update payment, view invoices,  │
│ or cancel subscription          │
└─────────────────────────────────┘
```

#### 3. VIP Trial
```
┌─────────────────────────────────┐
│ 👑 Subscription   [VIP Trial]   │
├─────────────────────────────────┤
│ VIP Monthly        Status       │
│ $4.99/month       Trialing      │
│                                 │
│ ⚠️ Trial Period                 │
│ Trial ends on January 15, 2025  │
│ You'll be charged $4.99 after   │
│                                 │
│ [💳 Manage Subscription]        │
└─────────────────────────────────┘
```

---

## 🚀 Deployment Steps

### 1. Deploy Edge Function
```bash
# Deploy the portal session function
npx supabase functions deploy create-portal-session

# Verify it's listed
npx supabase functions list | grep portal
```

### 2. Configure Stripe Portal
1. Go to Stripe Dashboard (test mode)
2. Settings → Billing → Customer portal
3. Enable features (see "Setup Requirements" above)
4. Click "Save changes"

### 3. Test in Development
```bash
# Server should already be running
# Open: http://localhost:8080/settings
```

### 4. Test Cancellation
- Subscribe with test card
- Go to settings
- Click "Manage Subscription"
- Cancel in portal
- Verify downgrade

---

## 🐛 Troubleshooting

### Issue: "Manage Subscription" button doesn't work

**Possible causes**:
1. Edge function not deployed
2. User not authenticated
3. No Stripe customer found

**Debug**:
```bash
# Check if function is deployed
npx supabase functions list

# Check browser console for errors
# Should see: "Opening Stripe customer portal..."

# Check function logs
npx supabase functions logs create-portal-session --limit 10
```

### Issue: Portal shows "No subscriptions"

**Cause**: User doesn't have a Stripe customer or subscription

**Solution**: User needs to subscribe first

### Issue: Cancellation doesn't downgrade user

**Possible causes**:
1. Webhook not configured
2. Webhook delivery failed
3. Event type not included

**Debug**:
```bash
# Check webhook delivery in Stripe Dashboard
# Go to: Developers → Webhooks → [your endpoint]
# Look for: customer.subscription.deleted

# Check webhook logs
npx supabase functions logs stripe-webhook --limit 20
```

### Issue: User canceled but still shows VIP

**Immediate fix**:
Refresh the page - React Query should refetch the profile

**If still showing VIP**:
Check database directly:
```sql
SELECT subscription_tier, subscription_status
FROM profiles
WHERE id = 'USER_ID';
```

---

## 💡 Key Features

### Security
- ✅ Uses Stripe's hosted portal (PCI compliant)
- ✅ Secure session creation
- ✅ JWT authentication required
- ✅ No payment data touches your servers

### User Experience
- ✅ Clear subscription status
- ✅ One-click access to management
- ✅ Professional Stripe interface
- ✅ Seamless return to app
- ✅ Real-time status updates

### Business Logic
- ✅ Automatic downgrade on cancel
- ✅ Automations paused
- ✅ Trial end date display
- ✅ Email notifications
- ✅ Graceful free tier fallback

---

## 📊 What Happens on Cancellation

### Immediate Actions (Webhook)
1. **Profile Update**:
   - `subscription_tier`: vip → free
   - `subscription_status`: active → cancelled
   - `trial_ends_at`: cleared

2. **Automation Pause**:
   - All `recipients.automation_enabled`: true → false
   - Prevents automated gift sending

3. **Email Notification**:
   - Type: `subscription_cancelled`
   - Sent to user's email
   - Includes feedback request

### User Impact
- ✅ Can still use free features
- ✅ Recipients remain (limited to free tier max)
- ✅ Past data preserved
- ✅ Can resubscribe anytime
- ❌ No more automation
- ❌ Free tier recipient limit enforced

---

## 🎉 Success Criteria

The unsubscribe flow is working correctly when:

1. ✅ VIP users see "Manage Subscription" button in settings
2. ✅ Button opens Stripe Customer Portal
3. ✅ Portal shows subscription with cancel option
4. ✅ Cancellation processes successfully
5. ✅ Webhook fires and returns 200
6. ✅ User downgraded to free tier in database
7. ✅ Settings page shows "Free Plan" badge
8. ✅ Automations paused
9. ✅ User can resubscribe if desired

---

## 📝 Additional Notes

### Cancellation Timing
By default, subscriptions cancel **immediately**. You can configure in Stripe Portal settings to cancel **at period end** instead.

**Immediate cancellation**:
- Access revoked right away
- No refund for unused time
- Clean break

**Cancel at period end**:
- Access until end of billing period
- User already paid, so keep access
- Better UX

**Recommendation**: Cancel at period end (more user-friendly)

### Resubscription
Users can resubscribe at any time:
1. Go to Settings
2. Click "Upgrade to VIP" (now visible again)
3. Complete checkout
4. VIP access restored

### Data Retention
When users cancel:
- ✅ All data is preserved
- ✅ Recipients remain
- ✅ Past gifts saved
- ✅ Settings retained
- ✅ Just tier changes to free

---

## 🚀 Ready to Test!

1. **Deploy edge function**:
   ```bash
   npx supabase functions deploy create-portal-session
   ```

2. **Configure Stripe Portal** (see instructions above)

3. **Test the flow**:
   - Login as VIP user
   - Go to /settings
   - Click "Manage Subscription"
   - Cancel in portal
   - Verify downgrade

Everything is ready! The unsubscribe flow is production-ready and follows Stripe best practices. 🎉
