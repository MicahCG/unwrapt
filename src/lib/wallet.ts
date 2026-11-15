import { supabase } from '@/integrations/supabase/client';

const SERVICE_FEE = 7; // $7 service fee per gift

/**
 * Calculate total cost including service fee
 */
export const calculateGiftCost = (giftPrice: number): number => {
  return giftPrice + SERVICE_FEE;
};

export type PendingReservation = {
  amount: number;
  scheduledGiftId: string;
  giftTitle: string;
  recipientName: string;
  occasionDate: string | null;
  fulfillmentError: string | null;
};

export type WalletBreakdown = {
  balance: number;
  reserved: number;
  available: number;
  reservations: PendingReservation[];
};

type ReservationJoinRow = {
  amount: number;
  scheduled_gift_id: string | null;
  scheduled_gifts: {
    gift_type: string | null;
    occasion_date: string | null;
    recipients: { name: string } | { name: string }[] | null;
  } | null;
};

/** Pending holds linked to upcoming gifts (for the Gift Wallet available/reserved UI). */
export const listPendingReservations = async (userId: string): Promise<PendingReservation[]> => {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('amount, scheduled_gift_id, scheduled_gifts(gift_type, occasion_date, recipients(name))')
    .eq('user_id', userId)
    .eq('transaction_type', 'reservation')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return ((data as ReservationJoinRow[] | null) || [])
    .filter((row) => row.scheduled_gift_id)
    .map((row) => {
      const gift = row.scheduled_gifts;
      const recipient = Array.isArray(gift?.recipients) ? gift?.recipients[0] : gift?.recipients;
      return {
        amount: Math.abs(Number(row.amount) || 0),
        scheduledGiftId: row.scheduled_gift_id!,
        giftTitle: gift?.gift_type || 'Gift',
        recipientName: recipient?.name || 'Someone',
        occasionDate: gift?.occasion_date || null,
        fulfillmentError: null,
      };
    });
};

/** Latest fulfillment failure per gift, so a held gift can show why it did not order. */
const listFulfillmentIssues = async (userId: string): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from('automation_logs')
    .select('scheduled_gift_id, details')
    .eq('user_id', userId)
    .eq('stage', 'fulfillment')
    .in('action', ['error', 'failed'])
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) return {};
  const issues: Record<string, string> = {};
  for (const row of data) {
    if (!row.scheduled_gift_id || issues[row.scheduled_gift_id]) continue;
    const details = row.details as { error?: string } | null;
    if (details?.error) issues[row.scheduled_gift_id] = details.error;
  }
  return issues;
};

/** Pending hold amount for one gift (transferable when swapping on the same row). */
export const getGiftReservedAmount = async (userId: string, scheduledGiftId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('scheduled_gift_id', scheduledGiftId)
    .eq('transaction_type', 'reservation')
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (error) return 0;
  return Math.abs(Number(data?.amount) || 0);
};

/** Gross balance, reserved total, available, and per-gift holds. */
export const getWalletBreakdown = async (userId: string): Promise<WalletBreakdown> => {
  try {
    const [{ data: profile, error: profileError }, reservations, issues] = await Promise.all([
      supabase.from('profiles').select('gift_wallet_balance').eq('id', userId).single(),
      listPendingReservations(userId).catch(() => [] as PendingReservation[]),
      listFulfillmentIssues(userId),
    ]);
    if (profileError) throw profileError;
    const balance = Number(profile?.gift_wallet_balance) || 0;
    for (const row of reservations) row.fulfillmentError = issues[row.scheduledGiftId] || null;
    const reserved = reservations.reduce((sum, row) => sum + row.amount, 0);
    return {
      balance,
      reserved,
      available: Math.round((balance - reserved) * 100) / 100,
      reservations,
    };
  } catch (error) {
    console.error('Error getting wallet breakdown:', error);
    return { balance: 0, reserved: 0, available: 0, reservations: [] };
  }
};

/**
 * Get user's available wallet balance (balance minus pending reservations)
 */
export const getAvailableBalance = async (userId: string): Promise<number> => {
  const breakdown = await getWalletBreakdown(userId);
  return breakdown.available;
};

/** Top-up amounts Thea offers in chat when the wallet doesn't cover a gift. */
export const TOP_UP_AMOUNTS = [25, 50, 100, 250] as const;

/** The smallest offered top-up that covers `shortfall`, or the largest when none does. */
export const topUpFor = (shortfall: number): number =>
  TOP_UP_AMOUNTS.find((amount) => amount >= shortfall) ?? TOP_UP_AMOUNTS[TOP_UP_AMOUNTS.length - 1];

export type GiftHold =
  | { held: true; amount: number; transferredFromReserved?: number }
  | { held: false; needed: number; available: number | null; reservedApplied?: number; shortfall?: number };

/**
 * Sets a gift's cost aside in the wallet. `approve` hands the gift to the automation lifecycle,
 * which charges the held funds and places the order closer to the date.
 * An existing pending hold on the same gift is reallocated toward the new price.
 */
export const holdGiftFunds = async (scheduledGiftId: string): Promise<GiftHold> => {
  const { data, error } = await supabase.functions.invoke('wallet-reserve-funds', {
    body: { scheduledGiftId, approve: true },
  });
  if (error) throw error;
  if (data?.success) {
    return {
      held: true,
      amount: Number(data.reservedAmount) || 0,
      transferredFromReserved: Number(data.transferredFromReserved) || 0,
    };
  }
  if (data?.error !== 'insufficient_funds') throw new Error(data?.error || 'Could not hold funds');
  return {
    held: false,
    needed: Number(data.requiredAmount) || 0,
    available: typeof data.available === 'number' ? Number(data.available) : null,
    reservedApplied: Number(data.transferableReserved) || 0,
    shortfall: Number(data.shortfall) || 0,
  };
};

/** Survives the Stripe redirect so the chat can finish holding funds for this gift on return. */
const LS_PENDING_WALLET_HOLD = 'unwrapt_pending_wallet_hold';
const PENDING_HOLD_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingWalletHold = {
  scheduledGiftId: string;
  recipientName: string;
  giftTitle: string;
  occasionDate?: string | null;
  savedAt: number;
};

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
