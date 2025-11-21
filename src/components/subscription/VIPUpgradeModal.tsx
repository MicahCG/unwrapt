import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Crown, Loader2, Zap, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VIPUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Stripe Price IDs - You'll need to create these in your Stripe Dashboard
const STRIPE_PRICES = {
  vip_monthly: 'price_YOUR_MONTHLY_PRICE_ID', // Replace with actual price ID
  vip_annual: 'price_YOUR_ANNUAL_PRICE_ID', // Replace with actual price ID
};

export const VIPUpgradeModal = ({ isOpen, onClose }: VIPUpgradeModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  const handleUpgrade = async () => {
    setIsProcessing(true);

    try {
      const priceId = selectedPlan === 'monthly' 
        ? STRIPE_PRICES.vip_monthly 
        : STRIPE_PRICES.vip_annual;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          priceId,
          planType: `vip_${selectedPlan}`,
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
    { icon: Crown, text: 'Priority support' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-[#FAF8F3] border-[#E4DCD2]">
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

          {/* Pricing Plans */}
          <div className="grid grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <Card
              className={`p-6 cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-2 border-[#D2B887] bg-[#D2B887]/10'
                  : 'border border-[#E4DCD2] hover:border-[#D2B887]/50'
              }`}
              onClick={() => setSelectedPlan('monthly')}
            >
              <div className="text-center">
                <div className="text-sm text-[#1A1A1A]/70 mb-2">Monthly</div>
                <div className="flex items-baseline justify-center gap-1 mb-4">
                  <span className="text-4xl font-display text-[#1A1A1A]">$29</span>
                  <span className="text-[#1A1A1A]/70">/mo</span>
                </div>
                <div className="text-xs text-[#1A1A1A]/60">
                  Billed monthly
                </div>
              </div>
            </Card>

            {/* Annual Plan */}
            <Card
              className={`p-6 cursor-pointer transition-all relative ${
                selectedPlan === 'annual'
                  ? 'border-2 border-[#D2B887] bg-[#D2B887]/10'
                  : 'border border-[#E4DCD2] hover:border-[#D2B887]/50'
              }`}
              onClick={() => setSelectedPlan('annual')}
            >
              <div className="absolute -top-3 right-4 bg-[#D2B887] text-white text-xs px-2 py-1 rounded-full">
                Save 20%
              </div>
              <div className="text-center">
                <div className="text-sm text-[#1A1A1A]/70 mb-2">Annual</div>
                <div className="flex items-baseline justify-center gap-1 mb-4">
                  <span className="text-4xl font-display text-[#1A1A1A]">$279</span>
                  <span className="text-[#1A1A1A]/70">/yr</span>
                </div>
                <div className="text-xs text-[#1A1A1A]/60">
                  $23.25/mo • Billed annually
                </div>
              </div>
            </Card>
          </div>

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
            Secure payment processing by Stripe • Cancel anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
