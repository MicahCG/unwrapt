# Unwrapt iOS App Store launch

Capacitor shell around the existing React app. Bundle ID: **`io.unwrapt.app`**.

## Prerequisites (on a Mac with full Xcode)

1. Install [Xcode](https://developer.apple.com/xcode/) from the Mac App Store (not just Command Line Tools).
2. `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
3. `sudo gem install cocoapods` (or `brew install cocoapods`)
4. Apple Developer Program membership ($99/yr).
5. RevenueCat account + App Store Connect app + auto-renewable subscription.

## Build & open in Xcode

```bash
cd Code/unwrapt
npm install
# Set VITE_REVENUECAT_IOS_API_KEY in .env before production builds
npm run ios
```

Then in Xcode:

1. Select your Team under Signing & Capabilities.
2. Confirm Associated Domains: `applinks:app.unwrapt.io`, `webcredentials:app.unwrapt.io`.
3. Replace `TEAMID` in `public/.well-known/apple-app-site-association` with your Team ID, redeploy web.
4. Archive → Distribute → TestFlight / App Store.

## App Store Connect — VIP subscription

| Field | Value |
| --- | --- |
| Product ID | `unwrapt_vip_monthly` |
| Type | Auto-renewable subscription |
| Price | $4.99 / month (match web VIP) |
| Subscription group | Unwrapt VIP |

## RevenueCat

1. Create iOS app with bundle `io.unwrapt.app`.
2. Entitlement ID: **`vip`** (must match `VIP_ENTITLEMENT_ID` in `src/lib/iap.ts`).
3. Attach `unwrapt_vip_monthly` to a Monthly package in the current Offering.
4. Webhook URL: `https://<project>.supabase.co/functions/v1/revenuecat-webhook`
5. Authorization header: `Bearer <REVENUECAT_WEBHOOK_SECRET>` (same secret as Supabase secret).
6. Put the public iOS SDK key in `VITE_REVENUECAT_IOS_API_KEY` for production builds.

Deploy edge functions:

```bash
supabase functions deploy revenuecat-webhook
supabase functions deploy revenuecat-sync
supabase secrets set REVENUECAT_WEBHOOK_SECRET=your-secret
# Secret (sk_...) API key from RevenueCat › Project settings › API keys; revenuecat-sync
# uses it to confirm a purchase before granting VIP.
supabase secrets set REVENUECAT_SECRET_API_KEY=sk_xxxxxxxx
```

## OAuth / Universal Links checklist

- [ ] Host `https://app.unwrapt.io/.well-known/apple-app-site-association` (no `.json` extension, `application/json`).
- [ ] Replace `TEAMID` with your Apple Team ID in that file.
- [ ] Supabase Auth → redirect URLs include `https://app.unwrapt.io/**`.
- [ ] Google Cloud OAuth client includes `https://app.unwrapt.io/auth/calendar/callback`.
- [ ] Google Calendar edge function allows that redirect URI.

## Privacy Nutrition Labels (suggested)

| Data | Linked to user | Used for tracking | Purpose |
| --- | --- | --- | --- |
| Email | Yes | No | Account |
| Name | Yes | No | Account / gifting |
| Product interaction | Yes | No | App functionality |
| Purchase history | Yes | No | App functionality |
| Other user content (recipient notes) | Yes | No | App functionality |

Privacy policy URL: use your live policy (e.g. `https://unwrapt.io/privacy`).

## Review notes (paste into App Store Connect)

```
Unwrapt helps users remember occasions and schedule thoughtful gifts.

Login: Sign in with Google (demo account available on request).
Subscription: VIP is an auto-renewable IAP (unwrapt_vip_monthly) via RevenueCat/StoreKit.
Physical gifts: When a user pays to ship a physical gift, checkout uses Stripe (physical goods). Digital VIP membership is IAP-only in the iOS app.
Calendar: Optional Google Calendar connect imports birthdays/anniversaries.
```

## Screenshots

Capture on iPhone 15 Pro Max (6.7") and iPhone 14/15 (6.1"):

1. Thea / home briefing
2. Manual calendar + people
3. Onboarding / interest discovery
4. Subscribe / VIP paywall
5. Recipient detail

## Monetization split

| Surface | Billing |
| --- | --- |
| iOS VIP membership | Apple IAP |
| Web VIP membership | Stripe |
| Gift wallet / physical Goody orders | Stripe (both) |

Both paths set `profiles.subscription_tier = 'vip'`.
