import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Gift, Wallet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  checkAutomationEligibility,
  getDefaultGiftVariant,
  calculateWalletCoverage,
  type AutomationEligibility,
  type WalletCoverage
} from '@/lib/automation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface EnableAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId: string;
  recipientName: string;
  occasionType: 'birthday' | 'anniversary' | 'custom';
  occasionDate: string;
  currentInterests?: string[];
  onSuccess: () => void;
}

const INTEREST_OPTIONS = [
  'cooking',
  'wellness',
  'technology',
  'reading',
  'sports',
  'art',
  'music',
  'travel',
  'gardening',
  'fashion'
];

export const EnableAutomationModal = ({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  occasionType,
  occasionDate,
  currentInterests,
  onSuccess
}: EnableAutomationModalProps) => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>(currentInterests || []);
  const [eligibility, setEligibility] = useState<AutomationEligibility | null>(null);
  const [coverage, setCoverage] = useState<WalletCoverage | null>(null);
  const [defaultGift, setDefaultGift] = useState<{
    variantId: string;
    description: string;
    price: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get default gift recommendation
      const gift = await getDefaultGiftVariant({
        occasionType,
        interests
      });

      setDefaultGift(gift);

      if (gift) {
        // Check eligibility with the gift price
        const eligibilityData = await checkAutomationEligibility(user.id, gift.price);
        setEligibility(eligibilityData);

        // Get wallet coverage
        const coverageData = await calculateWalletCoverage(user.id);
        setCoverage(coverageData);
      }
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableAutomation = async () => {
    if (!user || !defaultGift || !eligibility?.eligible) return;

    setEnabling(true);
    try {
      // Update recipient with interests if provided
      if (interests.length > 0) {
        await supabase
          .from('recipients')
          .update({
            interests: interests,
            default_gift_variant_id: defaultGift.variantId
          })
          .eq('id', recipientId);
      }

      // Create or update scheduled gift with automation enabled
      const { error: giftError } = await supabase
        .from('scheduled_gifts')
        .upsert({
          recipient_id: recipientId,
          user_id: user.id,
          occasion_date: occasionDate,
          occasion_type: occasionType,
          automation_enabled: true,
          gift_variant_id: defaultGift.variantId,
          estimated_cost: defaultGift.price,
          gift_description: defaultGift.description,
          status: 'pending',
          delivery_date: new Date(new Date(occasionDate).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }, {
          onConflict: 'recipient_id,occasion_date'
        });

      if (giftError) throw giftError;

      // Log automation enable event
      await supabase
        .from('automation_logs')
        .insert({
          user_id: user.id,
          recipient_id: recipientId,
          action: 'automation_enabled',
          details: {
            gift_variant_id: defaultGift.variantId,
            estimated_cost: defaultGift.price,
            occasion_type: occasionType
          }
        });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error enabling automation:', error);

      // Show error to user
      alert(`Failed to enable automation: ${error.message || 'Unknown error'}\n\nCheck console for details.`);
    } finally {
      setEnabling(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#D2B887]" />
            <DialogTitle>Enable Gift Automation</DialogTitle>
            <Badge variant="secondary" className="bg-[#D2B887]/10 text-[#D2B887] border-[#D2B887]/20">
              VIP
            </Badge>
          </div>
          <DialogDescription>
            Set up automatic gift delivery for {recipientName}'s {occasionType}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#D2B887]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recommended Gift */}
            {defaultGift && (
              <div className="border border-[#D2B887]/20 rounded-lg p-4 bg-gradient-to-br from-[#EFE7DD] to-[#E4DCD2]">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#D2B887]/20 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-[#D2B887]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[#1A1A1A] mb-1">Recommended Gift</h3>
                    <p className="text-sm text-[#1A1A1A]/70 mb-2">{defaultGift.description}</p>
                    <p className="text-2xl font-display text-[#D2B887]">${defaultGift.price.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Eligibility Status */}
            {eligibility && (
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-lg',
                eligibility.eligible
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              )}>
                {eligibility.eligible ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Ready to automate</p>
                      <p className="text-sm opacity-80">
                        Available balance: ${eligibility.available_balance?.toFixed(2)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{eligibility.message}</p>
                      {eligibility.shortfall && (
                        <p className="text-sm opacity-80">
                          Add ${eligibility.shortfall.toFixed(2)} to enable automation
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Wallet Coverage */}
            {coverage && coverage.availableBalance >= (defaultGift?.price || 0) && (
              <div className="flex items-center justify-between p-3 bg-[#1A1A1A]/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#1A1A1A]/60" />
                  <span className="text-sm text-[#1A1A1A]/70">After enabling, you'll have:</span>
                </div>
                <span className="text-sm font-medium text-[#1A1A1A]">
                  ${(coverage.availableBalance - (defaultGift?.price || 0)).toFixed(2)} (covers {Math.floor((coverage.availableBalance - (defaultGift?.price || 0)) / coverage.averageGiftCost)} more gifts)
                </span>
              </div>
            )}

            {/* Interest Selection */}
            {(!currentInterests || currentInterests.length === 0) && (
              <div className="space-y-2">
                <Label>Interests (Optional - Select up to 3)</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map(interest => (
                    <Badge
                      key={interest}
                      variant={interests.includes(interest) ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer',
                        interests.includes(interest)
                          ? 'bg-[#D2B887] hover:bg-[#D2B887]/90 text-white'
                          : 'hover:bg-[#D2B887]/10'
                      )}
                      onClick={() => interests.length < 3 || interests.includes(interest) ? toggleInterest(interest) : null}
                    >
                      {interest.charAt(0).toUpperCase() + interest.slice(1)}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-[#1A1A1A]/60">
                  Helps personalize gift selection
                </p>
              </div>
            )}

            {/* How Automation Works */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 14 days before: We'll reserve funds in your wallet</li>
                <li>• 10 days before: We'll request the shipping address</li>
                <li>• 3 days before: Gift ships to arrive on time</li>
                <li>• You can customize or pause anytime</li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enabling}>
            Cancel
          </Button>
          <Button
            onClick={handleEnableAutomation}
            disabled={!eligibility?.eligible || enabling}
            className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
          >
            {enabling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enabling...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Enable Automation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
