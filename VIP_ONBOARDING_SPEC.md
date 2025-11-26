# VIP Onboarding & Automation System - Complete Specification

## Overview
When a user upgrades to VIP, we guide them through automated gifting setup with minimal friction while ensuring successful, thoughtful gift delivery.

---

## 1. VIP Upgrade Onboarding Flow

### Trigger Points
- User clicks "Upgrade to VIP" and completes payment
- Payment success redirect to dashboard
- Show onboarding modal immediately

### Onboarding Steps (Multi-Step Modal)

#### Step 1: Congratulations! 🎉
```
┌──────────────────────────────────────────┐
│  ✨ Welcome to VIP!                     │
│                                          │
│  You now have access to:                 │
│  ✅ Unlimited recipients                 │
│  ✅ Automatic gift scheduling            │
│  ✅ Gift wallet with auto-reload         │
│  ✅ Priority support                     │
│                                          │
│  Let's get you set up in 3 easy steps   │
│                                          │
│  [Get Started →]                         │
└──────────────────────────────────────────┘
```

#### Step 2: Add Funds to Your Gift Wallet
```
┌──────────────────────────────────────────┐
│  💰 Fund Your Gift Wallet                │
│                                          │
│  Your wallet covers upcoming gifts       │
│  automatically. No last-minute stress!   │
│                                          │
│  You have 3 upcoming occasions           │
│  Recommended: $130                       │
│                                          │
│  Covers: ~ 3 gifts at $43/each           │
│                                          │
│  [Add $100]  [Add $200]  [Custom]        │
│                                          │
│  [Skip for now]          [Continue →]    │
└──────────────────────────────────────────┘
```

**Logic:**
```typescript
upcomingGifts = getNext90DaysOccasions()
recommendedAmount = upcomingGifts.length * 43 // $43 average
```

#### Step 3: Set Up Your Next 3 Recipients
```
┌──────────────────────────────────────────┐
│  🎁 Personalize Your First Gifts         │
│                                          │
│  Tell us a bit about these people so we │
│  can pick the perfect gifts:             │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Sarah's Birthday (May 31)          │  │
│  │ Relationship: [Spouse ▼]           │  │
│  │ Interests: [Wellness] [Cooking]    │  │
│  │ Gift: Serene Mist Set - $48        │  │
│  │ [✓] Enable Automation              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [+ 2 more recipients]                   │
│                                          │
│  [Skip] [Back] [Enable Automation →]     │
└──────────────────────────────────────────┘
```

#### Step 4: Success! You're All Set ✅
```
┌──────────────────────────────────────────┐
│  ✅ Automation Enabled!                  │
│                                          │
│  We'll handle everything:                │
│                                          │
│  📅 14 days before: Reserve funds        │
│  📬 10 days before: Request address      │
│  📦 3 days before: Ship the gift         │
│                                          │
│  You can customize anytime from your     │
│  dashboard.                              │
│                                          │
│  [Go to Dashboard]                       │
└──────────────────────────────────────────┘
```

---

## 2. Default Gift Options

### Universal Defaults (No Interests Set)

**Priority Order:**

1. **AromaSphere Candle** (Black luxury)
   - Shopify Product ID: `gid://shopify/Product/ashen-mountain-candle`
   - Variant ID: `gid://shopify/ProductVariant/ashen-mountain-black`
   - Price: **$45.00**
   - Description: "Premium black luxury candle with rich, sophisticated scent"
   - Best for: All occasions, sophisticated recipients

2. **Amberwood Scented Candle** (Brown artisan)
   - Shopify Product ID: `gid://shopify/Product/amberwood-candle`
   - Variant ID: `gid://shopify/ProductVariant/amberwood-brown`
   - Price: **$45.00**
   - Description: "Artisan-style brown candle with warm, inviting amber notes"
   - Best for: Cozy, home-focused recipients

3. **Serene Mist Aromatherapy Set** (Flameless diffuser)
   - Shopify Product ID: `gid://shopify/Product/serene-mist-set`
   - Variant ID: `gid://shopify/ProductVariant/serene-mist-diffuser`
   - Price: **$48.00**
   - Description: "Premium flameless aromatherapy diffuser set"
   - Best for: Wellness-focused, practical recipients

### Selection Logic

```typescript
function getDefaultGift(recipient, balance) {
  const defaults = [
    { id: 'ashen-mountain-black', price: 45, name: 'AromaSphere Candle' },
    { id: 'amberwood-brown', price: 45, name: 'Amberwood Candle' },
    { id: 'serene-mist', price: 48, name: 'Serene Mist Set' }
  ];

  // If recipient has no interests, cycle through defaults
  if (!recipient.interests || recipient.interests.length === 0) {
    // Try first option
    if (balance >= defaults[0].price) return defaults[0];
    if (balance >= defaults[1].price) return defaults[1];
    if (balance >= defaults[2].price) return defaults[2];

    // Insufficient funds for any default
    return null;
  }

  // If recipient has interests, map to appropriate gifts
  return mapInterestToGift(recipient.interests, balance);
}
```

---

## 3. Interest-to-Gift Mapping

### Interest Categories & Gifts

| Interest | Gift Options | Price Range |
|----------|-------------|-------------|
| **Wellness** | Serene Mist Set, Yoga Set, Spa Kit | $38-$55 |
| **Cooking** | Gourmet Spice Set, Cast Iron Teapot, Artisan Oils | $40-$60 |
| **Reading** | Book Light Set, Bookmark Collection, Reading Pillow | $35-$48 |
| **Coffee/Tea** | Cast Iron Teapot, Artisan Tea Set, Coffee Sampler | $42-$58 |
| **Outdoors** | Portable Fire Kit, Adventure Journal, Trail Set | $45-$65 |
| **Art/Decor** | Ceramic Collection, Artisan Vase, Wall Art | $48-$75 |
| **Tech** | Smart Home Set, Tech Organizer, Wireless Charger | $40-$70 |
| **Fashion** | Luxury Scarf, Jewelry Box, Accessory Set | $50-$85 |

### Mapping Logic

```typescript
function mapInterestToGift(interests: string[], balance: number) {
  const interestMap = {
    wellness: [
      { variantId: 'serene-mist', price: 48, name: 'Serene Mist Set' },
      { variantId: 'yoga-set', price: 55, name: 'Yoga Essentials' }
    ],
    cooking: [
      { variantId: 'cast-iron-teapot', price: 52, name: 'Cast Iron Teapot' },
      { variantId: 'spice-set', price: 45, name: 'Gourmet Spice Collection' }
    ],
    // ... more mappings
  };

  for (const interest of interests) {
    const giftOptions = interestMap[interest] || [];

    // Find first gift within budget
    for (const gift of giftOptions) {
      if (balance >= gift.price) {
        return gift;
      }
    }
  }

  // Fallback to default if no interest-based gift fits budget
  return getDefaultGift({ interests: [] }, balance);
}
```

---

## 4. Balance & Budget Logic

### Coverage Calculator

```typescript
interface BalanceCoverage {
  totalBalance: number;
  reservedFunds: number;
  availableBalance: number;
  upcomingGifts: Gift[];
  canCoverCount: number;
  needsTopUp: boolean;
  recommendedTopUp?: number;
}

async function calculateCoverage(userId: string): Promise<BalanceCoverage> {
  const profile = await getProfile(userId);
  const reservations = await getPendingReservations(userId);
  const upcomingGifts = await getUpcomingGifts(userId, 90); // Next 90 days

  const totalBalance = profile.gift_wallet_balance;
  const reservedFunds = reservations.reduce((sum, r) => sum + r.amount, 0);
  const availableBalance = totalBalance - reservedFunds;

  let runningBalance = availableBalance;
  let canCoverCount = 0;

  for (const gift of upcomingGifts) {
    if (runningBalance >= gift.estimated_cost) {
      runningBalance -= gift.estimated_cost;
      canCoverCount++;
    } else {
      break;
    }
  }

  const needsTopUp = canCoverCount < upcomingGifts.length;
  const recommendedTopUp = needsTopUp
    ? Math.ceil((upcomingGifts.length - canCoverCount) * 43 / 50) * 50 // Round to $50
    : 0;

  return {
    totalBalance,
    reservedFunds,
    availableBalance,
    upcomingGifts,
    canCoverCount,
    needsTopUp,
    recommendedTopUp
  };
}
```

### Low Balance Prompt

**When to Show:**
- Available balance < cost of next 2 upcoming gifts
- User tries to enable automation but insufficient funds
- Weekly reminder if balance < $25

**UI:**
```
┌──────────────────────────────────────────┐
│  ⚠️ Low Wallet Balance                   │
│                                          │
│  Current: $18.00                         │
│  Upcoming: 3 gifts (~$129)               │
│                                          │
│  Add $120 to cover all upcoming gifts    │
│                                          │
│  [Add $120]  [Custom Amount]             │
│                                          │
│  Or enable auto-reload:                  │
│  [⚡ Set Up Auto-Reload]                 │
└──────────────────────────────────────────┘
```

---

## 5. Cron Jobs & Automation

### Cron Schedule

| Job | Frequency | Time (UTC) | Function |
|-----|-----------|------------|----------|
| **Reserve Funds** | Daily | 6:00 AM | `process-automation-lifecycle` |
| **Request Address** | Daily | 6:00 AM | `process-automation-lifecycle` |
| **Send Reminders** | Daily | 6:00 AM | `process-automation-lifecycle` |
| **Low Balance Alert** | Weekly | Mon 9:00 AM | `check-low-balances` |
| **Incomplete Interests** | Weekly | Wed 10:00 AM | `prompt-recipient-interests` |
| **Success Summary** | Weekly | Fri 5:00 PM | `send-weekly-summary` |

### Job Details

#### 1. **Reserve Funds** (14 days before)
```sql
SELECT sg.* FROM scheduled_gifts sg
WHERE automation_enabled = true
  AND wallet_reserved = false
  AND occasion_date = CURRENT_DATE + INTERVAL '14 days'
```

**Actions:**
- Check available balance
- Try auto-reload if insufficient
- Reserve funds or pause automation
- Send email confirmation

#### 2. **Request Address** (10 days before)
```sql
SELECT sg.* FROM scheduled_gifts sg
WHERE automation_enabled = true
  AND wallet_reserved = true
  AND address_requested_at IS NULL
  AND occasion_date = CURRENT_DATE + INTERVAL '10 days'
```

**Actions:**
- Generate confirmation token
- Send address confirmation email
- Log event

#### 3. **Low Balance Weekly Alert**
```typescript
async function checkLowBalances() {
  const users = await getUsersWithVIPTier();

  for (const user of users) {
    const coverage = await calculateCoverage(user.id);

    if (coverage.availableBalance < 25 || coverage.canCoverCount < 2) {
      await sendEmail({
        template: 'low_balance_weekly',
        to: user.email,
        data: {
          balance: coverage.availableBalance,
          upcomingCount: coverage.upcomingGifts.length,
          recommendedTopUp: coverage.recommendedTopUp
        }
      });
    }
  }
}
```

#### 4. **Incomplete Interests Prompt**
```typescript
async function promptRecipientInterests() {
  const users = await getUsersWithVIPTier();

  for (const user of users) {
    const recipientsWithoutInterests = await supabase
      .from('recipients')
      .select('*')
      .eq('user_id', user.id)
      .is('interests', null)
      .limit(5);

    if (recipientsWithoutInterests.data?.length > 0) {
      await sendEmail({
        template: 'complete_recipient_interests',
        to: user.email,
        data: {
          recipients: recipientsWithoutInterests.data,
          count: recipientsWithoutInterests.data.length
        }
      });
    }
  }
}
```

---

## 6. Email Templates

### Template List

| Template ID | Subject | Trigger |
|-------------|---------|---------|
| `vip_welcome` | "Welcome to Unwrapt VIP! 🎉" | VIP upgrade complete |
| `funds_reserved` | "💰 Funds reserved for [Recipient]'s gift" | 14 days before |
| `address_confirmation` | "📬 Confirm shipping address" | 10 days before |
| `address_reminder` | "⏰ Reminder: Confirm address" | 7 days before |
| `gift_shipped` | "✅ Gift sent to [Recipient]!" | After fulfillment |
| `low_balance_weekly` | "⚠️ Low wallet balance" | Weekly check |
| `auto_reload_success` | "💳 Wallet auto-reload successful" | After reload |
| `complete_interests` | "💡 Personalize gifts for your recipients" | Weekly check |
| `weekly_summary` | "📊 Your weekly gifting summary" | Friday 5pm |

### Key Email: VIP Welcome

**Subject:** Welcome to Unwrapt VIP! 🎉

**Body:**
```html
Hi [Name],

Congratulations on upgrading to VIP! 🎉

You now have access to automatic gift scheduling—we'll handle everything for your upcoming occasions so you never miss a birthday or anniversary again.

Here's how it works:

✅ Add funds to your gift wallet
💡 Set interests for your recipients (optional)
⚡ Enable automation—and we take care of the rest

14 days before each occasion, we'll:
1. Reserve funds from your wallet
2. Request the shipping address
3. Ship a thoughtful, curated gift 3 days before the date

Complete your setup now:
[Complete Setup →]

Questions? Reply to this email—we're here to help!

The Unwrapt Team
```

### Key Email: Low Balance Alert

**Subject:** ⚠️ Your gift wallet needs a top-up

**Body:**
```html
Hi [Name],

Your gift wallet balance is running low:

Current balance: $18.00
Upcoming gifts: 3 occasions (~$129)

To keep automation running smoothly, add $120 to your wallet:
[Add Funds →]

Or set up auto-reload so you never have to think about it:
[Enable Auto-Reload →]

Upcoming occasions:
• Sarah's Birthday (May 31) - $48
• Mom's Anniversary (June 15) - $55
• Best Friend's Birthday (June 20) - $42

Questions? Just reply to this email.

The Unwrapt Team
```

---

## 7. User Experience Flows

### Flow 1: Happy Path
```
User upgrades to VIP
  ↓
VIP Welcome Modal (4 steps)
  ↓
Adds $200 to wallet
  ↓
Sets interests for 3 recipients
  ↓
Enables automation
  ↓
14 days before: Funds reserved (email sent)
  ↓
10 days before: Address confirmation sent
  ↓
User confirms address
  ↓
3 days before: Gift ships (tracking email sent)
  ↓
Gift arrives on time ✅
  ↓
Weekly summary email: "1 gift sent this week!"
```

### Flow 2: No Interests Set
```
User upgrades to VIP
  ↓
Skips interest setup
  ↓
Enables automation for recipient
  ↓
System selects: AromaSphere Candle ($45)
  ↓
Automation proceeds normally
  ↓
Gift ships with default selection ✅
```

### Flow 3: Insufficient Balance
```
14 days before occasion
  ↓
System tries to reserve funds
  ↓
Balance: $20, Need: $48
  ↓
Check if auto-reload enabled:
  - Yes → Trigger reload → Reserve funds ✅
  - No → Send low balance email → Pause automation
  ↓
User adds funds manually
  ↓
Automation resumes ✅
```

---

## 8. Implementation Priority

### Phase 1: Core VIP Onboarding (Week 1)
- [ ] VIP welcome modal (4-step flow)
- [ ] Default gift selection logic
- [ ] Balance coverage calculator
- [ ] Database migration for gift mapping

### Phase 2: Automation Engine (Week 2)
- [ ] Enhanced automation lifecycle function
- [ ] Reserve funds logic with balance check
- [ ] Address confirmation flow
- [ ] Gift fulfillment integration

### Phase 3: Email System (Week 3)
- [ ] Email templates in Resend
- [ ] Triggered emails for each stage
- [ ] Weekly digest emails
- [ ] Low balance alerts

### Phase 4: Cron Jobs (Week 4)
- [ ] Daily automation processing
- [ ] Weekly low balance checks
- [ ] Weekly interest prompts
- [ ] Weekly summary reports

---

## 9. Success Metrics

Track these KPIs:

- **VIP Onboarding Completion Rate**: % who complete all 4 steps
- **Automation Enable Rate**: % of VIP users with ≥1 automated gift
- **Gift Success Rate**: % of automated gifts delivered on time
- **Wallet Top-Up Frequency**: Average days between top-ups
- **Default Gift Usage**: % of gifts using defaults vs interest-based
- **Balance Coverage**: Average number of gifts covered by wallet

---

## 10. Open Questions

1. **Shopify Integration**: Do we have these exact products in Shopify?
   - AromaSphere Candle (Black) - $45
   - Amberwood Candle (Brown) - $45
   - Serene Mist Set - $48

2. **Auto-Reload**: What's the minimum reload amount? ($50? $100?)

3. **Interest Mapping**: Should we allow multiple gifts per interest, or just one default?

4. **Cron Timing**: Is 6 AM UTC optimal for all users, or should we localize?

5. **Email Frequency**: Weekly digest OK, or should it be configurable?

---

**Document Version:** 1.0
**Last Updated:** November 26, 2025
**Status:** 🟡 Ready for Review & Implementation
