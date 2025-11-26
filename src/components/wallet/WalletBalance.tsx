import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { calculateWalletCoverage, type WalletCoverage } from '@/lib/automation';

interface WalletBalanceProps {
  balance: number;
  onAddFunds: () => void;
  tier: 'free' | 'vip';
}

export const WalletBalance = ({ balance, onAddFunds, tier }: WalletBalanceProps) => {
  const { user } = useAuth();
  const [coverage, setCoverage] = useState<WalletCoverage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tier === 'vip' && user) {
      calculateWalletCoverage(user.id)
        .then(setCoverage)
        .finally(() => setLoading(false));
    }
  }, [tier, user, balance]);

  if (tier !== 'vip') return null;

  // Determine balance state and styling
  const getBalanceState = () => {
    if (balance === 0) {
      return {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-400',
        message: 'Add funds to start automating gifts',
        indicator: 'bg-gray-400'
      };
    } else if (balance < 25) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-500',
        message: 'Add funds to enable automation',
        indicator: 'bg-red-500'
      };
    } else if (balance < 100) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        iconColor: 'text-yellow-500',
        message: `Low balance - Covers ${coverage?.coverageCount || 0} gift${coverage?.coverageCount === 1 ? '' : 's'}`,
        indicator: 'bg-yellow-500'
      };
    } else {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        iconColor: 'text-green-500',
        message: `Covers ${coverage?.coverageCount || 0} upcoming gift${coverage?.coverageCount === 1 ? '' : 's'}`,
        indicator: 'bg-green-500'
      };
    }
  };

  const state = getBalanceState();

  return (
    <Card className="bg-gradient-to-br from-[#EFE7DD] to-[#E4DCD2] border-[#D2B887]/30 rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)] backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#D2B887]/20 flex items-center justify-center relative">
            <Wallet className="w-6 h-6 text-[#D2B887]" />
            {/* Status indicator dot */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${state.indicator} border-2 border-[#EFE7DD]`} />
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
          className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
        >
          Add Funds
        </Button>
      </div>

      {/* Coverage display */}
      {!loading && coverage && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${state.bgColor}`}>
            <Zap className={`w-4 h-4 ${state.iconColor}`} />
            <span className={`text-sm font-medium ${state.color}`}>
              {state.message}
            </span>
          </div>

          {/* Show pending reservations if any */}
          {coverage.pendingReservations > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-[#1A1A1A]/5 rounded-lg">
              <span className="text-xs text-[#1A1A1A]/60">Pending Reservations</span>
              <span className="text-xs font-medium text-[#1A1A1A]/80">
                -${coverage.pendingReservations.toFixed(2)}
              </span>
            </div>
          )}

          {coverage.availableBalance !== balance && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-[#1A1A1A]/10 pt-2">
              <span className="text-xs text-[#1A1A1A]/60">Available Balance</span>
              <span className="text-xs font-medium text-[#1A1A1A]">
                ${coverage.availableBalance.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
