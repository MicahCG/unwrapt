import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

const PRESET_AMOUNTS = [50, 100, 200];
const AVG_GIFT_COST = 42;

export const AddFundsModal = ({ isOpen, onClose, currentBalance }: AddFundsModalProps) => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
  const estimatedGifts = amount ? Math.floor(amount / AVG_GIFT_COST) : 0;

  const handleAddFunds = async () => {
    if (!amount || amount < 10) {
      toast({
        title: 'Invalid Amount',
        description: 'Minimum deposit is $10.00',
        variant: 'destructive',
      });
      return;
    }

    if (amount > 1000) {
      toast({
        title: 'Amount Too Large',
        description: 'Maximum deposit is $1,000.00',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-add-funds', {
        body: {
          userId: user?.id,
          amount: amount,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Error adding funds:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#FAF8F3] border-[#E4DCD2]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[#1A1A1A]">
            Add Funds to Gift Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Amounts */}
          <div>
            <label className="text-sm text-[#1A1A1A]/70 mb-3 block">
              Select Amount
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_AMOUNTS.map((presetAmount) => (
                <Button
                  key={presetAmount}
                  variant={selectedAmount === presetAmount && !customAmount ? 'default' : 'outline'}
                  className={
                    selectedAmount === presetAmount && !customAmount
                      ? 'bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A] border-[#D2B887]'
                      : 'border-[#E4DCD2] bg-transparent hover:bg-[#EFE7DD] text-[#1A1A1A]'
                  }
                  onClick={() => {
                    setSelectedAmount(presetAmount);
                    setCustomAmount('');
                  }}
                >
                  ${presetAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="text-sm text-[#1A1A1A]/70 mb-2 block">
              Or Enter Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/70">
                $
              </span>
              <Input
                type="number"
                min="10"
                max="1000"
                step="1"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="pl-7 border-[#E4DCD2] bg-white text-[#1A1A1A]"
              />
            </div>
            <p className="text-xs text-[#1A1A1A]/60 mt-1">
              Min: $10.00 • Max: $1,000.00
            </p>
          </div>

          {/* Estimate */}
          {amount && amount >= 10 && (
            <div className="bg-[#EFE7DD] rounded-lg p-4 border border-[#E4DCD2]">
              <p className="text-sm text-[#1A1A1A]/80">
                <span className="font-medium">Estimated Coverage:</span>{' '}
                Approximately {estimatedGifts} gift{estimatedGifts !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-[#1A1A1A]/60 mt-1">
                Based on $42 average per gift
              </p>
            </div>
          )}

          {/* Add Funds Button */}
          <Button
            onClick={handleAddFunds}
            disabled={!amount || amount < 10 || isLoading}
            className="w-full bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Add $${amount?.toFixed(2) || '0.00'} to Wallet`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
