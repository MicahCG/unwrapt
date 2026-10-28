import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { U } from '@/components/unwrapt2/theme';
import { isNativeApp } from '@/lib/native';
import { getVipPriceLabel, restoreVipPurchases } from '@/lib/iap';
import { VIP_MONTHLY_AMOUNT_LABEL } from '@/lib/stripe';

/** VIP's price: the App Store's localized price in the iOS app, the Stripe price on the web. */
export function useVipPrice(): string {
  const [price, setPrice] = useState(VIP_MONTHLY_AMOUNT_LABEL);
  useEffect(() => {
    let alive = true;
    void getVipPriceLabel().then((label) => { if (alive && label) setPrice(label); });
    return () => { alive = false; };
  }, []);
  return price;
}

/**
 * What App Review expects beside a subscribe button: the plan, its price and length,
 * auto-renewal and how to cancel, Terms and Privacy links, and Restore in the iOS app.
 */
const SubscriptionTerms: React.FC<{ price: string; onRestored?: () => void }> = ({ price, onRestored }) => {
  const native = isNativeApp();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);

  const restore = async () => {
    setRestoring(true);
    const result = await restoreVipPurchases();
    setRestoring(false);
    if (result.success) {
      toast({ title: 'Purchases restored', description: 'Welcome back to VIP.' });
      onRestored?.();
    } else {
      toast({ title: 'Nothing to restore', description: result.error || 'No active VIP subscription was found.', variant: 'destructive' });
    }
  };

  return (
    <div className="mt-2.5 text-center text-[11px] leading-4" style={{ color: U.muted }}>
      <p>
        Unwrapt VIP, {price} per month.{' '}
        {native
          ? 'Billed to your Apple ID. Renews automatically unless cancelled at least 24 hours before the period ends. Manage or cancel in Settings › Apple ID › Subscriptions.'
          : 'Renews monthly until you cancel, which you can do anytime in Settings.'}
      </p>
      <p className="mt-1">
        <a href="/terms" className="underline">Terms of Use</a> · <a href="/privacy" className="underline">Privacy Policy</a>
        {native && (
          <>
            {' · '}
            <button type="button" onClick={() => void restore()} disabled={restoring} className="underline disabled:opacity-60">
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </button>
          </>
        )}
      </p>
    </div>
  );
};

export default SubscriptionTerms;
