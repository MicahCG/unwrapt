import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { VIP_MONTHLY_PRICE_ID } from '@/lib/stripe';
import { isNativeApp } from '@/lib/native';

/** App Store / RevenueCat product identifier for VIP monthly. */
export const VIP_IAP_PRODUCT_ID = 'unwrapt_vip_monthly';

/** RevenueCat entitlement that unlocks VIP. */
export const VIP_ENTITLEMENT_ID = 'vip';

type PurchaseResult = {
  success: boolean;
  /** Stripe checkout URL when on web. */
  checkoutUrl?: string;
  cancelled?: boolean;
  error?: string;
};

let purchasesConfigured = false;

async function getPurchases() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases;
}

/**
 * Configure RevenueCat once per session. Requires VITE_REVENUECAT_IOS_API_KEY
 * (and optionally Android) in the build env.
 */
export async function configureIap(appUserId?: string | null): Promise<void> {
  if (!isNativeApp() || purchasesConfigured) return;

  const apiKey =
    Capacitor.getPlatform() === 'ios'
      ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
      : import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn('[iap] Missing RevenueCat API key — native purchases disabled');
    return;
  }

  const Purchases = await getPurchases();
  await Purchases.configure({
    apiKey,
    appUserID: appUserId || undefined,
  });
  purchasesConfigured = true;
}

export async function identifyIapUser(userId: string): Promise<void> {
  if (!isNativeApp()) return;
  await configureIap(userId);
  if (!purchasesConfigured) return;
  const Purchases = await getPurchases();
  await Purchases.logIn({ appUserID: userId });
}

export async function logoutIapUser(): Promise<void> {
  if (!isNativeApp() || !purchasesConfigured) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
  } catch (e) {
    console.warn('[iap] logOut failed', e);
  }
}

/**
 * Start VIP purchase: Apple IAP on native, Stripe Checkout on web.
 */
export async function purchaseVipSubscription(): Promise<PurchaseResult> {
  if (isNativeApp()) {
    return purchaseVipNative();
  }
  return purchaseVipStripe();
}

async function purchaseVipStripe(): Promise<PurchaseResult> {
  const response = await supabase.functions.invoke('create-subscription-checkout', {
    body: { priceId: VIP_MONTHLY_PRICE_ID, planType: 'vip_monthly' },
  });
  if (response.error) {
    return { success: false, error: response.error.message || 'Checkout failed' };
  }
  if (!response.data?.url) {
    return { success: false, error: 'No checkout URL returned' };
  }
  return { success: true, checkoutUrl: response.data.url };
}

async function purchaseVipNative(): Promise<PurchaseResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return { success: false, error: 'Not signed in' };
  }

  try {
    await configureIap(session.user.id);
    if (!purchasesConfigured) {
      return {
        success: false,
        error: 'In-app purchases are not configured. Set VITE_REVENUECAT_IOS_API_KEY.',
      };
    }

    const Purchases = await getPurchases();
    await Purchases.logIn({ appUserID: session.user.id });

    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const packageToBuy =
      current?.availablePackages?.find(
        (pkg) =>
          pkg.product.identifier === VIP_IAP_PRODUCT_ID ||
          pkg.identifier === '$rc_monthly' ||
          pkg.packageType === 'MONTHLY',
      ) || current?.availablePackages?.[0];

    if (!packageToBuy) {
      return {
        success: false,
        error: 'VIP subscription is not available in the App Store yet. Try again later.',
      };
    }

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: packageToBuy });
    const active = customerInfo?.entitlements?.active?.[VIP_ENTITLEMENT_ID];
    if (!active) {
      // Purchase may still be processing; webhook will grant VIP.
      await syncVipFromRevenueCat(session.user.id);
      return { success: true };
    }

    await syncVipFromRevenueCat(session.user.id);
    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; userCancelled?: boolean };
    if (
      err?.userCancelled ||
      err?.code === '1' ||
      err?.code === 'PURCHASE_CANCELLED' ||
      /cancel/i.test(err?.message || '')
    ) {
      return { success: false, cancelled: true };
    }
    console.error('[iap] purchase failed', error);
    return {
      success: false,
      error: err?.message || 'Purchase failed',
    };
  }
}

/** Best-effort profile sync if webhook is delayed. */
async function syncVipFromRevenueCat(userId: string): Promise<void> {
  try {
    await supabase.functions.invoke('revenuecat-sync', {
      body: { userId, grantVip: true },
    });
  } catch (e) {
    console.warn('[iap] revenuecat-sync invoke failed (webhook may still apply)', e);
  }
}

/** The App Store's localized price for VIP (e.g. "$4.99"), or null on web or if unavailable. */
export async function getVipPriceLabel(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    await configureIap();
    if (!purchasesConfigured) return null;
    const Purchases = await getPurchases();
    const { current } = await Purchases.getOfferings();
    const pkg = current?.availablePackages?.find((p) => p.product.identifier === VIP_IAP_PRODUCT_ID) || current?.availablePackages?.[0];
    return pkg?.product.priceString || null;
  } catch {
    return null;
  }
}

export async function restoreVipPurchases(): Promise<PurchaseResult> {
  if (!isNativeApp()) {
    return { success: false, error: 'Restore is only available in the iOS app' };
  }
  try {
    await configureIap();
    if (!purchasesConfigured) {
      return { success: false, error: 'In-app purchases are not configured' };
    }
    const Purchases = await getPurchases();
    const { customerInfo } = await Purchases.restorePurchases();
    const active = customerInfo?.entitlements?.active?.[VIP_ENTITLEMENT_ID];
    if (!active) {
      return { success: false, error: 'No active VIP subscription found to restore' };
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await syncVipFromRevenueCat(session.user.id);
    }
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Restore failed';
    return { success: false, error: message };
  }
}
