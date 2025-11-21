import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopifyCollection } from '@/hooks/useShopifyCollection';
import { toggleRecipientAutomation } from '@/lib/automation';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, Wallet as WalletIcon } from 'lucide-react';

interface AutomationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: any;
}

const AutomationSetupModal = ({ isOpen, onClose, recipient }: AutomationSetupModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  // Fetch all products for gift selection
  const { data: products = [], isLoading: productsLoading } = useShopifyCollection('', 12);

  // Fetch user's wallet balance
  const { data: profile } = useQuery({
    queryKey: ['user-profile-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('gift_wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && step === 2,
  });

  const walletBalance = profile?.gift_wallet_balance || 0;
  const estimatedGiftCost = 42;
  const hasSufficientFunds = walletBalance >= estimatedGiftCost;

  const handleGiftSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    setStep(2);
  };

  const handleEnableAutomation = async () => {
    if (!selectedVariantId) return;

    setIsEnabling(true);
    try {
      // Update scheduled gifts with default gift and enable automation
      const { data: scheduledGifts, error: fetchError } = await supabase
        .from('scheduled_gifts')
        .select('id')
        .eq('recipient_id', recipient.id)
        .eq('user_id', user?.id);

      if (fetchError) throw fetchError;

      if (scheduledGifts && scheduledGifts.length > 0) {
        const { error: updateError } = await supabase
          .from('scheduled_gifts')
          .update({
            automation_enabled: true,
            gift_type: selectedVariantId, // Store default gift variant ID
          })
          .eq('recipient_id', recipient.id)
          .eq('user_id', user?.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Automation Enabled!',
        description: `Automation is now active for ${recipient.name}`,
      });

      onClose();
    } catch (error) {
      console.error('Error enabling automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable automation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-[#FAF8F3] border-[#E4DCD2]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[#1A1A1A]">
            {step === 1
              ? `Pick a default gift for ${recipient.name}`
              : 'Confirm Wallet Funds'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 1 ? (
            <>
              {productsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D2B887]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                  {products.map((product) => (
                    <button
                      key={product.variantId}
                      onClick={() => handleGiftSelect(product.variantId)}
                      className="group relative bg-white border-2 border-[#E4DCD2] rounded-lg p-3 hover:border-[#D2B887] transition-all"
                    >
                      <img
                        src={product.featuredImage || ''}
                        alt={product.title}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        {product.title}
                      </p>
                      <p className="text-xs text-[#1A1A1A]/70">
                        ${product.price.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              {/* Selected Gift Preview */}
              <div className="bg-[#EFE7DD] rounded-lg p-4 border border-[#E4DCD2]">
                <p className="text-sm font-medium text-[#1A1A1A] mb-2">
                  Selected Gift:
                </p>
                {products.find((p) => p.variantId === selectedVariantId) && (
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        products.find((p) => p.variantId === selectedVariantId)
                          ?.featuredImage || ''
                      }
                      alt="Selected gift"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-[#1A1A1A]">
                        {
                          products.find((p) => p.variantId === selectedVariantId)
                            ?.title
                        }
                      </p>
                      <p className="text-sm text-[#1A1A1A]/70">
                        $
                        {products
                          .find((p) => p.variantId === selectedVariantId)
                          ?.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Balance */}
              <div className="bg-white rounded-lg p-4 border border-[#E4DCD2]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <WalletIcon className="w-5 h-5 text-[#D2B887]" />
                    <span className="font-medium text-[#1A1A1A]">
                      Current Wallet Balance
                    </span>
                  </div>
                  <span className="text-2xl font-display text-[#1A1A1A]">
                    ${walletBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#1A1A1A]/70">
                    Next gift costs approximately
                  </span>
                  <span className="font-medium text-[#1A1A1A]">
                    ${estimatedGiftCost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status Message */}
              {hasSufficientFunds ? (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Ready to automate!</span>
                </div>
              ) : (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-900 mb-3">
                    Your wallet balance is below the estimated gift cost. Please add
                    funds to continue.
                  </p>
                  <Button
                    variant="outline"
                    className="border-amber-600 text-amber-900 hover:bg-amber-100"
                    onClick={() => {
                      onClose();
                      // This will be handled by the dashboard wallet component
                    }}
                  >
                    Add Funds to Wallet
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  disabled={isEnabling}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                  onClick={handleEnableAutomation}
                  disabled={!hasSufficientFunds || isEnabling}
                >
                  {isEnabling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    'Enable Automation'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutomationSetupModal;
