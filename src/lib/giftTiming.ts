import { formatOccasionDateLong, parseLocalDate } from '@/lib/dateUtils';

/**
 * Keep in sync with supabase/functions/thea-chat and process-automation-lifecycle:
 * delivery_date = occasion − DELIVERY_LEAD_DAYS; order window opens ORDER_WINDOW_DAYS
 * before delivery (≈ PLACE_ORDER_LEAD_DAYS before the occasion).
 */
export const DELIVERY_LEAD_DAYS = 3;
export const ORDER_WINDOW_DAYS = 25;
export const PLACE_ORDER_LEAD_DAYS = ORDER_WINDOW_DAYS + DELIVERY_LEAD_DAYS; // 28
/** Typical Goody shipping once the order is placed inside that window. */
export const SHIPPING_ESTIMATE = 'about 2–3 weeks after I place the order';

const isoLocal = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const shiftDays = (isoDate: string, days: number): string => {
  const date = parseLocalDate(isoDate);
  date.setDate(date.getDate() + days);
  return isoLocal(date);
};

export type GiftOrderTiming = {
  occasionDate: string;
  deliveryBy: string;
  placeOrderOn: string;
  shippingEstimate: string;
};

/** Concrete place-order / delivery dates derived from an occasion. */
export function giftOrderTiming(occasionDate: string): GiftOrderTiming | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occasionDate)) return null;
  return {
    occasionDate,
    deliveryBy: shiftDays(occasionDate, -DELIVERY_LEAD_DAYS),
    placeOrderOn: shiftDays(occasionDate, -PLACE_ORDER_LEAD_DAYS),
    shippingEstimate: SHIPPING_ESTIMATE,
  };
}

/** Short line for chat / cards once funds are held. */
export function formatGiftTimingLine(timing: GiftOrderTiming): string {
  return `I'll place the order around ${formatOccasionDateLong(timing.placeOrderOn)} so it arrives by ${formatOccasionDateLong(timing.deliveryBy)} (${timing.shippingEstimate}).`;
}
