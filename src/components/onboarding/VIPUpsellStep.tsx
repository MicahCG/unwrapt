import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles, Gift, Calendar, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VIPUpsellStepProps {
  importedDates: Array<{
    personName: string;
    date: string;
    type: 'birthday' | 'anniversary';
  }>;
  recipientName?: string; // Optional fallback when no imported dates
  onUpgrade: () => void;
  onSkip: () => void;
}

const VIPUpsellStep: React.FC<VIPUpsellStepProps> = ({
  importedDates,
  recipientName,
  onUpgrade,
  onSkip
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Get the first recipient name and count of others
  // Use recipientName prop as fallback when importedDates is empty
  const firstRecipient = importedDates[0]?.personName || recipientName || 'your loved ones';
  const otherCount = Math.max(0, importedDates.length - 1);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      // Create checkout session for VIP subscription
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          tier: 'vip',
          returnUrl: `${window.location.origin}/payment-success?type=subscription`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Store a flag to indicate this is from onboarding
        localStorage.setItem('onboardingUpgradeFlow', 'true');
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "There was a problem starting the upgrade. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="animate-fadeInUp">
      <CardContent className="py-8 px-6 text-center space-y-6">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-brand-charcoal leading-tight">
            Automate gifts for{' '}
            <span className="text-brand-gold">{firstRecipient}</span>
            {otherCount > 0 && (
              <>
                {' '}and{' '}
                <span className="text-brand-gold">
                  {otherCount} other{otherCount === 1 ? '' : 's'}
                </span>
              </>
            )}
          </h2>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid gap-4 max-w-md mx-auto text-left"
        >
          <div className="flex items-start gap-3 p-4 bg-brand-cream/50 rounded-lg">
            <Gift className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-brand-charcoal">Automatic gift selection</p>
              <p className="text-sm text-brand-charcoal/60">We curate the perfect gifts based on their interests</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-brand-cream/50 rounded-lg">
            <Calendar className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-brand-charcoal">On-time delivery</p>
              <p className="text-sm text-brand-charcoal/60">Gifts arrive before the occasion, every time</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-brand-cream/50 rounded-lg">
            <Sparkles className="h-5 w-5 text-brand-charcoal mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-brand-charcoal">Zero effort required</p>
              <p className="text-sm text-brand-charcoal/60">Set it once and we handle everything</p>
            </div>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="space-y-4 pt-4"
        >
          <Button 
            size="lg"
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full max-w-sm text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Automate My Gifting
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost"
            onClick={onSkip}
            disabled={isLoading}
            className="text-brand-charcoal/60 hover:text-brand-charcoal hover:bg-brand-cream"
          >
            Maybe later
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default VIPUpsellStep;
