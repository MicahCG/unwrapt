import { supabase } from '@/integrations/supabase/client';

export interface AutomationEligibility {
  eligible: boolean;
  reason?: 'subscription_required' | 'insufficient_funds';
  message?: string;
  available_balance?: number;
  required_amount?: number;
  shortfall?: number;
}

export interface WalletCoverage {
  availableBalance: number;
  pendingReservations: number;
  coverageCount: number;
  averageGiftCost: number;
}

/**
 * Check if user can enable automation for a gift
 */
export async function checkAutomationEligibility(
  userId: string,
  giftCost: number
): Promise<AutomationEligibility> {
  try {
    const { data, error } = await supabase.rpc('can_enable_automation', {
      p_user_id: userId,
      p_gift_cost: giftCost
    });

    if (error) throw error;
    return data as unknown as AutomationEligibility;
  } catch (error) {
    console.error('Error checking automation eligibility:', error);
    throw error;
  }
}

/**
 * Get available wallet balance (excluding pending reservations)
 */
export async function getAvailableBalance(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_available_balance', {
      p_user_id: userId
    });

    if (error) throw error;
    return data as number;
  } catch (error) {
    console.error('Error getting available balance:', error);
    return 0;
  }
}

/**
 * Calculate wallet coverage (how many gifts the current balance can cover)
 */
export async function calculateWalletCoverage(userId: string): Promise<WalletCoverage> {
  try {
    // Get profile with balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gift_wallet_balance')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get pending reservations
    const { data: reservations, error: reservationError } = await supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('transaction_type', 'reservation')
      .eq('status', 'pending');

    if (reservationError) throw reservationError;

    const totalReserved = reservations?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
    const balance = profile?.gift_wallet_balance || 0;
    const availableBalance = balance - totalReserved;

    // Average gift cost estimate
    const averageGiftCost = 42; // $42 is our standard gift price point

    const coverageCount = Math.floor(availableBalance / averageGiftCost);

    return {
      availableBalance,
      pendingReservations: totalReserved,
      coverageCount,
      averageGiftCost
    };
  } catch (error) {
    console.error('Error calculating wallet coverage:', error);
    return {
      availableBalance: 0,
      pendingReservations: 0,
      coverageCount: 0,
      averageGiftCost: 42
    };
  }
}

/**
 * Get default gift variant for a recipient based on their gift vibe preference
 */
export async function getDefaultGiftVariant(params: {
  occasionType: 'birthday' | 'anniversary' | 'custom';
  giftVibe?: 'CALM_COMFORT' | 'ARTFUL_UNIQUE' | 'REFINED_STYLISH' | null;
  availableBalance?: number;
}): Promise<{
  variantId: string;
  productId: string;
  description: string;
  price: number;
} | null> {
  const { selectGiftForRecipient, estimateGiftCost } = await import('@/lib/giftVibes');

  const { giftVibe, occasionType, availableBalance = 1000 } = params;

  // Use vibe-based gift selection
  const selectedGift = await selectGiftForRecipient({
    recipientVibe: giftVibe,
    availableBalance,
    occasionType
  });

  if (!selectedGift) {
    // Return estimated cost for budget planning
    const estimatedCost = await estimateGiftCost({ recipientVibe: giftVibe, occasionType });
    return {
      variantId: 'insufficient-funds',
      productId: 'insufficient-funds',
      description: 'Insufficient wallet balance',
      price: estimatedCost
    };
  }

  return {
    variantId: selectedGift.shopify_variant_id,
    productId: selectedGift.id,
    description: selectedGift.title,
    price: selectedGift.price
  };
}

/**
 * Get automation status for a recipient
 */
export async function getAutomationStatus(recipientId: string): Promise<{
  enabled: boolean;
  stage?: string;
  fundsReserved: boolean;
  addressRequested: boolean;
  addressConfirmed: boolean;
  fulfilled: boolean;
}> {
  try {
    const { data: gift, error } = await supabase
      .from('scheduled_gifts')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('automation_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!gift) {
      return {
        enabled: false,
        fundsReserved: false,
        addressRequested: false,
        addressConfirmed: false,
        fulfilled: false
      };
    }

    return {
      enabled: true,
      stage: gift.status,
      fundsReserved: gift.wallet_reserved,
      addressRequested: !!gift.address_requested_at,
      addressConfirmed: !!gift.address_confirmed_at,
      fulfilled: gift.status === 'fulfilled'
    };
  } catch (error) {
    console.error('Error getting automation status:', error);
    return {
      enabled: false,
      fundsReserved: false,
      addressRequested: false,
      addressConfirmed: false,
      fulfilled: false
    };
  }
}

// Legacy functions (kept for backward compatibility)
export const toggleRecipientAutomation = async (
  recipientId: string,
  enabled: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('scheduled_gifts')
    .update({ automation_enabled: enabled })
    .eq('recipient_id', recipientId);

  if (error) {
    console.error('Error toggling recipient automation:', error);
    throw error;
  }
};

export const isAutomationEnabled = async (
  recipientId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('scheduled_gifts')
    .select('automation_enabled')
    .eq('recipient_id', recipientId)
    .limit(1)
    .single();

  if (error || !data) return false;
  return data.automation_enabled || false;
};
