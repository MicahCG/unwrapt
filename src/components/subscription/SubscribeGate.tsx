import React, { useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackProductEvent } from '@/lib/productAnalytics';
import { MobileShell, Display, PrimaryButton, Eyebrow } from '@/components/unwrapt2/MobileShell';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';
import { VIP_MONTHLY_AMOUNT_LABEL, VIP_MONTHLY_PRICE_ID } from '@/lib/stripe';

/**
 * Hard paywall for users who finished onboarding but have not subscribed.
 * No skip path into the dashboard.
 */
const SubscribeGate: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      void trackProductEvent('subscribe_gate_checkout_started', {});
      const response = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId: VIP_MONTHLY_PRICE_ID, planType: 'vip_monthly' },
      });
      if (response.error) throw response.error;
      if (!response.data?.url) throw new Error('No checkout URL returned');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('SubscribeGate checkout failed:', error);
      toast({
        title: 'Couldn’t open checkout',
        description: 'Please try again in a moment.',
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
            {loading ? 'Opening checkout…' : `Start automating · ${VIP_MONTHLY_AMOUNT_LABEL}/month`}
          </PrimaryButton>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px]" style={{ color: U.muted }}>
            <ShieldCheck size={13} aria-hidden="true" />
            Secure Stripe checkout · cancel anytime
          </p>
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
      <TheaCharacter size="large" gesture="Present" />
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
          Occasion watching, curated gift ideas, and approvals before any purchase — no dashboard access until you’re a member.
        </p>
      </div>
    </MobileShell>
  );
};

export default SubscribeGate;
