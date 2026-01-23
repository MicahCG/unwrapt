# Unwrapt Product Sprint Plan
## Based on User Feedback Analysis

**Date:** January 2026  
**Focus:** Reducing friction, building trust, improving clarity

---

## Feedback Summary

### Key Pain Points Identified

| Theme | Frequency | Severity |
|-------|-----------|----------|
| No gift preview before checkout | High | Critical |
| Landing page incomplete/unpolished | Medium | High |
| Subscription value unclear | Medium | High |
| Missing pricing, FAQs, testimonials | Medium | Medium |
| Product catalog hard to discover | Medium | Medium |
| Unclear how interest matching works | Medium | Medium |

---

## Sprint 1: Gift Preview Before Checkout (Priority: Critical)

---

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

Users can see gift options before committing to checkout, with subscription deferred to the final step of automation setup.

### Features & UX Improvements

- [ ] **Show gift preview before checkout in automation flow**
  - When enabling automation, show the gift that will be scheduled
  - User sees product image, price, and description before VIP checkout
  - "This gift will be sent to Sarah for her birthday" preview screen

- [ ] **Defer subscription to final automation step**
  - Only show VIP subscription checkout when user confirms gift automation
  - Not during initial onboarding or recipient setup
  - Clear value proposition at point of purchase: "Subscribe to automate this gift"

- [ ] **Public gift catalog page**
  - Create `/catalog` or `/gifts` public page accessible without login
  - Show all available products with images, descriptions, prices
  - Filter by category, price range, recipient type
  - Link from landing page hero and showcase sections

- [ ] **Make showcase sections clickable**
  - "Artisan-Made" → Opens catalog filtered to artisan items
  - "Curated With Taste" → Opens full catalog with featured items
  - "Thoughtful & Exclusive" → Opens limited edition/exclusive items

- [ ] **Improve catalog display density**
  - Show 4-6 items per row on desktop (currently 2)
  - Responsive grid: 1 column mobile, 2 tablet, 4-6 desktop
  - Quick-view modal for product details

### Success Metrics

- [ ] 30% of landing page visitors view catalog before signup
- [ ] Increase click-through rate on gift showcase sections by 50%
- [ ] Reduce "checkout surprise" complaints to zero
- [ ] Higher conversion at automation checkout (users understand what they're paying for)

---

## Sprint 2: Landing Page Polish & Clarity

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

## Sprint 3: Interest & Matching Transparency

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

## Sprint 4: Subscription Value Clarity

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
| Sprint 1: Gift Preview Before Checkout | 🔴 Critical | 1-2 weeks | None |
| Sprint 2: Landing Page Polish | 🟡 High | 1 week | None |
| Sprint 3: Interest Transparency | 🟡 High | 1 week | None |
| Sprint 4: Subscription Value | 🟢 Medium | 1 week | Sprint 1 |

---

## Quick Wins (Can Ship Immediately)

1. ✅ Add pricing section to landing page
2. ✅ Add FAQ section to landing page
3. ✅ Fix empty card placeholders
4. ✅ Make gift showcase sections link to catalog
5. ✅ Add "How it works" explainer with clear steps
6. ✅ Show gift preview in automation setup before VIP checkout

---

## User Quotes to Keep Top of Mind

> *"I like the concept of this project."*

> *"The landing page is elegant and minimalist."*

> *"Nice touch offering options like 'Continue with Google' for faster sign up."*

> *"Well executed and the design will resonate with your target audience."*

**The product has strong potential - users like the concept and design. The issues are about flow, trust, and clarity, not the core idea.**
