import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Beaker, Plus, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';

interface TestWalletControlsProps {
  onBalanceUpdated?: () => void;
  currentBalance?: number;
}

export const TestWalletControls = ({ onBalanceUpdated, currentBalance = 0 }: TestWalletControlsProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Only show in development or localhost
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  if (!isDev) return null;

  const addTestFunds = async (amount: number) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const newBalance = currentBalance + amount;

      // Update wallet balance directly
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          gift_wallet_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          balance_after: newBalance,
          transaction_type: 'deposit',
          status: 'completed',
          description: '🧪 TEST FUNDS - Development only',
          stripe_payment_intent_id: `test_${Date.now()}`,
          created_at: new Date().toISOString()
        });

      // Don't fail if transaction log fails
      if (transactionError) {
        console.warn('Warning: Could not create transaction record:', transactionError);
      }

      toast({
        title: '✅ Test Funds Added',
        description: `Added $${amount} to your wallet. New balance: $${newBalance.toFixed(2)}`,
      });

      // Trigger a refresh of the wallet balance
      if (onBalanceUpdated) {
        setTimeout(() => onBalanceUpdated(), 100);
      }
    } catch (error: any) {
      console.error('Error adding test funds:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add test funds',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Beaker className="w-5 h-5 text-purple-600" />
        <h3 className="font-medium text-purple-900">Developer Testing</h3>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
          DEV ONLY
        </Badge>
      </div>

      <p className="text-sm text-purple-700 mb-4">
        Add test funds to your wallet instantly (no payment required)
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => addTestFunds(50)}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add $50
        </Button>
        <Button
          onClick={() => addTestFunds(100)}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add $100
        </Button>
        <Button
          onClick={() => addTestFunds(500)}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="border-purple-300 text-purple-700 hover:bg-purple-100"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add $500
        </Button>
      </div>

      <div className="mt-3 p-3 bg-purple-100/50 rounded-lg">
        <p className="text-xs text-purple-600">
          💡 <strong>Tip:</strong> Use these test funds to enable automation on your recipients and see the full automation lifecycle without real payments.
        </p>
      </div>
    </Card>
  );
};
