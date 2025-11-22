# Unwrapt VIP Automation - Sprint Roadmap
## 🚀 5 Weeks to Launch | November 22 - December 31, 2025

**Target:** VIP Subscription Launch ($24.99/month with 7-day trial)

---

## 📅 Sprint Overview

| Sprint | Duration | Focus Areas | Status |
|--------|----------|-------------|--------|
| **Sprint 1** | Nov 22-28 (7 days) | Foundation + Tier System | 🟡 Not Started |
| **Sprint 2** | Nov 29-Dec 5 (7 days) | Gift Wallet + Automation Core | 🟡 Not Started |
| **Sprint 3** | Dec 6-12 (7 days) | Email System + Onboarding | 🟡 Not Started |
| **Sprint 4** | Dec 13-19 (7 days) | Error Handling + Testing | 🟡 Not Started |
| **Sprint 5** | Dec 20-26 (7 days) | Settings + Analytics Prep | 🟡 Not Started |
| **Launch Week** | Dec 27-31 (5 days) | Soft Launch + Monitoring | 🟡 Not Started |

---

## Sprint 1: Foundation & Tier System
**Duration:** November 22-28, 2025 (7 days)  
**Goal:** Establish database foundation and implement Free/VIP tier enforcement

### 🎯 Sprint Objectives
- Set up all database tables and indexes
- Configure Stripe products and webhooks
- Implement subscription tier logic
- Build upgrade UI components

### 📋 Tasks

#### **Phase 0: Foundation & Setup** (Days 1-3)
**Database Tasks:**
- [ ] Add subscription columns to profiles table
  - `subscription_tier` (free/vip)
  - `subscription_status` (active/canceled/trialing)
  - `trial_ends_at`
  - `stripe_customer_id`
- [ ] Create `wallet_transactions` table
  - id, user_id, amount, balance_after, transaction_type
  - stripe_payment_intent_id, status, created_at
- [ ] Add automation columns to `scheduled_gifts`
  - `automation_enabled`, `wallet_reserved`, `wallet_reservation_amount`
  - `address_requested_at`, `address_reminder_sent`
- [ ] Create `automation_logs` table
  - id, user_id, recipient_id, scheduled_gift_id
  - stage, action, details, created_at
- [ ] Create performance indexes on frequently queried columns

**Stripe Setup:**
- [ ] Create VIP Monthly product ($24.99/month) in Stripe Dashboard
- [ ] Configure 7-day trial period
- [ ] Set up webhook endpoints in Supabase Edge Functions
- [ ] Test webhook delivery with Stripe CLI
- [ ] Document webhook event handling flow

**Edge Functions:**
- [ ] Create `create-subscription-checkout` endpoint
- [ ] Create `stripe-webhook` handler for lifecycle events
- [ ] Add webhook secret validation

#### **Phase 1: Tier System & Subscriptions** (Days 4-7)
**Backend Functions:**
- [ ] Build tier validation utilities
  - `checkUserTier()` - Returns current tier
  - `enforceRecipientLimit()` - Blocks >3 for free users
  - `canEnableAutomation()` - VIP-only check
- [ ] Implement subscription creation flow
- [ ] Handle webhook events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`

**Frontend Components:**
- [ ] Create `SubscriptionBadge` component (shows Free/VIP status)
- [ ] Create `UpgradeModal` with tier comparison table
- [ ] Implement 3-recipient limit enforcement in dashboard
- [ ] Add upgrade prompts when limits are reached
- [ ] Show blurred "locked" recipients for free users (>3)
- [ ] Add VIP benefits callouts throughout app

### ✅ Success Criteria
- [ ] All database tables created without migration errors
- [ ] Can create test subscription in Stripe (test mode)
- [ ] Webhooks successfully deliver and update database
- [ ] Free users cannot add 4th recipient
- [ ] VIP trial starts successfully via Stripe Checkout
- [ ] Upgrade modal appears at appropriate limit points
- [ ] Subscription badge displays correct tier

### 🎨 UI/UX Deliverables
- SubscriptionBadge component (shows tier + trial countdown)
- UpgradeModal with feature comparison
- Locked recipient cards (blurred) for free users
- VIP benefits banners in key areas

### ⚠️ Risks & Blockers
- **Risk:** Webhook delivery failures in production
  - *Mitigation:* Implement retry logic and webhook signature verification
- **Blocker:** Stripe test mode vs production configuration
  - *Mitigation:* Document both environments clearly

---

## Sprint 2: Gift Wallet & Automation Core
**Duration:** November 29 - December 5, 2025 (7 days)  
**Goal:** Build wallet system and implement core automation lifecycle

### 🎯 Sprint Objectives
- Create fully functional gift wallet with Stripe integration
- Implement auto-reload system
- Build automation toggle and lifecycle stages 1-6
- Create address confirmation flow

### 📋 Tasks

#### **Phase 2: Gift Wallet System** (Days 8-11)
**Wallet Operations (Edge Functions):**
- [ ] Create `wallet-add-funds` endpoint
  - Accept amount, create Stripe PaymentIntent
  - Update wallet balance on success
  - Log transaction in `wallet_transactions`
- [ ] Create `wallet-reserve-funds` function
  - Check available balance
  - Reserve funds for specific gift
  - Mark gift as `wallet_reserved: true`
- [ ] Create `wallet-charge-reserved` function
  - Convert reservation to actual charge
  - Update balance_after in transaction log
- [ ] Build `trigger-auto-reload` logic
  - Trigger when balance drops below threshold
  - Use saved payment method
  - Send confirmation email

**UI Components:**
- [ ] Create `WalletBalance` card component
  - Shows current balance prominently
  - "Add Funds" button
  - Quick-view of recent transactions
- [ ] Create `AddFundsModal`
  - Preset amounts ($25, $50, $100, $200, Custom)
  - Stripe Checkout integration
  - Success/error handling
- [ ] Create `WalletTransactionHistory` view
  - Filterable by type (add, reserve, charge, refund)
  - Shows date, description, amount, balance after
- [ ] Build `AutoReloadSettings` panel
  - Enable/disable toggle
  - Set threshold amount ($25-$100)
  - Set reload amount ($50-$250)

#### **Phase 3: Automation Core** (Days 12-18)
**Automation Lifecycle (Cron Job):**
- [ ] **Stage 1: Reserve Funds** (14 days before occasion)
  - Query gifts with `automation_enabled: true` and date = today+14
  - Calculate gift cost (variant price)
  - Call `wallet-reserve-funds`
  - Send `funds_reserved` email
  - Log to `automation_logs`
  
- [ ] **Stage 2: Request Address** (10 days before)
  - Query gifts at today+10 with funds reserved
  - Send `address_confirmation_request` email with unique link
  - Set `address_requested_at` timestamp
  
- [ ] **Stage 3: Send Reminder** (7 days before)
  - Query gifts at today+7 with no address confirmed
  - Send `address_confirmation_reminder` email
  - Increment `address_reminder_sent` counter
  
- [ ] **Stage 4: Fulfill Order** (after address confirmed)
  - Trigger when address submitted
  - Call Shopify API to create order
  - Call `wallet-charge-reserved` to complete payment
  - Send `gift_sent` email with tracking
  - Update gift status to `fulfilled`
  
- [ ] **Stage 5: Escalation** (24 hours before occasion)
  - Query gifts without address 24hrs before
  - Send urgent email to user
  - Pause automation for that gift
  - Refund reserved funds
  
- [ ] **Stage 6: Cleanup** (day after occasion)
  - Mark expired gifts
  - Release any stuck reservations
  - Archive old automation logs

**User Interface:**
- [ ] Add automation toggle to recipient cards
  - Shows "Auto" badge when enabled
  - Tooltip explaining automation
- [ ] Create `AutomationSetupModal`
  - Step 1: Pick default gift (from Shopify collection)
  - Step 2: Check wallet balance (show cost estimate)
  - Step 3: Confirm and enable
- [ ] Build `/gifts/confirm-address/:token` page
  - Pre-filled recipient info
  - Address form (street, city, state, zip)
  - Submit triggers Stage 4 fulfillment
- [ ] Add "Gifts Awaiting Confirmation" dashboard section
  - Shows gifts pending address
  - Days remaining countdown
  - Quick link to send reminder

### ✅ Success Criteria
- [ ] Can add funds to wallet via Stripe ($25+ test)
- [ ] Balance updates in real-time across all views
- [ ] Transaction history shows all activity correctly
- [ ] Auto-reload triggers when balance drops below threshold
- [ ] Can enable automation for a recipient
- [ ] Funds reserved exactly 14 days before occasion
- [ ] Address confirmation email sent 10 days before
- [ ] Order placed with Shopify after address confirmed
- [ ] All 6 lifecycle stages execute without errors
- [ ] Errors (insufficient funds, no address) handled gracefully

### 🎨 UI/UX Deliverables
- WalletBalance card (always visible on dashboard)
- AddFundsModal with Stripe Checkout flow
- AutomationSetupModal (3-step wizard)
- Address confirmation page (public link)
- "Awaiting Confirmation" dashboard section

### ⚠️ Risks & Blockers
- **Risk:** Cron job timing accuracy (exactly 14, 10, 7 days before)
  - *Mitigation:* Use daily cron + date filtering, add buffer checks
- **Risk:** Race conditions in wallet reservation
  - *Mitigation:* Implement database transactions and locks
- **Blocker:** Shopify API integration for order creation
  - *Mitigation:* Complete Shopify setup early in sprint

---

## Sprint 3: Email System & Onboarding
**Duration:** December 6-12, 2025 (7 days)  
**Goal:** Design and implement all automation emails, streamline onboarding flow

### 🎯 Sprint Objectives
- Create 11 email templates via Resend
- Implement email sending infrastructure
- Streamline onboarding to 2 steps + animation
- Update dashboard landing experience

### 📋 Tasks

#### **Phase 4: Email System** (Days 19-21)
**Email Templates (via Resend):**
- [ ] Set up Resend account and domain verification
- [ ] Create email template designs in Resend dashboard
- [ ] **Automation Emails:**
  - [ ] `automation_enabled` - "✅ Automation is ON for [Recipient]"
  - [ ] `funds_reserved` - "💰 $X reserved for [Recipient]'s [Occasion]"
  - [ ] `address_confirmation_request` - "📬 Confirm shipping address"
  - [ ] `address_confirmation_reminder` - "⏰ Reminder: Address needed by [Date]"
  - [ ] `gift_sent` - "🎁 Gift shipped to [Recipient]! Track: [Link]"
- [ ] **Wallet Emails:**
  - [ ] `low_wallet_balance` - "💳 Wallet balance low ($X remaining)"
  - [ ] `auto_reload_success` - "✅ Wallet reloaded with $X"
- [ ] **Error Emails:**
  - [ ] `automation_paused` - "⚠️ Automation paused for [Recipient]"
- [ ] **Trial Emails:**
  - [ ] `trial_ending` - "⏳ VIP trial ends in 3 days"
  - [ ] `trial_ended` - "Trial ended, upgrade to continue automation"

**Email Infrastructure:**
- [ ] Create `send-notification-email` edge function
  - Accept template name + personalization data
  - Call Resend API with correct template
  - Log email sent event
  - Handle errors gracefully
- [ ] Create `notification_queue` table (optional)
  - Queue emails for retry if sending fails
  - Track delivery status
- [ ] Test all email templates with real data
  - Verify mobile responsiveness
  - Check link functionality
  - Test personalization (names, dates, amounts)

#### **Phase 5: Onboarding Updates** (Days 22-23)
**Flow Changes:**
- [ ] **Remove unnecessary steps:**
  - ~~Interests selection step~~
  - ~~"Schedule gift now" step~~
- [ ] **Update "Found X Dates" screen:**
  - Show tier messaging ("Free: showing 3 of X recipients")
  - Add upgrade CTA if >3 recipients found
  - Explain automation benefits (VIP only)
- [ ] **Add gift showcase animation:**
  - 3-5 second animation showing curated gifts
  - Beautiful product carousel
  - Sets expectations for gift quality
- [ ] **Update dashboard landing:**
  - Free users: See 3 recipients max + upgrade prompt
  - VIP users: See all recipients + automation toggles
  - Show wallet balance (VIP only)

**New Components:**
- [ ] Create `GiftShowcaseAnimation` component
  - Product carousel with smooth transitions
  - Powered by Framer Motion
  - Shows 5-6 curated gift examples
- [ ] Update `OnboardingFlow` to skip removed steps
- [ ] Update `Dashboard` to show tier-appropriate view

### ✅ Success Criteria
- [ ] All 11 email templates render correctly in inbox
- [ ] Links in emails direct to correct pages
- [ ] Personalization works (names, dates, amounts)
- [ ] All emails are mobile-responsive
- [ ] Onboarding takes <1 minute to complete
- [ ] Free users see exactly 3 recipients on dashboard
- [ ] VIP users see all recipients + automation features
- [ ] Gift showcase animation plays smoothly without lag

### 🎨 UI/UX Deliverables
- 11 professional email templates via Resend
- GiftShowcaseAnimation component (3-5 second loop)
- Updated onboarding flow (2 steps + animation)
- Tier-specific dashboard views

### ⚠️ Risks & Blockers
- **Risk:** Email deliverability (spam filters)
  - *Mitigation:* Use Resend with proper SPF/DKIM setup
- **Risk:** Animation performance on mobile
  - *Mitigation:* Optimize assets, test on low-end devices

---

## Sprint 4: Error Handling & Testing
**Duration:** December 13-19, 2025 (7 days)  
**Goal:** Implement comprehensive error handling and test all user flows end-to-end

### 🎯 Sprint Objectives
- Build error recovery mechanisms
- Create user-friendly error UI components
- Test all critical user journeys
- Verify edge cases and performance

### 📋 Tasks

#### **Phase 6: Error Handling** (Days 24-26)
**Error Scenarios & Recovery:**
- [ ] **Insufficient Funds:**
  - Check wallet balance before reservation
  - If insufficient, try auto-reload (if enabled)
  - If auto-reload fails, send `low_wallet_balance` email
  - Pause automation for that gift
  - Show error on dashboard with "Add Funds" CTA
  
- [ ] **No Address After Deadline:**
  - Stage 5 escalation (24hrs before)
  - Send urgent email to user
  - Release reserved funds
  - Mark gift as `needs_attention`
  - Option to manually enter address or reschedule
  
- [ ] **Fulfillment Failure:**
  - If Shopify order creation fails
  - Automatic refund to wallet
  - Send `automation_paused` email with details
  - Log error to `automation_logs`
  - Provide manual retry option
  
- [ ] **Payment Method Declined:**
  - If auto-reload payment fails
  - Disable auto-reload for that user
  - Send email requesting payment method update
  - Pause all pending automations
  - Show banner on dashboard

**UI Components:**
- [ ] Create `AutomationErrorBanner` component
  - Shows at top of dashboard when errors exist
  - "X gifts need attention"
  - Click to see details
- [ ] Add error badges to recipient cards
  - Red dot + tooltip explaining issue
  - Click opens resolution modal
- [ ] Create `AutomationErrorModal`
  - Shows error details clearly
  - Provides resolution steps (e.g., "Add $X to wallet")
  - Quick action buttons ("Add Funds", "Update Address")
- [ ] Create error state views
  - Empty state for zero balance
  - Error state for failed reservations
  - Warning state for expiring trials

#### **Phase 7: Testing & QA** (Days 27-29)
**Test Coverage:**
- [ ] **Free User Journey:**
  - Sign up → Import 5 birthdays → See only 3
  - Try to add 4th recipient → Upgrade modal appears
  - Click upgrade → Stripe Checkout opens
- [ ] **VIP User Journey:**
  - Sign up with VIP trial → Import birthdays → See all
  - Enable automation for recipient → Funds reserved
  - Receive address confirmation email → Submit address
  - Gift fulfilled successfully → Tracking email sent
- [ ] **Automation Lifecycle (All 6 Stages):**
  - Stage 1: Funds reserved 14 days before ✅
  - Stage 2: Address email sent 10 days before ✅
  - Stage 3: Reminder sent 7 days before ✅
  - Stage 4: Order placed after address confirmed ✅
  - Stage 5: Escalation 24 hours before (no address) ✅
  - Stage 6: Cleanup on occasion date ✅
- [ ] **Edge Cases:**
  - Balance exactly equals gift cost (no extra funds)
  - Balance $0.01 short (should trigger reload or error)
  - Address submitted on deadline day (should fulfill)
  - Multiple gifts on same day (concurrent processing)
  - Trial expires during active automation (handle gracefully)
  - User cancels subscription with pending gifts (pause automations)
- [ ] **Performance Benchmarks:**
  - Dashboard loads within 2 seconds
  - Cron job processes 100 gifts in <10 seconds
  - Email sending <1 second per email
  - Wallet operations complete in <500ms

**Test Tools:**
- [ ] Set up test data generator for automation scenarios
- [ ] Create manual test checklist document
- [ ] Use Stripe test mode for all payment tests
- [ ] Mock cron job with manual triggers for date testing

### ✅ Success Criteria
- [ ] All error states have clear, actionable messaging
- [ ] Errors don't break other automations (isolated failures)
- [ ] Users can easily resolve issues via UI
- [ ] All critical user paths tested successfully
- [ ] No breaking bugs found in core flows
- [ ] Edge cases handled gracefully
- [ ] Dashboard loads within 2 seconds
- [ ] All automated tests pass

### 🎨 UI/UX Deliverables
- AutomationErrorBanner component
- AutomationErrorModal with resolution steps
- Error badges on recipient cards
- Error state designs for all major views

### ⚠️ Risks & Blockers
- **Risk:** Edge cases reveal fundamental logic flaws
  - *Mitigation:* Allocate buffer time for fixes
- **Risk:** Performance issues with many concurrent automations
  - *Mitigation:* Implement job queue system if needed

---

## Sprint 5: Settings & Analytics Prep
**Duration:** December 20-26, 2025 (7 days)  
**Goal:** Complete settings page, implement subscription management, prepare analytics

### 🎯 Sprint Objectives
- Build comprehensive settings page
- Enable subscription cancellation/downgrade
- Set up analytics event tracking
- Prepare key metrics dashboard

### 📋 Tasks

#### **Phase 8: Settings & Account Management** (Days 30-31)
**Settings Page Tabs:**
- [ ] **Account Tab:**
  - Profile info (name, email, avatar)
  - Change password
  - Delete account (with confirmation)
  
- [ ] **Subscription Tab:**
  - Current plan display (Free/VIP)
  - Trial countdown (if applicable)
  - Upgrade/downgrade buttons
  - Cancel subscription button
  - Billing history
  - Update payment method
  
- [ ] **Wallet Tab:**
  - Current balance
  - Transaction history (full)
  - Auto-reload settings
  - Add funds
  
- [ ] **Automation Tab:**
  - List all active automations
  - Bulk enable/disable
  - Set global defaults (preferred gift type)
  - Automation success rate stats

**Subscription Management:**
- [ ] Create `cancel-subscription` edge function
  - Call Stripe to cancel at period end
  - Update user's `subscription_status` to `canceling`
  - Send cancellation confirmation email
  - Pause all future automations after period ends
  
- [ ] Handle downgrade (VIP → Free):
  - If user has >3 recipients, show warning
  - Disable automation for all recipients
  - Keep recipients but limit dashboard view to 3
  - Send downgrade confirmation email
  
- [ ] Create `update-payment-method` flow
  - Stripe Customer Portal integration
  - Update saved payment method for auto-reload

### #### **Phase 9: Analytics Prep** (Days 32-33)
**Event Tracking Setup:**
- [ ] Install analytics library (Posthog/Mixpanel/Amplitude)
- [ ] Create `track()` utility wrapper
- [ ] **Core Events to Track:**
  - `signup_completed` - New user registered
  - `calendar_connected` - Google Calendar linked
  - `recipient_added` - New recipient created
  - `subscription_started` - VIP trial started
  - `subscription_upgraded` - Free → VIP upgrade
  - `subscription_canceled` - User canceled
  - `wallet_funded` - Funds added to wallet
  - `automation_enabled` - Automation toggled on
  - `automation_disabled` - Automation toggled off
  - `gift_reserved` - Stage 1 executed
  - `address_confirmed` - Stage 4 triggered
  - `gift_fulfilled` - Stage 4 completed
  - `automation_failed` - Any stage error
  
**Metrics Dashboard (Admin Only):**
- [ ] Create `/admin/metrics` route (protected)
- [ ] Build metrics dashboard UI
- [ ] **Key Metrics to Display:**
  - Total signups (last 7/30 days)
  - Free → VIP conversion rate
  - Active VIP subscribers
  - Monthly Recurring Revenue (MRR)
  - Automation adoption rate (% of users with ≥1 automation)
  - Automation success rate (completed / total)
  - Average wallet balance
  - Churn rate
  
**Conversion Funnel Tracking:**
- [ ] Track funnel stages:
  1. Landing page visit
  2. Signup started
  3. Signup completed
  4. Calendar connected
  5. Recipients added
  6. First automation enabled
  7. VIP trial started
  8. VIP subscription paid

### ✅ Success Criteria
- [ ] Users can manage all account settings
- [ ] Cancellation works smoothly (immediate + at period end)
- [ ] Downgrade disables automations correctly
- [ ] All critical events tracked in analytics
- [ ] Admin can view key metrics in dashboard
- [ ] Conversion funnels visible and accurate

### 🎨 UI/UX Deliverables
- Complete Settings page (4 tabs)
- Subscription management UI (cancel, downgrade, update payment)
- Admin metrics dashboard (charts + key stats)
- Analytics event tracking throughout app

### ⚠️ Risks & Blockers
- **Risk:** Analytics integration breaks something
  - *Mitigation:* Test thoroughly, use try/catch around all tracking
- **Risk:** Subscription cancellation doesn't work correctly
  - *Mitigation:* Test extensively with Stripe test mode

---

## Launch Week: Soft Launch & Monitoring
**Duration:** December 27-31, 2025 (5 days)  
**Goal:** Soft launch with controlled user groups, monitor closely, fix critical bugs

### 🎯 Launch Objectives
- Deploy to production environment
- Run internal and closed beta tests
- Monitor all systems closely
- Address critical issues immediately
- Prepare for public launch in early January

### 📋 Tasks

#### **Week 6: Soft Launch** (Dec 27-31)
**Day 1-2: Internal Team Testing (Dec 27-28)**
- [ ] Deploy to production (with feature flags off)
- [ ] Team of 3-5 people test all flows
- [ ] Create real subscriptions, enable automation
- [ ] Test email delivery in production
- [ ] Verify Stripe webhooks work correctly
- [ ] Check cron job runs on schedule
- [ ] Monitor error logs closely

**Day 3-4: Closed Beta (Dec 29-30)**
- [ ] Invite 10-20 trusted users
- [ ] Enable VIP features for beta group
- [ ] Send onboarding instructions
- [ ] Monitor automation success rate
- [ ] Collect feedback via survey
- [ ] Fix critical bugs immediately

**Day 5: Open Beta Prep (Dec 31)**
- [ ] Review all feedback from closed beta
- [ ] Fix high-priority bugs
- [ ] Update documentation
- [ ] Prepare public launch announcement
- [ ] Set up customer support channels
- [ ] Create launch day monitoring checklist

### 📊 Monitoring & Alerts
**Daily Metrics Review (During Launch Week):**
- [ ] Signups count
- [ ] VIP conversion rate
- [ ] Automation adoption rate
- [ ] Automation success rate
- [ ] Error rate (by type)
- [ ] Email delivery rate
- [ ] Stripe payment success rate

**Alerts to Set Up:**
- [ ] Cron job failures
- [ ] Webhook delivery failures
- [ ] High error rate (>5% of operations)
- [ ] Email bounce rate >10%
- [ ] Payment failures

### ✅ Success Criteria
- [ ] 0 critical bugs found
- [ ] Automation success rate >90%
- [ ] Email delivery rate >95%
- [ ] All beta users successfully onboarded
- [ ] Positive feedback from beta testers
- [ ] Team confident in public launch

### 🚨 Rollback Plan
**If Critical Issues Arise:**
1. Disable VIP subscriptions via feature flag
2. Pause all automation cron jobs
3. Communicate with affected users
4. Fix issue in staging environment
5. Re-deploy and re-test
6. Resume launch when stable

---

## Post-Launch: Week 7 & Beyond
**Timeline:** January 2026+

### Week 7: Public Launch (Days 34-40)
- [ ] Announce on all channels (email, social, website)
- [ ] Enable all features publicly
- [ ] Monitor closely for first 48 hours
- [ ] Daily metrics review
- [ ] Address support tickets <24hr response time

### Week 8+: Optimization
- [ ] Analyze conversion funnels
- [ ] A/B test pricing ($19.99 vs $24.99 vs $29.99)
- [ ] Optimize email open rates (subject line testing)
- [ ] Improve automation success rate (root cause analysis)
- [ ] Add features based on user feedback
- [ ] Expand to additional gift categories

---

## 🎯 Success Metrics (End of Month 1)

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Total Signups** | 100-250 | Baseline user acquisition |
| **Free → VIP Conversion** | 15-20% | Industry standard for freemium |
| **Automation Adoption** | 60%+ | Core value proposition |
| **Automation Success Rate** | 90%+ | System reliability |
| **Monthly Recurring Revenue** | $375-$1,200 | (15-50 VIP subs × $24.99) |
| **Churn Rate** | <10% | High retention target |
| **Support Load** | <5 tickets/day | Manageable support volume |

---

## ⚠️ Key Risks & Mitigation Strategies

### 1. Cron Job Fails
**Impact:** Gifts don't reserve/send automatically  
**Mitigation:**
- Set up monitoring alerts (PagerDuty/Discord)
- Manual fallback procedures documented
- Comprehensive logging for debugging
- Test cron extensively before launch

### 2. Low Conversion Rate (<10%)
**Impact:** Insufficient revenue to sustain  
**Mitigation:**
- A/B test pricing ($19.99, $24.99, $29.99)
- Improve value proposition messaging
- Optimize upgrade prompts (timing + copy)
- Add social proof (testimonials)

### 3. Fulfillment Failures
**Impact:** Gifts don't ship, poor user experience  
**Mitigation:**
- Automatic refunds to wallet
- Retry mechanism (2-3 attempts)
- Detailed error logging
- Shopify integration fallback (manual orders)

### 4. High Churn Rate (>20%)
**Impact:** Users cancel subscriptions quickly  
**Mitigation:**
- Improve automation success rate (>95%)
- Excellent customer support (<2hr response)
- Clear value delivery (send success emails)
- Offer pause instead of cancel

### 5. Calendar Sync Issues
**Impact:** Users can't import recipients  
**Mitigation:**
- Manual recipient addition always available
- Clear error messages for auth issues
- Token refresh logic working correctly
- Alternative import methods (CSV upload)

---

## 📝 Definition of Done

**For each sprint to be considered "complete":**
- [ ] All planned features implemented and tested
- [ ] Code reviewed and merged to main branch
- [ ] Database migrations run successfully
- [ ] Edge functions deployed and tested
- [ ] UI components match designs
- [ ] All success criteria met
- [ ] No critical bugs or blockers remain
- [ ] Documentation updated
- [ ] Team demo completed

---

## 🛠️ Tools & Resources

**Development:**
- Supabase (database + edge functions)
- Stripe (payments + subscriptions)
- Resend (email delivery)
- Shopify (gift fulfillment)
- Framer Motion (animations)

**Testing:**
- Stripe CLI (webhook testing)
- Manual test checklist
- Test data generator

**Monitoring:**
- Supabase Dashboard (logs + analytics)
- Stripe Dashboard (payments)
- Error tracking (Sentry or LogRocket)
- Analytics (Posthog/Mixpanel)

**Communication:**
- Daily standups (async)
- Sprint reviews (end of each sprint)
- Bug triage (as needed)

---

## 🎉 Ready to Build!

This roadmap provides a complete blueprint for implementing VIP automation in Unwrapt. Each sprint builds on the previous, with clear deliverables and success criteria.

**Next Steps:**
1. Review this roadmap with the team
2. Set up project tracking (Notion/Linear/GitHub Projects)
3. Start Sprint 1 on November 22, 2025
4. Ship VIP automation by December 31, 2025

**Timeline Summary:**
- **5 weeks to MVP** (35 days)
- **7 weeks to public launch** (includes soft launch)
- **8+ weeks:** Optimization and growth

---

**Document Version:** 1.0  
**Last Updated:** November 22, 2025  
**Status:** 🟡 Ready to Start Sprint 1
