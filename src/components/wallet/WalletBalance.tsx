import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

interface WalletBalanceProps {
  balance: number;
  onAddFunds: () => void;
  tier: 'free' | 'vip';
}

export const WalletBalance = ({ balance, onAddFunds, tier }: WalletBalanceProps) => {
  if (tier !== 'vip') return null;

  return (
    <Card className="bg-gradient-to-br from-[#EFE7DD] to-[#E4DCD2] border-[#D2B887]/30 rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)] backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#D2B887]/20 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6 text-[#D2B887]" />
          </div>
          <div>
            <p className="text-sm text-[#1A1A1A]/70 mb-1">Gift Wallet</p>
            <p className="text-3xl font-display text-[#1A1A1A]">
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>
        <Button
          onClick={onAddFunds}
          className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A] w-full sm:w-auto"
        >
          Add Funds
        </Button>
      </div>
    </Card>
  );
};
