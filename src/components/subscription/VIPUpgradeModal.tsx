import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Crown, Loader2, Zap, Users, Calendar, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VIPUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Stripe Price ID for VIP Monthly subscription
const VIP_MONTHLY_PRICE_ID = 'price_1SbpNlRvvOzjYUzy9iakOpwv';

export const VIPUpgradeModal = ({ isOpen, onClose }: VIPUpgradeModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          priceId: VIP_MONTHLY_PRICE_ID,
          planType: 'vip_monthly',
        },
      });

      if (response.error) throw response.error;

      // Redirect to Stripe Checkout
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const features = [
    { icon: Users, text: 'Unlimited recipients' },
    { icon: Zap, text: 'Full gift automation' },
    { icon: Calendar, text: 'Advanced scheduling' },
    { icon: Wallet, text: 'Gift wallet & auto-reload' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#FAF8F3] border-[#E4DCD2]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-[#D2B887]" />
            <DialogTitle className="font-display text-3xl text-[#1A1A1A]">
              Upgrade to VIP
            </DialogTitle>
          </div>
          <p className="text-[#1A1A1A]/70">
            Unlock unlimited recipients and powerful automation features
          </p>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Features List */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#E4DCD2]">
                <feature.icon className="w-5 h-5 text-[#D2B887]" />
                <span className="text-sm font-medium text-[#1A1A1A]">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>

          {/* Pricing Card */}
          <Card className="p-6 border-2 border-[#D2B887] bg-[#D2B887]/10">
            <div className="text-center">
              <div className="text-sm text-[#1A1A1A]/70 mb-2">VIP Monthly</div>
              <div className="flex items-baseline justify-center gap-1 mb-4">
                <span className="text-4xl font-display text-[#1A1A1A]">$4.99</span>
                <span className="text-[#1A1A1A]/70">/month</span>
              </div>
              <div className="text-xs text-[#1A1A1A]/60">
                Cancel anytime • No commitment
              </div>
            </div>
          </Card>

          {/* CTA Button */}
          <Button
            className="w-full bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A] h-12 text-lg"
            onClick={handleUpgrade}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Continue to Checkout
              </>
            )}
          </Button>

          <p className="text-xs text-center text-[#1A1A1A]/60">
            Secure payment processing by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
