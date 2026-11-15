import { formatOccasionDateLong } from '@/lib/dateUtils';

/**
 * Place-by = occasion − shipping lead − arrival buffer.
 * The math lives in supabase/functions/_shared/giftTiming.ts so Thea and the
 * ordering job share one rule. This module re-exports it for the app.
 */
export {
  ARRIVAL_BUFFER_DAYS,
  DELIVERY_LEAD_DAYS,
  DEFAULT_SHIPPING_LEAD_DAYS,
  ORDER_WINDOW_DAYS,
  PLACE_ORDER_LEAD_DAYS,
  SHIPPING_ESTIMATE,
  todayIsoLocal,
  resolveShippingLeadDays,
  shippingLeadDaysFromProduct,
  formatShippingEstimate,
  giftOrderTiming,
  isPlaceByReached,
  type GiftOrderTiming,
  type GiftOrderTimingOptions,
} from '../../supabase/functions/_shared/giftTiming.ts';

import { giftOrderTiming, type GiftOrderTiming } from '../../supabase/functions/_shared/giftTiming.ts';

/** Short line for chat / cards once funds are held (or on review). */
export function formatGiftTimingLine(timing: GiftOrderTiming): string {
  if (!timing.feasible) {
    return `Shipping usually takes ${timing.shippingEstimate.replace(/^about /, '').replace(/ after I place the order$/, '')}, so arriving by ${formatOccasionDateLong(timing.deliveryBy)} for ${formatOccasionDateLong(timing.occasionDate)} isn't realistic from today. I can place it immediately for the soonest delivery, look for a faster gift, or plan an earlier send.`;
  }
  if (timing.placeOrderASAP) {
    return `I'll place the order as soon as funds and address are ready so it arrives by ${formatOccasionDateLong(timing.deliveryBy)} (${timing.shippingEstimate}).`;
  }
  return `I'll place the order around ${formatOccasionDateLong(timing.placeOrderOn)} so it arrives by ${formatOccasionDateLong(timing.deliveryBy)} (${timing.shippingEstimate}).`;
}

const formatUsd = (amount: number): string => {
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) return `$${Math.round(rounded)}`;
  return `$${rounded.toFixed(2)}`;
};

/** "$47 held for Alex, orders on November 8, 2026, arrives by November 29, 2026" */
export function formatHeldFundsStatus(args: {
  amount: number;
  recipientName: string;
  occasionDate: string | null;
  fulfillmentError?: string | null;
  today?: string;
}): string {
  const name = (args.recipientName || 'them').split(/\s+/)[0] || 'them';
  const timing = args.occasionDate ? giftOrderTiming(args.occasionDate, { today: args.today }) : null;
  const base = timing
    ? `${formatUsd(args.amount)} held for ${name}, orders on ${formatOccasionDateLong(timing.placeOrderOn)}, arrives by ${formatOccasionDateLong(timing.deliveryBy)}`
    : `${formatUsd(args.amount)} held for ${name}`;
  if (!args.fulfillmentError) return base;
  return `${base}. Couldn't place the order: ${args.fulfillmentError}`;
}
