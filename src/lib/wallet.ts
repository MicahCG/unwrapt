import { supabase } from '@/integrations/supabase/client';

const SERVICE_FEE = 7; // $7 service fee per gift

/**
 * Calculate total cost including service fee
 */
export const calculateGiftCost = (giftPrice: number): number => {
  return giftPrice + SERVICE_FEE;
};

/**
 * Get user's available wallet balance (balance minus pending reservations)
 */
export const getAvailableBalance = async (userId: string): Promise<number> => {
  try {
    // Get current wallet balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gift_wallet_balance')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const currentBalance = profile?.gift_wallet_balance || 0;

    // Get sum of pending reservations
    const { data: reservations, error: reservationsError } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'reservation')
      .eq('status', 'pending');

    if (reservationsError) throw reservationsError;

    const totalReserved = reservations?.reduce(
      (sum, transaction) => sum + Math.abs(transaction.amount),
      0
    ) || 0;

    return currentBalance - totalReserved;
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
};
