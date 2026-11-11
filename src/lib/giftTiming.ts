import { formatOccasionDateLong, parseLocalDate } from '@/lib/dateUtils';

/**
 * Place-by = occasion − shipping lead − arrival buffer.
 * Prefer arriving a little early (use the upper end of a range when falling back).
 * Keep the numeric defaults in sync with supabase/functions/thea-chat.
 * process-automation-lifecycle still opens its order window from delivery_date;
 * that threshold may be slightly more aggressive than this copy (earlier place).
 */
/** Days before the occasion we target for arrival (slightly early). */
export const ARRIVAL_BUFFER_DAYS = 3;
/** Alias used when writing delivery_date (= occasion − buffer). */
export const DELIVERY_LEAD_DAYS = ARRIVAL_BUFFER_DAYS;
/**
 * Default transit estimate when a gift has no per-item lead time.
 * Upper end of the usual ~2–3 week Goody ship window (prefer early over late).
 */
export const DEFAULT_SHIPPING_LEAD_DAYS = 21;
/** @deprecated Prefer DEFAULT_SHIPPING_LEAD_DAYS; kept for callers that meant "days before delivery". */
export const ORDER_WINDOW_DAYS = DEFAULT_SHIPPING_LEAD_DAYS;
/** Occasion − this many days is the ideal place-order date with the default lead. */
export const PLACE_ORDER_LEAD_DAYS = DEFAULT_SHIPPING_LEAD_DAYS + ARRIVAL_BUFFER_DAYS;
/** Default copy when using DEFAULT_SHIPPING_LEAD_DAYS. */
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

const daysBetween = (fromIso: string, toIso: string): number => {
  const from = parseLocalDate(fromIso);
  const to = parseLocalDate(toIso);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

export const todayIsoLocal = (now: Date = new Date()): string => isoLocal(now);

/** Clamp / accept a per-gift lead; fall back when missing or invalid. */
export function resolveShippingLeadDays(shippingLeadDays?: number | null): number {
  if (typeof shippingLeadDays === 'number' && Number.isFinite(shippingLeadDays) && shippingLeadDays > 0) {
    return Math.min(90, Math.max(1, Math.ceil(shippingLeadDays)));
  }
  return DEFAULT_SHIPPING_LEAD_DAYS;
}

/** Read optional catalog/Goody lead fields when present; otherwise undefined (use default). */
export function shippingLeadDaysFromProduct(
  product?: { shipping_lead_days?: number | null; estimated_delivery_days?: number | null } | null,
): number | undefined {
  const raw = product?.shipping_lead_days ?? product?.estimated_delivery_days;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.ceil(raw);
  return undefined;
}

export function formatShippingEstimate(shippingLeadDays: number): string {
  if (shippingLeadDays === DEFAULT_SHIPPING_LEAD_DAYS) return SHIPPING_ESTIMATE;
  if (shippingLeadDays % 7 === 0) {
    const weeks = shippingLeadDays / 7;
    return weeks === 1
      ? 'about 1 week after I place the order'
      : `about ${weeks} weeks after I place the order`;
  }
  return `about ${shippingLeadDays} days after I place the order`;
}

export type GiftOrderTiming = {
  occasionDate: string;
  deliveryBy: string;
  placeOrderOn: string;
  shippingLeadDays: number;
  shippingEstimate: string;
  /** Ideal place date was today or earlier — order should go out ASAP. */
  placeOrderASAP: boolean;
  /** Placing on placeOrderOn leaves enough lead to hit deliveryBy. */
  feasible: boolean;
};

export type GiftOrderTimingOptions = {
  /** Per-gift transit days when the catalog/Goody exposes them. */
  shippingLeadDays?: number | null;
  /** YYYY-MM-DD override for tests / deterministic edge responses. */
  today?: string;
};

/** Concrete place-order / delivery dates derived from an occasion + lead time. */
export function giftOrderTiming(
  occasionDate: string,
  options: GiftOrderTimingOptions = {},
): GiftOrderTiming | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occasionDate)) return null;

  const shippingLeadDays = resolveShippingLeadDays(options.shippingLeadDays);
  const today = options.today && /^\d{4}-\d{2}-\d{2}$/.test(options.today)
    ? options.today
    : todayIsoLocal();
  const deliveryBy = shiftDays(occasionDate, -ARRIVAL_BUFFER_DAYS);
  const idealPlaceOrderOn = shiftDays(occasionDate, -(shippingLeadDays + ARRIVAL_BUFFER_DAYS));
  const placeOrderASAP = idealPlaceOrderOn <= today;
  const placeOrderOn = placeOrderASAP ? today : idealPlaceOrderOn;
  // Prefer early: need a full lead from place day to the arrive-by target.
  const feasible = daysBetween(placeOrderOn, deliveryBy) >= shippingLeadDays;

  return {
    occasionDate,
    deliveryBy,
    placeOrderOn,
    shippingLeadDays,
    shippingEstimate: formatShippingEstimate(shippingLeadDays),
    placeOrderASAP,
    feasible,
  };
}

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
