# Unwrapt Product Sprint Plan
## Based on User Feedback Analysis

**Date:** January 2026  
**Focus:** Reducing friction, building trust, improving clarity

---

## Feedback Summary

### Key Pain Points Identified

| Theme | Frequency | Severity |
|-------|-----------|----------|
| Forced calendar access too early | High | Critical |
| No gift preview before checkout | High | Critical |
| Manual event/recipient creation missing | High | High |
| Landing page incomplete/unpolished | Medium | High |
| Subscription value unclear | Medium | High |
| Missing pricing, FAQs, testimonials | Medium | Medium |
| Product catalog hard to discover | Medium | Medium |
| Unclear how interest matching works | Medium | Medium |

---

## Sprint 1: Trust-First Onboarding (Priority: Critical)

### Key User Problems Identified

> *"I just didn't want to push through in completing the sign up because I have to connect my calendar."*

> *"The flow feels intrusive. You're asking for valuable data (email, calendar access) and a subscription purchase before user has a clear understanding of your service."*

> *"After sign-up, allow user to manually add recipient before asking for calendar access -- calendar access is a big deal."*

**Users are dropping off because:**
- Calendar access is required before understanding the product
- No option to manually add recipients/events
- Subscription payment requested before seeing value
- Unclear what data is being accessed and how it's used

### Sprint Goal

Users can complete onboarding and experience core value **without** connecting their calendar, with clear opt-in later.

### Features & UX Improvements

- [ ] **Manual recipient creation as primary path**
  - Add "Add Recipient Manually" button prominently in onboarding
  - Fields: Name, relationship, birthday, anniversary, interests
  - Make calendar sync an optional enhancement, not a requirement

- [ ] **Defer calendar access to post-value moment**
  - Move calendar connection to Settings or as optional step after first recipient
  - Show clear benefits of calendar sync when asking
  - Add "Skip for now" option that doesn't feel punitive

- [ ] **Calendar permission transparency**
  - Add clear copy: "We only read birthday events. We never modify your calendar."
  - Show exactly what data will be accessed before OAuth
  - Privacy-first messaging throughout

- [ ] **Defer subscription until value demonstrated**
  - Allow users to add 1-3 recipients on free tier before upsell
  - Show VIP benefits only after they've scheduled their first gift
  - Remove checkout step from initial onboarding flow

### Success Metrics

- [ ] Increase onboarding completion rate by 40%
- [ ] Reduce drop-off at calendar connection step by 60%
- [ ] Increase percentage of users adding 1+ recipient by 50%

---

## Sprint 2: Gift Discovery Before Commitment

### Key User Problems Identified

> *"When I clicked 'Automate My Gifting,' it went straight to checkout. I was expecting to see the gifts that get curated first."*

> *"I wanted to check what type of 'curated gifts' you offer, clicked on 'Artisan-Made, One Piece at a Time' assuming that there are samples, but it didn't give me the info I am looking for."*

> *"I understand your catalog is limited for now, but the space dedicated to it makes it seem like an afterthought rather than your main offering."*

**Users are dropping off because:**
- Can't see actual products before signing up or paying
- Clicking on gift showcases doesn't reveal catalog
- Checkout appears before gift selection
- Catalog display shows only 2 items at a time (on 1920px monitor)

### Sprint Goal

Users can browse the full gift catalog and understand gift quality **before** signing up or paying.

### Features & UX Improvements

- [ ] **Public gift catalog page**
  - Create `/catalog` or `/gifts` public page accessible without login
  - Show all available products with images, descriptions, prices
  - Filter by category, price range, recipient type
  - Link from landing page hero and showcase sections

- [ ] **Make showcase sections clickable**
  - "Artisan-Made" → Opens catalog filtered to artisan items
  - "Curated With Taste" → Opens full catalog with featured items
  - "Thoughtful & Exclusive" → Opens limited edition/exclusive items

- [ ] **Gift preview in onboarding**
  - After adding recipient interests, show 3-5 matching gift suggestions
  - "Based on Sarah's love of cooking, here's what we'd send..."
  - Build excitement and demonstrate matching logic

- [ ] **Improve catalog display density**
  - Show 4-6 items per row on desktop (currently 2)
  - Responsive grid: 1 column mobile, 2 tablet, 4-6 desktop
  - Quick-view modal for product details

- [ ] **Demo flow on landing page**
  - Interactive demo showing: Add recipient → See matching gifts → Schedule delivery
  - No login required to experience the flow
  - CTA after demo: "Ready to try it for real?"

### Success Metrics

- [ ] 30% of landing page visitors view catalog before signup
- [ ] Increase click-through rate on gift showcase sections by 50%
- [ ] Reduce "checkout surprise" complaints to zero

---

## Sprint 3: Landing Page Polish & Clarity

### Key User Problems Identified

> *"The blank spot in the cards makes you feel like there was an image or a graphic that didn't load."*

> *"There are some misalignments in some elements."*

> *"When you scroll to read the final section of the card it goes down automatically... give it a bit extra scroll."*

> *"I hope you can redesign the intro page - I find it too plain."*

> *"Sample pricing should be added to the homepage."*

> *"FAQs should also be added - I am not aware if the delivery will be global."*

**Users are perceiving:**
- Incomplete or broken UI elements
- Missing content creating confusion
- Scroll behavior issues interrupting reading
- Lack of basic information (pricing, FAQs)
- Design not matching product quality

### Sprint Goal

Landing page feels complete, polished, and answers all common questions without requiring signup.

### Features & UX Improvements

- [ ] **Fix empty card spaces**
  - Audit all cards for missing images/content
  - Add placeholder content or remove empty sections
  - Ensure every visual element serves a purpose

- [ ] **Fix scroll snap behavior**
  - Increase scroll threshold before auto-advancing sections
  - Allow users to read full content before page scrolls
  - Test across different viewport heights

- [ ] **Add pricing section**
  - Clear pricing tiers: Free (3 recipients) vs VIP ($4.99/mo)
  - What's included in each tier
  - Gift price ranges (e.g., "Gifts from $25-$150")

- [ ] **Add FAQ section**
  - "Where do you deliver?" (US only for now)
  - "How do you match gifts to interests?"
  - "What data do you access from my calendar?"
  - "Can I preview gifts before they're sent?"
  - "What if my recipient doesn't like the gift?"

- [ ] **Add testimonials/social proof**
  - Customer quotes (even if beta testers)
  - "500+ gifts delivered" or similar stats
  - Trust badges if applicable

- [ ] **Visual alignment audit**
  - Review all sections for consistent spacing
  - Fix any misaligned elements
  - Ensure responsive behavior is smooth

### Success Metrics

- [ ] Reduce bounce rate by 25%
- [ ] Increase scroll depth to 80%+ of page
- [ ] Zero feedback about "broken" or "empty" elements

---

## Sprint 4: Interest & Matching Transparency

### Key User Problems Identified

> *"I'm also not sure how the gift matches the interests if I didn't put in any details, just the calendar event."*

> *"Make clear what data you're scraping and assure users what will and won't be done with their data."*

**Users are confused about:**
- How gifts are matched without explicit interests
- What data is used for personalization
- Whether they have control over gift selection

### Sprint Goal

Users clearly understand how gift matching works and feel confident in the personalization.

### Features & UX Improvements

- [ ] **Explain matching logic clearly**
  - Add "How We Match Gifts" section on landing page
  - Visual diagram: Interests → Categories → Curated Selection → Your Approval

- [ ] **Make interests prominent in onboarding**
  - Require at least 2-3 interests per recipient
  - Show how interests map to gift categories in real-time
  - "Sarah loves cooking → We'll suggest artisan kitchenware"

- [ ] **Gift approval before sending**
  - Clear message: "You'll always approve gifts before we send them"
  - Show preview of suggested gift 14 days before occasion
  - Option to swap, upgrade, or skip

- [ ] **Default gift handling**
  - If no interests: "We'll suggest our most-loved universal gifts"
  - Show what "default" gifts look like
  - Encourage adding interests for better matching

### Success Metrics

- [ ] Zero complaints about "surprise" gift selection
- [ ] 80%+ of recipients have 2+ interests set
- [ ] Increase gift approval rate to 90%+

---

## Sprint 5: Subscription Value Clarity

### Key User Problems Identified

> *"Make clear the benefits of the subscription because it is not apparent to me."*

> *"I just can't justify a monthly recurring fee for such a service."*

**Users are unclear about:**
- What VIP subscription includes
- Why they should pay monthly
- What free tier limitations are

### Sprint Goal

Users understand exactly what they get for $4.99/month and feel it's worthwhile.

### Features & UX Improvements

- [ ] **Clear tier comparison**
  - Side-by-side: Free vs VIP features
  - Free: 3 recipients, manual scheduling only
  - VIP: Unlimited recipients, automation, wallet, priority support

- [ ] **Reframe subscription value**
  - "Never forget another birthday - $4.99/mo"
  - "Time saved: ~2 hours per recipient per year"
  - ROI calculation: "Less than the cost of one late apology gift"

- [ ] **Consider alternative monetization (future)**
  - Transaction fee per gift instead of subscription
  - Commission from vendors
  - Hybrid: Free with per-gift fee, or subscription for unlimited

- [ ] **VIP trial experience**
  - 14-day free VIP trial for new users
  - Show value before asking for payment
  - Clear notification before trial ends

### Success Metrics

- [ ] Increase VIP conversion rate by 30%
- [ ] Reduce subscription cancellation rate by 40%
- [ ] Increase average subscription duration to 6+ months

---

## Implementation Priority

| Sprint | Priority | Estimated Duration | Dependencies |
|--------|----------|-------------------|--------------|
| Sprint 1: Trust-First Onboarding | 🔴 Critical | 1-2 weeks | None |
| Sprint 2: Gift Discovery | 🔴 Critical | 1-2 weeks | None |
| Sprint 3: Landing Page Polish | 🟡 High | 1 week | None |
| Sprint 4: Interest Transparency | 🟡 High | 1 week | Sprint 1 |
| Sprint 5: Subscription Value | 🟢 Medium | 1 week | Sprints 1-2 |

---

## Quick Wins (Can Ship Immediately)

1. ✅ Add "Skip calendar" option in onboarding
2. ✅ Add pricing section to landing page
3. ✅ Add FAQ section to landing page
4. ✅ Fix empty card placeholders
5. ✅ Make gift showcase sections link to catalog
6. ✅ Add "How it works" explainer with clear steps

---

## User Quotes to Keep Top of Mind

> *"I like the concept of this project."*

> *"The landing page is elegant and minimalist."*

> *"Nice touch offering options like 'Continue with Google' for faster sign up."*

> *"Well executed and the design will resonate with your target audience."*

**The product has strong potential - users like the concept and design. The issues are about flow, trust, and clarity, not the core idea.**
