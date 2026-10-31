import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackProductEvent } from '@/lib/productAnalytics';
import { MobileShell, Display, PrimaryButton, Eyebrow } from '@/components/unwrapt2/MobileShell';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';
import { purchaseVipSubscription } from '@/lib/iap';
import SubscriptionTerms, { useVipPrice } from '@/components/subscription/SubscriptionTerms';
import { isNativeApp } from '@/lib/native';
import { getGiftRecommendations } from '@/lib/giftCatalog';
import { peekPendingGiftResume, savePendingGiftResume } from '@/lib/postSubscribeResume';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * Hard paywall for users who finished onboarding but have not subscribed.
 * No skip path into the dashboard.
 */
const SubscribeGate: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const native = isNativeApp();
  const price = useVipPrice();

  /** Ensure gift cards from the pre-pay reveal survive checkout even if localStorage was cleared. */
  const ensureGiftResumeCached = async () => {
    if (peekPendingGiftResume() || !user?.id) return;
    try {
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, birthday, anniversary, interests')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      const focus = recipients?.[0];
      if (!focus?.interests?.length) return;
      const result = await getGiftRecommendations(focus.interests, 4);
      if (!result.products.length) return;
      const occasionLabel = focus.birthday ? 'birthday' : focus.anniversary ? 'anniversary' : null;
      savePendingGiftResume({
        recipientName: focus.name,
        recipientId: focus.id,
        occasionLabel,
        interests: focus.interests,
        products: result.products,
      });
    } catch (error) {
      console.error('SubscribeGate: could not cache gift resume', error);
    }
  };

  const startCheckout = async () => {
    setLoading(true);
    try {
      await ensureGiftResumeCached();
      localStorage.setItem('onboardingPaymentFlow', 'true');
      void trackProductEvent('subscribe_gate_checkout_started', { platform: native ? 'ios' : 'web' });
      const result = await purchaseVipSubscription();
      if (result.cancelled) {
        setLoading(false);
        return;
      }
      if (!result.success) throw new Error(result.error || 'Checkout failed');
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      // Native IAP succeeded — show VIP success handoff, then resume Thea with gifts.
      window.location.href = '/payment/success?type=subscription';
    } catch (error) {
      console.error('SubscribeGate checkout failed:', error);
      toast({
        title: native ? 'Couldn’t complete purchase' : 'Couldn’t open checkout',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <MobileShell
      glow
      contentClassName="px-6 pt-14 pb-6 flex flex-col"
      footer={
        <>
          <PrimaryButton onClick={startCheckout} disabled={loading}>
            {loading
              ? native
                ? 'Starting purchase…'
                : 'Opening checkout…'
              : `Start automating · ${price}/month`}
          </PrimaryButton>
          <SubscriptionTerms price={price} onRestored={() => { window.location.href = '/payment/success?type=subscription'; }} />
          <button
            type="button"
            className="mt-3 min-h-11 w-full text-[13px] font-semibold"
            style={{ color: U.textSecondary }}
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
          >
            Sign out
          </button>
        </>
      }
    >
      <Eyebrow className="text-center">Membership required</Eyebrow>
      <TheaCharacter size="large" pose="gift" />
      <Display className="mt-4 text-center text-[30px] leading-tight">
        Unlock Thea to keep going.
      </Display>
      <p className="mx-auto mt-3 max-w-[320px] text-center text-[15px] leading-6" style={{ color: U.textSecondary }}>
        Your people are saved. Subscribe to open your gift inbox, get recommendations, and let Thea handle the rest.
      </p>
      <div
        className="mt-8 rounded-[20px] p-4"
        style={{ background: U.ink, color: U.buttonText }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={17} color={U.accent} aria-hidden="true" />
          <h3 className="text-[14px] font-semibold">What you get</h3>
        </div>
        <p className="mt-2 text-[12.5px] leading-5" style={{ color: '#D8CFC1' }}>
          Occasion watching, curated gift ideas, and approvals before any purchase. No dashboard access until you’re a member.
        </p>
      </div>
    </MobileShell>
  );
};

export default SubscribeGate;
