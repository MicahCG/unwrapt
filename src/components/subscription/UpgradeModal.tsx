import React, { useState } from 'react';
import { Crown, Users, Sparkles, Wallet, Headphones, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { VIP_MONTHLY_AMOUNT_LABEL, VIP_MONTHLY_PRICE_ID } from '@/lib/stripe';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: 'recipient_limit' | 'automation_feature';
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, trigger }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          priceId: VIP_MONTHLY_PRICE_ID,
          planType: 'vip_monthly',
        },
      });

      if (response.error) throw response.error;
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[hsl(var(--ivory))] border-[hsl(var(--cream-border))]">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl text-center text-[hsl(var(--charcoal-text))] mb-6">
            <div className="inline-flex items-center gap-2">
              <Crown className="w-8 h-8 text-[hsl(var(--champagne-gold))]" />
              Upgrade to VIP
            </div>
          </DialogTitle>
        </DialogHeader>

        {trigger === 'recipient_limit' && (
          <p className="text-center text-[hsl(var(--charcoal-text))]/70 mb-6">
            You've reached the 3 recipient limit on the Free plan. Upgrade to VIP for unlimited recipients and more.
          </p>
        )}

        {trigger === 'automation_feature' && (
          <p className="text-center text-[hsl(var(--charcoal-text))]/70 mb-6">
            Automation features are only available on VIP. Upgrade to unlock full automation capabilities.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[hsl(var(--sand))] border border-[hsl(var(--cream-border))] rounded-2xl p-6">
            <h3 className="font-display text-xl text-[hsl(var(--charcoal-text))] mb-4">Free</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[hsl(var(--charcoal-text))]/60 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))]/80">3 recipients max</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[hsl(var(--charcoal-text))]/60 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))]/80">Manual gift scheduling</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[hsl(var(--charcoal-text))]/60 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))]/80">Email reminders</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[hsl(var(--champagne-gold))]/10 to-[hsl(var(--champagne-gold))]/5 border-2 border-[hsl(var(--champagne-gold))]/30 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-[hsl(var(--champagne-gold))] text-[hsl(var(--charcoal-text))] text-xs font-medium px-3 py-1 rounded-full">
                Recommended
              </span>
            </div>
            <h3 className="font-display text-xl text-[hsl(var(--charcoal-text))] mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-[hsl(var(--champagne-gold))]" />
              VIP
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Users className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Unlimited recipients</span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Full automation</span>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Gift wallet access</span>
              </div>
              <div className="flex items-start gap-2">
                <Headphones className="w-5 h-5 text-[hsl(var(--champagne-gold))] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[hsl(var(--charcoal-text))] font-medium">Priority support</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="font-display text-4xl text-[hsl(var(--charcoal-text))] mb-2">
            {VIP_MONTHLY_AMOUNT_LABEL}
            <span className="text-2xl text-[hsl(var(--charcoal-text))]/60">/month</span>
          </div>
          <p className="text-sm text-[hsl(var(--champagne-gold))] font-medium">
            Cancel anytime · No commitment
          </p>
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={isProcessing}
          className="w-full h-12 bg-[hsl(var(--champagne-gold))] hover:bg-[hsl(var(--champagne-gold))]/90 text-[hsl(var(--charcoal-text))] font-medium text-base rounded-xl"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Redirecting…
            </>
          ) : (
            <>
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to VIP
            </>
          )}
        </Button>

        <p className="text-center text-xs text-[hsl(var(--charcoal-text))]/50 mt-4">
          Secure checkout powered by Stripe.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
