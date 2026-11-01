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

/** Top-up amounts Thea offers in chat when the wallet doesn't cover a gift. */
export const TOP_UP_AMOUNTS = [25, 50, 100, 250] as const;

/** The smallest offered top-up that covers `shortfall`, or the largest when none does. */
export const topUpFor = (shortfall: number): number =>
  TOP_UP_AMOUNTS.find((amount) => amount >= shortfall) ?? TOP_UP_AMOUNTS[TOP_UP_AMOUNTS.length - 1];

export type GiftHold =
  | { held: true; amount: number }
  | { held: false; needed: number; available: number | null };

/**
 * Sets a gift's cost aside in the wallet. `approve` hands the gift to the automation lifecycle,
 * which charges the held funds and places the order closer to the date.
 */
export const holdGiftFunds = async (scheduledGiftId: string): Promise<GiftHold> => {
  const { data, error } = await supabase.functions.invoke('wallet-reserve-funds', {
    body: { scheduledGiftId, approve: true },
  });
  if (error) throw error;
  if (data?.success) return { held: true, amount: Number(data.reservedAmount) || 0 };
  if (data?.error !== 'insufficient_funds') throw new Error(data?.error || 'Could not hold funds');
  return { held: false, needed: Number(data.requiredAmount) || 0, available: null };
};

/** Survives the Stripe redirect so the chat can finish holding funds for this gift on return. */
const LS_PENDING_WALLET_HOLD = 'unwrapt_pending_wallet_hold';
const PENDING_HOLD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingWalletHold = { scheduledGiftId: string; recipientName: string; giftTitle: string; savedAt: number };

export const takePendingWalletHold = (): PendingWalletHold | null => {
  try {
    const raw = localStorage.getItem(LS_PENDING_WALLET_HOLD);
    localStorage.removeItem(LS_PENDING_WALLET_HOLD);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingWalletHold;
    return pending?.scheduledGiftId && Date.now() - pending.savedAt < PENDING_HOLD_MAX_AGE_MS ? pending : null;
  } catch {
    return null;
  }
};

/** Opens Stripe checkout for a wallet top-up that returns to Thea's chat to fund this gift. */
export const startGiftTopUp = async (amount: number, gift: Omit<PendingWalletHold, 'savedAt'>): Promise<void> => {
  try {
    localStorage.setItem(LS_PENDING_WALLET_HOLD, JSON.stringify({ ...gift, savedAt: Date.now() }));
  } catch {
    /* the lifecycle job still holds funds for the gift later */
  }
  const { data, error } = await supabase.functions.invoke('wallet-add-funds', { body: { amount, returnTo: 'thea' } });
  if (error || !data?.url) throw error || new Error('No checkout URL returned');
  window.location.href = data.url;
};
