# Unwrapt — Landing → Onboarding → Registration Recreation Guide

> Goal: give an agent everything needed to recreate the **first-run experience** of Unwrapt — the marketing landing page, the sign-up/registration flow, recipient capture via Google Calendar (plus alternatives), interest/vibe categorization, and all the early "set the user up for success" touches before they reach the dashboard.

Stack the original is built on: **Vite + React 18 + TypeScript + React Router + shadcn/ui (Radix) + TailwindCSS + Supabase (auth, Postgres, edge functions) + Stripe + TanStack Query + framer-motion**. You don't have to match the stack, but you must match the **flow, copy, visual language, and data model** below.

---

## 1. Brand & Visual Theme

The whole experience is a **warm, luxury, editorial** aesthetic — think champagne/cream/gold on charcoal, serif display headings, lots of soft shadows and rounded cards. No bright/saturated colors anywhere (the Tailwind config literally overrides red/green/blue/purple/etc. to charcoal/black so accidental bright colors can't appear).

### Color palette (the source of truth)

**Core luxury palette (CSS variables, HSL):**
| Token | Value | Use |
|---|---|---|
| `--ivory` | `#FAF8F3` (`40 43% 97%`) | App background |
| `--sand` | `#EFE7DD` (`33 33% 90%`) | Cards/secondary surfaces |
| `--cream-border` | `#E4DCD2` | Borders/inputs |
| `--champagne-gold` | `#D2B887` (`43 33% 68%`) | Primary accent / ring |
| `--charcoal-text` | `#1A1A1A` | Primary text |

**Onboarding-specific brand vars:**
| Token | Value |
|---|---|
| `--unwrapt-bg-1 / 2 / 3` | `#f8f1e9` / `#f3dfcf` / `#f5eadd` (rotating step backgrounds) |
| `--unwrapt-card-bg` | `#ffffff` |
| `--unwrapt-text-main` | `#2f2b28` |
| `--unwrapt-text-subtle` | `#6c645d` |
| `--unwrapt-accent` | `#e6b77a` |
| `--unwrapt-button` / `-text` | `#2f2b28` / `#ffffff` |
| `--unwrapt-radius-card` | `28px` |
| `--unwrapt-shadow-card` | `0 24px 60px rgba(15, 7, 0, 0.18)` |

**Brand named colors (Tailwind):** `brand.charcoal #4A4A4A`, `brand.cream #F5F2ED`, `brand.cream-light #F8F6F1`, `brand.gold #D4A574`, `brand.peach #F2D5C4`, `brand.blush #F5E6E8`, `brand.beige #E8D5C4`.

**Landing hero accents used inline:** background `#F8F1E6`, hero text/headings `#8B7355` (warm brown), CTA buttons `#D4AF7A` (gold) with glow shadow `rgba(212,175,122,0.25 → 0.45 on hover)`. Intro animation colors: bg `#F7F0E6`, inner `#F1E3D0`, gold `#D4AF7A`, brown `#5B4633`.

### Typography
- **Headings (h1–h6):** `Playfair Display`, serif. Onboarding intro headline uses `Cormorant Garamond` → `Playfair Display` fallback.
- **Body:** `Inter`, sans-serif (with `system-ui` fallbacks for onboarding).
- Hero headlines are large: `text-5xl md:text-6xl lg:text-7xl`, tight tracking, relaxed leading.

### Shape & motion language
- Rounded everything: cards `~28px`, buttons fully rounded (`rounded-full`), `--radius: 1.5rem`.
- Glassmorphism on overlays: `bg-white/25 backdrop-blur-[16px]`, `border-white/60`.
- Soft, large, warm shadows. Subtle SVG grid texture overlay at `opacity-[0.03]`.
- Signature animations (all defined in `index.css`): `heroOpen` (card scales in 900ms), `bowFloat` (gift icon float), `fadeInUp`, `slideInRight`, onboarding typewriter blink (`onb-blink`), and the `GiftBoxOpeningIntro` framer-motion splash.
- Respect `prefers-reduced-motion` (the intro splash has a reduced variant — just fades the wordmark).

---

## 2. Routing & Domain Architecture

Two-domain model, split in `src/App.tsx`:

- **`unwrapt.io`** = marketing site → root `/` renders `<Landing>`.
- **`app.unwrapt.io`** (and `localhost`) = the app → root `/` renders `<Index>` (auth + onboarding + dashboard gate).

Key routes:
| Path | Component | Notes |
|---|---|---|
| `/` | `Landing` or `Index` | chosen by `window.location.hostname === 'unwrapt.io'` |
| `/landing` | `Landing` | explicit marketing route |
| `/onboarding` | `Onboarding` | auth-gated wrapper around `OnboardingFlow` |
| `/auth/callback` | `OAuthCallback` | Google **sign-in** OAuth return |
| `/auth/calendar/callback` | `CalendarOAuthCallback` | Google **Calendar** OAuth return (separate from sign-in) |
| `/payment/success` | `PaymentSuccess` | post-Stripe |
| `/privacy`, `/terms` | static legal pages | |

Providers wrap everything: `QueryClientProvider` → `TooltipProvider` → `AuthProvider` → `BrowserRouter` (+ `ScrollToTop`, two toasters).

---

## 3. The Landing Page (`src/pages/Landing.tsx`)

Single-domain marketing page. Structure top to bottom:

1. **`GiftBoxOpeningIntro` splash** (always shown on `unwrapt.io`; it deliberately clears `hasSeenLandingIntro`/`hasSeenIntro` from localStorage so the splash replays each visit). Full-screen, ~2.1s, gift-box-opening framer-motion animation on `#F7F0E6`, then fades.
2. **Sticky glass nav** — hidden until `window.scrollY > 100`, then slides down. Glass style (`bg-white/25 backdrop-blur-[16px]`). Contains `Logo` + a "Get Started" `GlassButton`.
3. **Hero** (`#F8F1E6`, animated `hero-frame`):
   - H1: **"Never Miss a Moment"** (`#8B7355`, serif, up to `7xl`).
   - Sub: *"We remember every occasion, find the perfect gift, and deliver it so you become the most thoughtful person you know."*
   - **3 stat cards** (glass): `Heart` **9,451** "Moments Remembered" · `Clock` **500 hrs** "Saved" · `Gift` **821** "Gifts Delivered".
   - CTA: **"Get Started Free"** gold pill button.
   - Schema.org `Service`/`Offer` microdata + an `sr-only` SEO block for AI crawlers.
4. **`GiftingScenesScroll`** — scroll-driven gifting scenes section.
5. **`AnimatedGiftingJourney`** — animated journey section.
6. **`LuxuryGiftShowcase`** — product/lifestyle showcase.
7. **Final CTA** — H2 *"Set up your gifting concierge in 2 minutes"* + "Get Started Free".
8. **Footer** — Privacy / Terms / Contact (`support@unwrapt.io`), "© 2026 Unwrapt".

**Critical CTA behavior — every "Get Started" button does the same two things:**
```js
localStorage.setItem("shouldShowOnboardingIntro", "true");
signInWithGoogle();
```
This flag is what tells `Index` (on the app domain, after OAuth round-trip) to play the onboarding intro before the onboarding flow.

> There's also a legacy email-capture path (`handleGetStarted`) that POSTs the email to a Make.com webhook and stashes it in `sessionStorage.userEmail`, then redirects to the app. The visible CTAs use the Google sign-in path; keep the email path only if you want a lead-capture fallback.

---

## 4. Authentication / Registration (`AuthProvider` + `LoginPage`)

**There is no email/password or custom registration form.** Registration = **Google OAuth sign-in via Supabase**. "Sign up" and "log in" are the same button; a first-time Google user is implicitly registered.

`src/components/auth/AuthProvider.tsx`:
- Wraps `supabase.auth`. Exposes `{ user, loading, signInWithGoogle, signOut }`.
- On mount: `getSession()` then subscribes to `onAuthStateChange`. Cleans the OAuth hash (`access_token`) from the URL after `SIGNED_IN`.
- `signInWithGoogle()`:
  - Client-side **rate limiting** (`RATE_LIMITS.AUTH_ATTEMPTS`) + a 60s cooldown on 429/"rate limit".
  - Computes `redirectTo` by host: `localhost` → `http://localhost:<port>/`; `unwrapt.io` → `https://app.unwrapt.io/` (marketing always bounces to app subdomain); else same origin.
  - Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
- Dev-only "fake auth" via a `fake-auth` window event and a hardcoded dev user id `00000000-0000-0000-0000-000000000001` (skips onboarding).

`src/components/auth/LoginPage.tsx` (shown to returning, signed-out users on the app domain):
- Centered card on `bg-brand-cream`, `Logo`, three glass feature bullets:
  1. "Automate your gifts"
  2. "Curate them based on interests"
  3. "Save time and show you care"
- One big **Google "Get Started"** button (full multicolor Google `G` SVG inline) → `signInWithGoogle()`.

---

## 5. The App Gate (`src/pages/Index.tsx`)

This is the decision tree that routes an authenticated user to intro vs. onboarding vs. dashboard. Recreate this logic exactly:

```
loading? → spinner
on mount:
  if localStorage.shouldShowOnboardingIntro === 'true' AND user → showIntro=true, clear flag
  else if no user → if !hasSeenIntro show OnboardingIntro else show LoginPage

onboarding-status query (TanStack, staleTime 0, refetchOnWindowFocus):
  - dev fake user → true (skip)
  - else: SELECT id FROM recipients WHERE user_id=? LIMIT 1
  - has ≥1 recipient → completed = true ; else false   (recipients existence == onboarding done)

render(user present):
  showIntro            → <OnboardingIntro onComplete=... />
  hasCompletedOnboarding→ <Dashboard />
  else                 → <OnboardingFlow onBack=... />   (onBack refetches status → reveals dashboard)

render(no user):
  showIntro → <OnboardingIntro/>  else <LoginPage/>
```

**Onboarding completion is implicit: "has at least one recipient row" = onboarded.** There is no `onboarded` boolean.

---

## 6. The Onboarding Intro (`src/components/OnboardingIntro.tsx`)

A 3-slide typewriter story shown right after sign-in. Visual: full-screen radial-gradient backgrounds that rotate per slide (`onb-bg-1/2/3`), a white rounded card (`onb-card`), an icon circle, typewriter headline (40ms/char) with a blinking cursor, fade-in body, progress dots, "Skip intro" top-right.

Slides:
1. **clock** — "Life moves fast." — *"Between work, family, and everything in between, it's easy to lose track of the moments that matter most."*
2. **heart** — "But the people you love shouldn't fade into the background." — *"Birthdays, anniversaries, and quiet milestones deserve to be remembered, celebrated, and felt — not rushed or forgotten."*
3. **gift** — "Unwrapt remembers, so they always feel cherished." — *"We quietly track important dates, curate beautiful gifts, and schedule everything for you. Showing up thoughtfully feels effortless."*

Behavior: slides 1–2 **auto-advance** 2.5s after typing finishes. The **last slide does not auto-advance** — it reveals a gold **"Connect Calendar"** button (`Calendar` icon) that kicks off the Google Calendar OAuth directly (see §8). "Skip intro" and completion set `localStorage.hasSeenIntro = 'true'`.

---

## 7. The Onboarding Flow Engine (`src/components/OnboardingFlow.tsx`)

A single stateful controller that renders different step sequences depending on how the user enters. Header = back button (after step 1) + `Logo` (links to unwrapt.io) + `UserMenu` (settings hidden). A thin charcoal progress bar (`currentStep / totalSteps`).

It checks the user's `profiles.subscription_tier` up front; if already `vip`, the VIP upsell step is skipped/auto-completed.

### The branching paths (this is the heart of it)

`getTotalSteps()` and `renderStep()` pick a path from accumulated `onboardingData`:

| Entry condition | Path | Steps |
|---|---|---|
| **Calendar has events** (default happy path) | Calendar → **VIP Upsell** → complete (recipients auto-created from all imported dates) | 2 visible after calendar |
| Calendar-based w/ interests variant | Calendar → Interests → Gift Schedule | 3 |
| **Skip calendar / no events** (`noCalendarEvents + startManualEntry`) | Calendar → Recipient → VIP Upsell | 3 |
| Manual recipient added | Calendar → Recipient → Gift Schedule | 3 |
| Manual recipient data already captured | Calendar → Gift Schedule | 2 |
| No recipients found | Calendar → Gift Schedule (with manual name entry) | 2 |

> The codebase has accumulated several overlapping branches. The **two that matter for a clean recreation** are: (A) **calendar finds events → create recipients in bulk → VIP upsell → dashboard**, and (B) **skip/empty → manual RecipientStep → VIP upsell → dashboard**. The Interests/GiftSchedule/payment branches are an alternate "schedule your first gift during onboarding" variant.

### What gets written on completion
- `createRecipientsFromCalendarData(importedDates)`: groups events by lowercased `personName`, merges each person's birthday + anniversary, **dedupes against existing recipients** (name match AND a date match), then bulk-inserts `recipients` rows (`notes: "Imported from Google Calendar during onboarding"`).
- Manual paths insert a single `recipients` row (with address + relationship + gift vibe).
- If a first gift was scheduled, inserts a `scheduled_gifts` row.
- Calls RPC `calculate_user_metrics(user_uuid)`.
- Invalidates `onboarding-status`, `recipients`, `user-metrics` queries; toasts **"Welcome to Unwrapt!"** with recipient count; `onBack()` → dashboard.

---

## 8. Recipient Capture via Google Calendar (the core feature)

Two OAuth flows exist and are **separate**: (1) Supabase Google sign-in (identity), (2) Google **Calendar** read access (data). Calendar uses its own callback `/auth/calendar/callback` and its own edge function.

### 8.1 `CalendarStep` (`src/components/onboarding/CalendarStep.tsx`)
UI states:
- **Not connected:** hero illustration + 3-step explainer ("Tell us who matters → We pick the perfect gift → Sit back and relax"), primary **"Connect Google Calendar"** button, and a **"Skip and add recipients manually"** link.
- **Fetching:** spinner "Fetching your calendar events…".
- **Success:** sparkles + "Amazing! We found {N} important dates", shows top ~5 soonest events (person name, date, 🎂 birthday / 💕 anniversary), auto-advances after ~4s.
- **No events:** "No Events, No Problem!" + gift catalog preview + "Add Your First Recipient" (→ manual entry).

It checks for an existing connection via RPC `get_my_calendar_integration()`; if absent, invokes the edge function `get_auth_url` and redirects to Google; on return it invokes `fetch_events`.

### 8.2 Edge function (`supabase/functions/google-calendar/index.ts`)
Actions: `get_auth_url`, token exchange (in callback), `fetch_events` (onboarding, next 12 months), `fetch_dashboard_events` (post-onboarding sync, broader).

**OAuth URL:**
```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={GOOGLE_CLIENT_ID}
  &redirect_uri={origin}/auth/calendar/callback
  &scope=https://www.googleapis.com/auth/calendar.readonly
  &response_type=code&access_type=offline&prompt=consent
```
- Scope: **`calendar.readonly`** only. `access_type=offline` + `prompt=consent` to guarantee a refresh token.

**Token storage:** access + refresh tokens are **AES-GCM 256-bit encrypted** (Web Crypto, key from `TOKEN_ENCRYPTION_KEY` env, random 12-byte IV) before being written to a `calendar_integrations` table. Only the service role decrypts them server-side; the client never sees raw tokens. Auto-refresh if expiring within 5 minutes.

**Event fetch:** `GET /calendar/v3/calendars/primary/events?maxResults=250&singleEvents=true&orderBy=startTime`, time window = today → +365 days. `singleEvents=true` expands recurring annual birthdays into instances.

**Filtering:** keep events whose summary OR description contains any of: `birthday`, `bday`, `anniversary`, `born`, `wedding`.

**Type classification:** summary contains `anniversary` or `wedding` → `type: 'anniversary'`, else `type: 'birthday'`.

**Date:** use `event.start.date` (all-day, `YYYY-MM-DD`) or `event.start.dateTime` (ISO).

### 8.3 Person-name extraction — `extractPersonFromEvent(summary)` (verbatim logic)
Lowercase the summary for matching but slice from the original for the name. In order:
1. `"<Name>'s birthday"` / `"'s bday"` → take text before `'s birthday`/`'s bday`.
2. `"<Name>'s anniversary"` → split on `'s`, take `[0]`.
3. `"<Name> birthday"` / `"<Name> bday"` (no apostrophe) → remove the word `birthday|bday`, trim.
4. `"<Name> anniversary"` → remove `anniversary`, trim.
5. `"birthday - <Name>"` / `"bday - <Name>"` → split on `-`, take `[1]`.
6. `"anniversary - <Name>"` → split on `-`, take `[1]`.
7. **Fallback:** first word that is length > 2, starts uppercase, and is not in `['Birthday','Bday','Anniversary','The','And','Or']`.
8. Post-process: strip a trailing `'s`.

Examples: "Alice's Birthday"→"Alice", "Mom Birthday"→"Mom", "Anniversary - Bob"→"Bob", "Sarah bday"→"Sarah".

Each parsed event → `{ summary, date, type: 'birthday'|'anniversary', personName }`, which becomes a `recipients` row (`name`, `birthday` and/or `anniversary` set by type).

### 8.4 Post-onboarding sync (`src/components/CalendarSyncButton.tsx`)
Reusable dashboard button: connects if needed, calls `fetch_dashboard_events`, groups/dedupes by person (name match + at least one date match against existing recipients), inserts only new people (`notes: "Auto-imported from Google Calendar"`).

### 8.5 More recipient-capture options to offer (your ask — give more options)
Currently implemented: **Google Calendar import** + **manual entry** (`RecipientStep`). Recommended additional capture channels to add for a recreation:
- **Apple / Outlook / ICS calendar** import (same parser, different OAuth/upload). Accept `.ics` upload for any provider.
- **Google / phone Contacts import** (People API `birthdays` field — no text parsing needed; map `contact.name` + `birthday` directly).
- **CSV / paste upload** ("Name, Relationship, Birthday, Anniversary, Address").
- **Share/invite link** where the recipient fills their own address + interests (solves the missing-address problem for calendar imports).
- **Social connect** (e.g., import friends' birthdays) — optional.
Keep the same normalized recipient shape regardless of source.

---

## 9. Manual Recipient Entry (`src/components/onboarding/RecipientStep.tsx`)
Form fields:
- **Full Name** (required)
- **Relationship** (required): Mom, Dad, Partner/Spouse, Child, Sibling, Friend, Colleague, Other
- **Birthday** (optional date picker; pre-filled from a selected calendar event)
- **Gift Style / Vibe** (required) — three choices mapping to the vibe enum (see §10): Home & Atmosphere → `CALM_COMFORT`, Personal & Mindful → `ARTFUL_UNIQUE`, Luxe & Elegant → `REFINED_STYLISH` (each shows inspirational product images)
- **Delivery Address** (required): street, city, state, zip, country (default "United States"; dropdown US/CA/UK/AU)

---

## 10. Categorization: Interests & Gift Vibes

This is how Unwrapt personalizes gifts. Two orthogonal axes:

### 10.1 Interests (`src/components/onboarding/InterestsStep.tsx`)
- Header "What are their interests?" / "Select interests that will help us find the perfect gifts".
- **Options (5):** Coffee, Tea, Wine, Sweet Treats, Self Care.
- Multi-select **chips/badges** (no max; ≥1 required). Selected = filled charcoal; unselected = outlined. Stored as `recipients.interests string[]`.
- Interests map to Shopify collections via `INTEREST_COLLECTION_MAP` (`coffee→gifts-coffee`, `chocolate→gifts-chocolate`, `candles→gifts-candles`, default `gifts-all`). Multi-interest tries each in order, first that yields products wins, falls back to `gifts-all`.

### 10.2 Gift Vibe (`src/lib/giftVibes.ts`) — enum `gift_vibe`
The aesthetic/personality axis, stored on `recipients.preferred_gift_vibe` (default `CALM_COMFORT`) and per gift on `scheduled_gifts.gift_vibe`; products also carry a `gift_vibe`.

| Enum | Label | Description | Examples |
|---|---|---|---|
| `CALM_COMFORT` | Calm & Comfort | Soft lighting, soothing scents, cozy rituals | Candles, aromatherapy, relaxation |
| `ARTFUL_UNIQUE` | Artful & Cultural | Handmade pieces, heritage details, objects with a story | Pottery, incense, artisan crafts |
| `REFINED_STYLISH` | Refined & Stylish | Elegant glassware, sculpted decor, statement pieces | Glassware, vases, barware |

User can skip vibe → "We'll choose a cozy, universally loved gift by default" (= `CALM_COMFORT`).

### 10.3 Preferences (`PreferencesStep.tsx`) — alternate/extended capture
- **Budget per gift:** Under $25 / $25–50 / $50–100 / $100–200 / $200–500 / Over $500.
- **Gift style:** Practical & Useful / Luxury & Premium / Experiences & Activities / Sentimental & Personal / Trendy & Modern / Handmade & Artisanal.
- **Delivery timing:** 1 week before / 2–3 days before / day before / on the date / flexible.
- **Special requests:** free text (optional).

---

## 11. First Gift Scheduling (`src/components/onboarding/GiftScheduleStep.tsx`)
Captures and (optionally) schedules the user's first gift during onboarding:
- **Occasion** (select): Birthday, Anniversary, Valentine's Day, Christmas, Mother's Day, Father's Day, Graduation, Just Because, Other.
- **Occasion date** (picker).
- **Gift type / product** (selector auto-filtered by interests; `InterestBasedProductSelector` / `ProductSelector`).
- **Price range** from selected product. **Vibe** inherited from recipient (or `CALM_COMFORT`).
- **Delivery date** auto-computed ≈ 4 days before occasion.
- Inserts `scheduled_gifts` (`status:'scheduled'`, `payment_status:'unpaid'`), stashes `pendingGiftData` in localStorage, then opens **Stripe checkout** via the `create-gift-payment` function (unless `hidePayment`). `PaymentStep.tsx` is the alternate inline card form ("Unwrapt Premium Monthly $29.99/mo, 7-day free trial, cancel anytime").

`GiftCatalogPreview.tsx`: trust-builder grid of up to 8 real products ("Peek at our collection — artisan-made, beautifully wrapped"), with "+N more gifts" cards. Shown on the no-events path.

---

## 12. Subscription Tiers & VIP Upsell

`profiles.subscription_tier`: `free` (default) | `vip` | `premium` | `premium_annual`. Related: `subscription_status`, `trial_ends_at`, `gift_wallet_balance`, `wallet_auto_reload`, `wallet_reload_threshold` ($50), `wallet_reload_amount` ($100).

- **Free:** max **3 recipients** (enforced by a DB trigger `validate_recipient_limit()`), manual scheduling only.
- **VIP/Premium:** unlimited recipients, automatic gift scheduling, gift wallet w/ auto-reload, priority support.

### `VIPUpsellStep.tsx` (shown in onboarding unless already VIP)
"Automate gifts for {firstName} and {N} others" + benefits: automatic curated selection, on-time delivery, zero effort. "Skip" → finish as free user.

### `VIPWelcomeModal.tsx` (4-step, after upgrading)
1. **Welcome to VIP** — unlimited recipients, auto scheduling, wallet + auto-reload, priority support.
2. **Fund wallet** — presets $100/$200/$300 or custom (min $50); shows est. gifts (~1 per $43); "Skip for now".
3. **Set gift preferences** — per upcoming recipient: toggle automation + choose vibe (radio).
4. **All set** — timeline: 14 days before reserve funds → 10 days before confirm address → 3 days before ships.

---

## 13. Setting Users Up for Success (pre-dashboard & first-session nudges)

These are the touches that make the user feel progress and momentum early:

- **`OnboardingIntro`** (§6) — emotional 3-slide story framing the value before any work.
- **`WelcomeStep.tsx`** — "Never miss another important moment" / "Set up thoughtful gift-giving on autopilot in under 5 minutes"; feature preview (Smart Calendar Integration, Curated Gift Selection, Perfect Timing); social proof "Join 1,000+ people…"; "Get Started — It's Free / up to 3 recipients / no credit card".
- **Calendar auto-import** does the heavy lifting so the dashboard isn't empty on arrival — the single biggest "set up for success" mechanic.
- **`calculate_user_metrics` RPC** runs on completion so the dashboard immediately shows "gifts scheduled" / "hours saved" (≈192 min ≈ 3.2 hrs per recipient-with-gifts).
- **`WelcomeGuide.tsx`** (dashboard card if empty) — "Welcome, {firstName}!" + 3-step visual guide (Add someone special → Set their important dates → We handle the rest) + "Add Your First Recipient"; dismissal stored in `localStorage.welcomeGuideDismissed`; footer stats "2-min setup · Curated gifts · Never miss a date".
- **`WelcomeOverlay.tsx`** (returning login) — typewriter "Welcome back, {firstName}", progress wheel of scheduled/total, "X gifts scheduled this year", "Saving you Y hours"; auto-dismiss ~3.5s.
- **`MonthlyOpportunitiesOverlay.tsx`** (recurring) — finds unscheduled occasions this month (fallback: next 2 weeks); "You have N chances to be thoughtful this month 🎁" listing up to 3, or "You're all set for this month 🎉"; typewriter + auto-dismiss ~3s.

---

## 14. Data Model (minimum tables to recreate)

**`recipients`**
```
id uuid pk, user_id uuid fk,
name text, email text?, phone text?,
birthday date?, anniversary date?,
relationship text?, interests text[],
street/city/state/zip_code/country text?,  (legacy: address text?)
preferred_gift_vibe enum gift_vibe default 'CALM_COMFORT',
automation_enabled bool default false,
notes text?, created_at, updated_at
-- trigger validate_recipient_limit(): free tier max 3
```
**`profiles`**: `id` (=auth user), `subscription_tier` default 'free', `subscription_status`, `trial_ends_at`, `gift_wallet_balance`, `wallet_auto_reload`, `wallet_reload_threshold`, `wallet_reload_amount`.
**`scheduled_gifts`**: `id`, `user_id`, `recipient_id`, `occasion`, `occasion_date`, `gift_type`, `price_range`, `gift_vibe`, `delivery_date`, `status` ('scheduled'…), `payment_status` ('unpaid'…).
**`calendar_integrations`**: `user_id`, `provider` ('google'), `access_token` (encrypted), `refresh_token` (encrypted), `expires_at`.
**`products`**: include a `gift_vibe` enum + `active`/`available_for_sale` flags.
**RPCs:** `get_my_calendar_integration()`, `calculate_user_metrics(user_uuid)`, plus the recipient-limit trigger.
**Edge functions:** `google-calendar` (OAuth + fetch + parse), `create-gift-payment` (Stripe).

---

## 15. End-to-End Flow Summary (the path to recreate)

```
unwrapt.io Landing
  └─ GiftBoxOpeningIntro splash → hero + scroll sections
  └─ "Get Started Free": set localStorage.shouldShowOnboardingIntro=true → Google sign-in
       └─ OAuth redirect to app.unwrapt.io/
app.unwrapt.io Index (gate)
  └─ shouldShowOnboardingIntro → OnboardingIntro (3 slides; last slide = Connect Calendar)
  └─ OnboardingFlow:
       Step 1 CalendarStep
         ├─ Connect Google Calendar (readonly OAuth → /auth/calendar/callback → encrypted tokens)
         │    └─ fetch_events → filter (birthday/bday/anniversary/born/wedding)
         │         → extractPersonFromEvent → {personName,date,type}
         │    └─ "Found N dates" → auto-advance
         ├─ No events → catalog preview → manual RecipientStep
         └─ Skip → manual RecipientStep
       Step 2/3 (path-dependent): Interests / RecipientStep / GiftScheduleStep / VIPUpsell
       Complete:
         - bulk-create recipients (dedupe by name+date)
         - optional scheduled_gifts (+ Stripe)
         - calculate_user_metrics, invalidate queries, toast "Welcome to Unwrapt!"
Dashboard
  └─ WelcomeGuide (if empty) / WelcomeOverlay (returning) / MonthlyOpportunitiesOverlay
```

**Guiding principles to preserve:** warm luxury aesthetic; serif headlines on cream/gold; one-tap Google auth (auth == registration); calendar import that fills the dashboard automatically; interests + 3 gift vibes for personalization; free=3-recipient cap with VIP upsell; emotional intro + progress/metric overlays that make the user feel thoughtful and set up before they ever "work."
