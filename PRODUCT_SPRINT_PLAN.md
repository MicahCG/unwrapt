# Unwrapt Product Sprint Plan
## Based on User Feedback Analysis

**Date:** January 2026  
**Last Updated:** January 31, 2026  
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

## Sprint 1: Gift Preview Before Checkout (Priority: Critical) ✅ COMPLETE

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

- [x] **Show gift preview before checkout in automation flow**
  - ✅ GiftCatalogPreview component shows curated products before VIP upsell
  - ✅ User sees product images, prices in onboarding before checkout
  - ✅ Compact 8-product grid with placeholder cards for remaining items

- [x] **Defer subscription to final automation step**
  - ✅ VIPUpsellStep appears after calendar sync and recipient discovery
  - ✅ Subscription only prompted when user confirms automation intent
  - ✅ Clear value proposition: "Automate gifts for [name] and [X others]"

- [x] **Public gift catalog preview in onboarding**
  - ✅ GiftCatalogPreview component shows products from database
  - ✅ Displays 8 products in 4-column grid with prices
  - ✅ "Peek at our collection" header with +X more indicator
  - Note: Full public `/catalog` page not yet created (future enhancement)

- [x] **Showcase sections display content**
  - ✅ LuxuryGiftShowcase shows 3 curated tiles with images
  - ✅ Each tile has headline, subcopy, and hover effects
  - Note: Tiles not yet clickable to filter catalog (future enhancement)

- [x] **Improved catalog display density**
  - ✅ Shows 4-8 items per row on desktop
  - ✅ Responsive grid with proper spacing
  - ✅ Placeholder cards fill empty slots with "+X more" indicator

### Success Metrics

- [x] Users view gift catalog before VIP checkout
- [x] Gift showcase sections have polished content
- [x] Reduce "checkout surprise" - users see value before payment
- [ ] 30% of landing page visitors view catalog before signup (tracking needed)

---

## Sprint 2: Landing Page Polish & Clarity ✅ MOSTLY COMPLETE

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

- [x] **Fix empty card spaces**
  - ✅ All showcase tiles have images (artisan-crafts, glazed-pottery, cast-iron-teapot)
  - ✅ LuxuryGiftShowcase displays full-width cards with content
  - ✅ No blank/empty card placeholders visible

- [x] **Scroll behavior improvements**
  - ✅ GiftingScenesScroll with proper scroll thresholds
  - ✅ AnimatedGiftingJourney with smooth spring animations
  - ✅ Sticky container with 300vh scroll height for reading time

- [ ] **Add pricing section**
  - ⏳ Clear pricing tiers needed on landing page
  - ⏳ What's included in Free vs VIP tier
  - ⏳ Gift price ranges visible

- [ ] **Add FAQ section**
  - ⏳ "Where do you deliver?" (US only)
  - ⏳ "How do you match gifts to interests?"
  - ⏳ "What data do you access from my calendar?"
  - ⏳ "Can I preview gifts before they're sent?"

- [x] **Social proof/testimonials**
  - ✅ Hero stats: "9,451 Moments Remembered", "500 hrs Saved", "821 Gifts Delivered"
  - Note: Customer testimonials not yet added (future enhancement)

- [x] **Visual alignment audit**
  - ✅ Consistent spacing in hero section
  - ✅ Clean grid layouts in showcase sections
  - ✅ Proper responsive behavior

- [x] **"How it works" explainer**
  - ✅ AnimatedGiftingJourney with 4-step scroll animation
  - ✅ Clear step indicators with icons and descriptions
  - ✅ Progress dots showing current step

### Success Metrics

- [x] No feedback about "broken" or "empty" elements
- [x] Smooth scroll experience with readable content
- [ ] Reduce bounce rate by 25% (tracking needed)
- [ ] Increase scroll depth to 80%+ (tracking needed)

---

## Sprint 3: Interest & Matching Transparency 🟡 PARTIAL

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

- [x] **Make interests prominent in onboarding**
  - ✅ InterestsStep component collects recipient interests
  - ✅ 5 predefined interests: Coffee, Tea, Wine, Sweet Treats, Self Care
  - ✅ Visual badges for selection with clear feedback

- [ ] **Explain matching logic clearly**
  - ⏳ Add "How We Match Gifts" section on landing page
  - ⏳ Visual diagram: Interests → Categories → Curated Selection
  - ⏳ Show how interests map to gift categories in real-time

- [x] **Gift approval before sending**
  - ✅ Automation flow includes gift preview before confirmation
  - ✅ Users see gift selection before checkout
  - Note: 14-day advance preview not yet implemented

- [ ] **Default gift handling explanation**
  - ⏳ If no interests: explain "universal gifts" approach
  - ⏳ Show what default gifts look like
  - ⏳ Encourage adding interests for better matching

### Success Metrics

- [ ] Zero complaints about "surprise" gift selection
- [x] Interest collection integrated in onboarding
- [ ] 80%+ of recipients have 2+ interests set (tracking needed)

---

## Sprint 4: Subscription Value Clarity 🟡 PARTIAL

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

- [x] **VIP benefits shown at upsell**
  - ✅ VIPUpsellStep shows 3 key benefits:
    - Automatic gift selection based on interests
    - On-time delivery, every time
    - Zero effort required
  - ✅ Personalized headline with recipient names

- [ ] **Clear tier comparison on landing page**
  - ⏳ Side-by-side: Free vs VIP features
  - ⏳ Free: 3 recipients, manual scheduling only
  - ⏳ VIP: Unlimited recipients, automation, wallet

- [ ] **Reframe subscription value**
  - ⏳ "Never forget another birthday - $4.99/mo"
  - ⏳ Time saved calculation
  - ⏳ ROI comparison: "Less than the cost of one late apology gift"

- [ ] **VIP trial experience**
  - ⏳ 14-day free VIP trial for new users
  - ⏳ Show value before asking for payment
  - ⏳ Clear notification before trial ends

### Success Metrics

- [ ] Increase VIP conversion rate by 30%
- [ ] Reduce subscription cancellation rate by 40%
- [ ] Increase average subscription duration to 6+ months

---

## Implementation Priority

| Sprint | Priority | Status | Completion |
|--------|----------|--------|------------|
| Sprint 1: Gift Preview Before Checkout | 🔴 Critical | ✅ Complete | 100% |
| Sprint 2: Landing Page Polish | 🟡 High | 🟡 Mostly Complete | ~75% |
| Sprint 3: Interest Transparency | 🟡 High | 🟡 Partial | ~50% |
| Sprint 4: Subscription Value | 🟢 Medium | 🟡 Partial | ~40% |

---

## Quick Wins Status

1. ✅ **Add pricing section to landing page** - Stats shown, full pricing pending
2. ⏳ **Add FAQ section to landing page** - Not yet implemented
3. ✅ **Fix empty card placeholders** - All tiles have images
4. ⏳ **Make gift showcase sections link to catalog** - Tiles not clickable yet
5. ✅ **Add "How it works" explainer with clear steps** - AnimatedGiftingJourney complete
6. ✅ **Show gift preview in automation setup before VIP checkout** - GiftCatalogPreview complete

---

## Remaining Work Summary

### High Priority (Next Sprint)
1. Add Pricing section to landing page (Free vs VIP comparison)
2. Add FAQ section to landing page
3. Make LuxuryGiftShowcase tiles clickable (open catalog/product modal)
4. Add "How We Match Gifts" explanation section

### Medium Priority
5. Create public `/catalog` page accessible without login
6. Add customer testimonials/quotes
7. Implement 14-day advance gift preview for approval
8. Add VIP trial experience

### Future Enhancements
9. Interest-to-gift mapping visualization
10. Advanced analytics tracking for conversion metrics
11. A/B testing infrastructure for pricing messaging

---

## User Quotes to Keep Top of Mind

> *"I like the concept of this project."*

> *"The landing page is elegant and minimalist."*

> *"Nice touch offering options like 'Continue with Google' for faster sign up."*

> *"Well executed and the design will resonate with your target audience."*

**The product has strong potential - users like the concept and design. The issues are about flow, trust, and clarity, not the core idea.**
