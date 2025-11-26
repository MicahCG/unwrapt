# Unwrapt Automation Flow - Complete Specification

## Database Schema Status

### ✅ Already Implemented
- `wallet_transactions` table (with all required columns)
- `automation_logs` table (lifecycle event tracking)
- `scheduled_gifts` automation columns:
  - `automation_enabled`
  - `wallet_reserved`
  - `wallet_reservation_amount`
  - `address_requested_at`
  - `address_reminder_sent`
- Performance indexes on all key columns
- Auto-reload system in profiles table

---

## 1. VIP User States & Wallet Balance

### Wallet Balance Display

**Location:** Dashboard top section, always visible for VIP users

**Display States:**

```
┌─────────────────────────────────────┐
│  💰 Gift Wallet: $127.50           │
│  ⚡ Covers 3 upcoming gifts          │
│  [Add Funds]                        │
└─────────────────────────────────────┘
```

**Calculation Logic:**
```typescript
availableBalance = gift_wallet_balance - pendingReservations
coverageCount = Math.floor(availableBalance / averageGiftCost)
averageGiftCost = $35-45 (based on default variants)
```

**States:**
1. **Sufficient Balance** (`balance >= $100`)
   - Green indicator
   - Shows coverage: "Covers X upcoming gifts"
   - No CTA needed

2. **Low Balance** (`balance $25-$100`)
   - Yellow indicator
   - Warning: "Low balance - Covers X gifts"
   - Soft CTA: "Add Funds"

3. **Critical Balance** (`balance < $25`)
   - Red indicator
   - Alert: "Add funds to enable automation"
   - Strong CTA: "Add Funds Now"
   - Automation disabled for new gifts

4. **Zero Balance** (`balance === $0`)
   - Empty state
   - "Add funds to start automating gifts"
   - Primary CTA: "Add $100"

---

## 2. Gift Selection Strategy

### Philosophy
**Pre-select high-quality defaults, allow customization later**

### Default Gift Selection Logic

**When automation is enabled for a recipient:**

1. **Check if user has set a default gift** for this recipient
   - `recipients.default_gift_variant_id` (if exists)
   - Use that variant

2. **If no default, use occasion-based selection:**
   ```typescript
   if (occasion === 'birthday') {
     defaultVariant = getVariantFromCollection('birthday-favorites')
   } else if (occasion === 'anniversary') {
     defaultVariant = getVariantFromCollection('anniversary-gifts')
   } else {
     defaultVariant = getVariantFromCollection('all-occasion')
   }
   ```

3. **Price tier selection based on relationship:**
   ```typescript
   if (recipient.relationship === 'spouse' || recipient.relationship === 'partner') {
     priceRange = '$50-$75'
   } else if (recipient.relationship === 'parent' || recipient.relationship === 'child') {
     priceRange = '$40-$60'
   } else {
     priceRange = '$30-$45' // default
   }
   ```

4. **Store selection in `scheduled_gifts`:**
   ```sql
   INSERT INTO scheduled_gifts (
     user_id,
     recipient_id,
     gift_variant_id,  -- Shopify variant ID
     gift_description,  -- Product name
     estimated_cost,
     automation_enabled,
     occasion_date
   )
   ```

### Gift Collection Structure (Shopify)

**Collections to create:**
- `unwrapt-birthday-favorites` - Top 20 birthday gifts
- `unwrapt-anniversary-gifts` - Top 15 anniversary gifts
- `unwrapt-all-occasion` - 25 versatile gifts
- `unwrapt-premium` - $75+ luxury gifts
- `unwrapt-budget` - $25-35 thoughtful gifts

**Each product needs:**
- Clear primary image
- Short description (2-3 sentences)
- Price variants if applicable
- Inventory tracking enabled

---

## 3. Recipient Interests - When & How

### Option A: Ask During Onboarding (RECOMMENDED)
**When:** After calendar sync, before dashboard

**Flow:**
```
Calendar Synced ✅
  ↓
"We found 5 recipients!"
  ↓
"Tell us a bit about each person (optional)"
  ↓
For each recipient:
  - Name: [Pre-filled]
  - Relationship: [Dropdown: Spouse, Parent, Friend, etc.]
  - Interests: [Multi-select chips]
    • Coffee & Tea
    • Cooking
    • Reading
    • Outdoors
    • Wellness
    • Tech
    • Art & Decor
  - [Skip] or [Save & Next]
  ↓
Dashboard
```

**Benefits:**
- Captures context early
- Higher completion rate (user is engaged)
- Better default gift selection from day 1

**Store in:**
```sql
ALTER TABLE recipients
ADD COLUMN relationship text,
ADD COLUMN interests text[]; -- Array of interest tags
```

### Option B: Ask When Enabling Automation
**When:** User clicks "Enable Automation" toggle

**Flow:**
```
Click "Enable Automation"
  ↓
Modal: "Let's personalize gifts for [Name]"
  ↓
  - Relationship: [Dropdown]
  - Interests: [Chips]
  - Preferred gift style:
    • Practical
    • Luxury
    • Handmade
    • Experience
  ↓
Show recommended gift + price
"We'll reserve $42 for [Product Name]"
  ↓
[Confirm] → Automation enabled
```

**Benefits:**
- Just-in-time context collection
- Shows direct value (recommended gift)
- User understands what they're automating

### Recommended Approach: HYBRID
1. **Onboarding:** Ask for relationship + 1-2 top interests (quick, optional)
2. **Automation Enable:** Show recommended gift, allow refinement

---

## 4. Automation Lifecycle - Complete Flow

### Stage 0: Automation Enabled
**Trigger:** User toggles automation ON for recipient

**Actions:**
1. Check wallet balance:
   ```typescript
   const availableBalance = await getAvailableBalance(userId)
   const giftCost = selectedVariant.price

   if (availableBalance < giftCost) {
     show 'Insufficient Funds' modal
     prompt 'Add Funds' or 'Enable Auto-Reload'
     return
   }
   ```

2. Create scheduled gift:
   ```sql
   INSERT INTO scheduled_gifts (
     user_id,
     recipient_id,
     gift_variant_id,
     gift_description,
     estimated_cost,
     occasion_type,
     occasion_date,
     automation_enabled,
     delivery_date  -- occasion_date minus 3 days for shipping
   ) VALUES (...)
   ```

3. Log event:
   ```sql
   INSERT INTO automation_logs (
     user_id,
     recipient_id,
     scheduled_gift_id,
     stage,
     action,
     details
   ) VALUES (
     user_id,
     recipient_id,
     gift_id,
     'automation_enabled',
     'user_toggled_on',
     jsonb_build_object(
       'gift_variant_id', variant_id,
       'estimated_cost', cost,
       'occasion_date', date
     )
   )
   ```

4. Send confirmation email:
   ```
   Subject: "✅ Automation enabled for [Recipient]'s [Occasion]"
   Body:
   - Shows selected gift + image
   - Confirms date and cost
   - Explains timeline: "We'll handle everything 14 days before"
   - CTA: "Manage Automations"
   ```

---

### Stage 1: Reserve Funds (14 Days Before)
**Trigger:** Daily cron job at 6 AM UTC

**Query:**
```sql
SELECT sg.*
FROM scheduled_gifts sg
WHERE sg.automation_enabled = true
  AND sg.wallet_reserved = false
  AND sg.occasion_date = CURRENT_DATE + INTERVAL '14 days'
  AND sg.delivery_date >= CURRENT_DATE + INTERVAL '10 days'
```

**Actions:**
1. For each gift:
   ```typescript
   // Check available balance
   const available = await getAvailableBalance(userId)

   if (available < gift.estimated_cost) {
     // Try auto-reload if enabled
     const profile = await getProfile(userId)

     if (profile.auto_reload_enabled) {
       await triggerAutoReload(userId)
       await waitForReloadCompletion(30) // 30 sec timeout

       // Re-check balance
       const newBalance = await getAvailableBalance(userId)
       if (newBalance < gift.estimated_cost) {
         await handleInsufficientFunds(gift)
         continue
       }
     } else {
       await handleInsufficientFunds(gift)
       continue
     }
   }

   // Reserve funds
   await createTransaction({
     user_id: userId,
     transaction_type: 'reservation',
     amount: -gift.estimated_cost,
     balance_after: available - gift.estimated_cost,
     scheduled_gift_id: gift.id,
     status: 'pending'
   })

   // Update gift
   await updateGift(gift.id, {
     wallet_reserved: true,
     wallet_reservation_amount: gift.estimated_cost
   })

   // Log
   await logAutomation({
     stage: 'funds_reserved',
     action: 'reservation_created',
     details: { amount: gift.estimated_cost }
   })

   // Email user
   await sendEmail({
     template: 'funds_reserved',
     data: {
       recipient: recipient.name,
       occasion: gift.occasion_type,
       date: gift.occasion_date,
       amount: gift.estimated_cost,
       gift: gift.gift_description
     }
   })
   ```

---

### Stage 2: Request Address (10 Days Before)
**Trigger:** Daily cron job at 6 AM UTC

**Query:**
```sql
SELECT sg.*, r.*
FROM scheduled_gifts sg
JOIN recipients r ON r.id = sg.recipient_id
WHERE sg.automation_enabled = true
  AND sg.wallet_reserved = true
  AND sg.address_requested_at IS NULL
  AND sg.occasion_date = CURRENT_DATE + INTERVAL '10 days'
```

**Actions:**
1. Generate secure confirmation token:
   ```typescript
   const token = generateSecureToken() // JWT or UUID

   await updateGift(gift.id, {
     address_requested_at: new Date(),
     confirmation_token: token,
     confirmation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
   })
   ```

2. Send address confirmation email:
   ```
   To: user@email.com
   Subject: "📬 Confirm shipping address for [Recipient]'s gift"

   Body:
   - "We're preparing [Gift Name] for [Recipient]"
   - "Confirm the shipping address by [Date]"
   - Current address on file (if exists):
     [Street]
     [City, State ZIP]
   - CTA Button: "Confirm Address" → /gifts/confirm-address/{token}
   - Or: "Update Address" if different
   ```

3. Log event:
   ```sql
   INSERT INTO automation_logs (stage, action, details) VALUES (
     'address_requested',
     'email_sent',
     jsonb_build_object('token', token, 'expires_at', expires_at)
   )
   ```

---

### Stage 3: Send Reminder (7 Days Before)
**Trigger:** Daily cron job at 6 AM UTC

**Query:**
```sql
SELECT sg.*, r.*
FROM scheduled_gifts sg
JOIN recipients r ON r.id = sg.recipient_id
WHERE sg.automation_enabled = true
  AND sg.wallet_reserved = true
  AND sg.address_requested_at IS NOT NULL
  AND sg.address_confirmed_at IS NULL
  AND sg.occasion_date = CURRENT_DATE + INTERVAL '7 days'
  AND sg.address_reminder_sent < 2  -- Max 2 reminders
```

**Actions:**
1. Send reminder email:
   ```
   Subject: "⏰ Reminder: Confirm address for [Recipient]'s [Occasion]"

   Body:
   - "Just checking in! We need the shipping address by [Date]"
   - "This gift will be sent in 4 days"
   - CTA: "Confirm Now" → /gifts/confirm-address/{token}
   ```

2. Increment reminder counter:
   ```sql
   UPDATE scheduled_gifts
   SET address_reminder_sent = address_reminder_sent + 1
   WHERE id = gift_id
   ```

3. Log:
   ```sql
   INSERT INTO automation_logs (stage, action) VALUES (
     'address_reminder',
     'email_sent'
   )
   ```

---

### Stage 4: Fulfill Order (After Address Confirmed)
**Trigger:** User submits address via confirmation link

**Flow:**
```typescript
// 1. User clicks link, lands on /gifts/confirm-address/:token
// 2. Validate token
const gift = await validateConfirmationToken(token)
if (!gift) return error('Link expired or invalid')

// 3. Show pre-filled form
<AddressConfirmationForm
  recipientName={gift.recipient.name}
  currentAddress={gift.recipient.address}
  onSubmit={handleConfirm}
/>

// 4. On submit:
async function handleConfirm(addressData) {
  // Update recipient address
  await updateRecipient(gift.recipient_id, addressData)

  // Mark gift as address confirmed
  await updateGift(gift.id, {
    address_confirmed_at: new Date(),
    shipping_address: addressData
  })

  // Immediately trigger fulfillment
  await fulfillGiftOrder(gift.id)
}

// 5. Fulfillment process:
async function fulfillGiftOrder(giftId) {
  const gift = await getGift(giftId)
  const recipient = await getRecipient(gift.recipient_id)

  // Create Shopify order
  const shopifyOrder = await shopify.createOrder({
    line_items: [{
      variant_id: gift.gift_variant_id,
      quantity: 1
    }],
    shipping_address: gift.shipping_address,
    customer: {
      first_name: recipient.name.split(' ')[0],
      last_name: recipient.name.split(' ')[1] || '',
      email: recipient.email || user.email
    },
    note: `Automated gift from Unwrapt - Occasion: ${gift.occasion_type}`
  })

  // Charge reserved funds
  await createTransaction({
    user_id: gift.user_id,
    transaction_type: 'charge',
    amount: -gift.wallet_reservation_amount,
    balance_after: currentBalance - gift.wallet_reservation_amount,
    scheduled_gift_id: gift.id,
    status: 'completed'
  })

  // Update profile balance
  await updateProfile(gift.user_id, {
    gift_wallet_balance: newBalance
  })

  // Update gift status
  await updateGift(gift.id, {
    status: 'fulfilled',
    shopify_order_id: shopifyOrder.id,
    shopify_tracking_number: shopifyOrder.tracking_number,
    fulfilled_at: new Date()
  })

  // Log
  await logAutomation({
    stage: 'gift_fulfilled',
    action: 'order_created',
    details: {
      shopify_order_id: shopifyOrder.id,
      tracking: shopifyOrder.tracking_number,
      amount_charged: gift.wallet_reservation_amount
    }
  })

  // Email user with tracking
  await sendEmail({
    template: 'gift_sent',
    data: {
      recipient: recipient.name,
      gift: gift.gift_description,
      tracking_number: shopifyOrder.tracking_number,
      tracking_url: shopifyOrder.tracking_url,
      estimated_delivery: shopifyOrder.estimated_delivery
    }
  })
}
```

---

### Stage 5: Escalation (24 Hours Before)
**Trigger:** Daily cron job at 6 AM UTC

**Query:**
```sql
SELECT sg.*, r.*
FROM scheduled_gifts sg
JOIN recipients r ON r.id = sg.recipient_id
WHERE sg.automation_enabled = true
  AND sg.wallet_reserved = true
  AND sg.address_confirmed_at IS NULL
  AND sg.occasion_date = CURRENT_DATE + INTERVAL '1 day'
  AND sg.status = 'pending'
```

**Actions:**
1. Send urgent email:
   ```
   Subject: "🚨 URGENT: Address needed for [Recipient]'s gift (1 day left)"

   Body:
   - "We need the shipping address immediately"
   - "Without it, we'll have to pause automation and refund reserved funds"
   - CTA: "Confirm Address Now"
   ```

2. Refund reserved funds after 12 hours:
   ```typescript
   setTimeout(async () => {
     const gift = await getGift(giftId)

     if (!gift.address_confirmed_at) {
       // Refund reservation
       await createTransaction({
         transaction_type: 'refund',
         amount: gift.wallet_reservation_amount,
         status: 'completed'
       })

       // Update gift
       await updateGift(gift.id, {
         status: 'paused',
         wallet_reserved: false,
         automation_enabled: false,
         paused_reason: 'no_address_provided'
       })

       // Email
       await sendEmail({
         template: 'automation_paused',
         data: {
           reason: 'Address not provided',
           action: 'Funds refunded to wallet'
         }
       })
     }
   }, 12 * 60 * 60 * 1000) // 12 hours
   ```

---

### Stage 6: Cleanup (Day After Occasion)
**Trigger:** Daily cron job at 6 AM UTC

**Query:**
```sql
SELECT sg.*
FROM scheduled_gifts sg
WHERE sg.occasion_date < CURRENT_DATE
  AND sg.status NOT IN ('fulfilled', 'archived')
```

**Actions:**
1. Archive old gifts:
   ```sql
   UPDATE scheduled_gifts
   SET status = 'archived',
       archived_at = NOW()
   WHERE id IN (expired_gift_ids)
   ```

2. Release stuck reservations:
   ```sql
   -- Find stuck reservations (reserved but not charged)
   UPDATE wallet_transactions
   SET status = 'expired'
   WHERE transaction_type = 'reservation'
     AND status = 'pending'
     AND created_at < CURRENT_DATE - INTERVAL '30 days'
   ```

3. Clean old logs (keep 90 days):
   ```sql
   DELETE FROM automation_logs
   WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
   ```

---

## 5. Error Handling

### Insufficient Funds
**When:** Stage 1 (funds reservation) fails

**Actions:**
1. Try auto-reload (if enabled)
2. If auto-reload fails or disabled:
   - Pause automation for that gift
   - Send `low_wallet_balance` email
   - Show banner on dashboard
   - CTA: "Add $X to cover [Recipient]'s gift"

### Payment Method Declined
**When:** Auto-reload payment fails

**Actions:**
1. Disable auto-reload
2. Send email: "Update payment method"
3. Pause all pending automations
4. Show critical banner

### Shopify Order Fails
**When:** Order creation fails in Stage 4

**Actions:**
1. Automatic retry (3 attempts, 5 min apart)
2. If all fail:
   - Refund to wallet
   - Send `automation_paused` email
   - Log error details
   - Create support ticket (internal)

---

## 6. Dashboard UX for VIP Users

### Recipient Card (Automation Enabled)
```
┌────────────────────────────────────┐
│ [S] Sage's                         │
│ Birthday — May 31                  │
│ ⚡ Auto  💰 $42 reserved            │
│ 📬 Waiting for address             │
│                                    │
│ Status: [●●●○○○] Stage 2/6         │
└────────────────────────────────────┘
```

### Automation Toggle States
- **OFF:** Gray toggle, "Enable Automation"
- **ON (Pending):** Blue badge "⚡ Auto"
- **ON (Funds Reserved):** Green badge "💰 Reserved"
- **ON (Address Needed):** Orange badge "📬 Confirm Address"
- **ON (Fulfilled):** Green badge "✅ Sent"
- **ERROR:** Red badge "⚠️ Needs Attention"

### Gifts Awaiting Confirmation Section
```
┌─────────────────────────────────────────┐
│  Gifts Awaiting Confirmation           │
│                                         │
│  📬 Phil Yang's Birthday (May 12)      │
│      Address needed by May 5           │
│      [Confirm Address]                  │
│                                         │
│  📬 Rose's Birthday (May 12)           │
│      Address needed by May 5           │
│      [Confirm Address]                  │
└─────────────────────────────────────────┘
```

---

## 7. Missing Database Columns

Based on this spec, we need to add:

```sql
-- Add to recipients table
ALTER TABLE recipients
ADD COLUMN IF NOT EXISTS relationship text,
ADD COLUMN IF NOT EXISTS interests text[],
ADD COLUMN IF NOT EXISTS preferred_gift_style text;

-- Add to scheduled_gifts table
ALTER TABLE scheduled_gifts
ADD COLUMN IF NOT EXISTS gift_variant_id text,
ADD COLUMN IF NOT EXISTS estimated_cost decimal(10,2),
ADD COLUMN IF NOT EXISTS delivery_date date,
ADD COLUMN IF NOT EXISTS address_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmation_token text,
ADD COLUMN IF NOT EXISTS confirmation_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS shipping_address jsonb,
ADD COLUMN IF NOT EXISTS shopify_order_id text,
ADD COLUMN IF NOT EXISTS shopify_tracking_number text,
ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
ADD COLUMN IF NOT EXISTS paused_reason text,
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_occasion_date ON scheduled_gifts(occasion_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_automation ON scheduled_gifts(automation_enabled, wallet_reserved, address_confirmed_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_gifts_status ON scheduled_gifts(status);
```

---

## Next Steps

1. ✅ Review this spec
2. Create migration file with missing columns
3. Update TypeScript types
4. Implement Stage 0-1 (enable automation + reserve funds)
5. Build address confirmation page
6. Set up cron jobs for stages 1-6
7. Create email templates in Resend
8. Test end-to-end with test data

---

**Document Version:** 1.0
**Last Updated:** November 26, 2025
**Status:** 🟢 Ready for Implementation
