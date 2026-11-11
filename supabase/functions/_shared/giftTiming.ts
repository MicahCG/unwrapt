/**
 * One place-by rule for Thea and the ordering job.
 * place-by = occasion − shipping lead − arrival buffer.
 * Keep src/lib/giftTiming.ts as a re-export of this module so the app cannot drift.
 */

export const ARRIVAL_BUFFER_DAYS = 3;
export const DELIVERY_LEAD_DAYS = ARRIVAL_BUFFER_DAYS;
/** Upper end of the usual ~2–3 week ship window. Prefer early over late. */
export const DEFAULT_SHIPPING_LEAD_DAYS = 21;
/** @deprecated Alias of the default lead. The ordering job no longer uses a fixed day count. */
export const ORDER_WINDOW_DAYS = DEFAULT_SHIPPING_LEAD_DAYS;
export const PLACE_ORDER_LEAD_DAYS = DEFAULT_SHIPPING_LEAD_DAYS + ARRIVAL_BUFFER_DAYS;
export const SHIPPING_ESTIMATE = "about 2–3 weeks after I place the order";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const shiftIsoDate = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

export const todayIsoLocal = (now: Date = new Date()): string => {
  const yy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

const daysBetweenIso = (fromIso: string, toIso: string): number => {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const from = new Date(fy, (fm || 1) - 1, fd || 1);
  const to = new Date(ty, (tm || 1) - 1, td || 1);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
};

export const resolveShippingLeadDays = (shippingLeadDays?: number | null): number => {
  if (typeof shippingLeadDays === "number" && Number.isFinite(shippingLeadDays) && shippingLeadDays > 0) {
    return Math.min(90, Math.max(1, Math.ceil(shippingLeadDays)));
  }
  return DEFAULT_SHIPPING_LEAD_DAYS;
};

export const shippingLeadDaysFromProduct = (
  product?: { shipping_lead_days?: number | null; estimated_delivery_days?: number | null } | null,
): number | undefined => {
  const raw = product?.shipping_lead_days ?? product?.estimated_delivery_days;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.ceil(raw);
  return undefined;
};

export const formatShippingEstimate = (shippingLeadDays: number): string => {
  if (shippingLeadDays === DEFAULT_SHIPPING_LEAD_DAYS) return SHIPPING_ESTIMATE;
  if (shippingLeadDays % 7 === 0) {
    const weeks = shippingLeadDays / 7;
    return weeks === 1
      ? "about 1 week after I place the order"
      : `about ${weeks} weeks after I place the order`;
  }
  return `about ${shippingLeadDays} days after I place the order`;
};

export type GiftOrderTimingOptions = {
  shippingLeadDays?: number | null;
  today?: string;
};

export type GiftOrderTiming = {
  occasionDate: string;
  deliveryBy: string;
  /** Unclamped place-by: occasion − lead − buffer. This is what the ordering job stores and waits for. */
  idealPlaceOrderOn: string;
  /** idealPlaceOrderOn, or today when that date has already passed. */
  placeOrderOn: string;
  shippingLeadDays: number;
  shippingEstimate: string;
  placeOrderASAP: boolean;
  feasible: boolean;
};

export const giftOrderTiming = (occasionDate: string, options: GiftOrderTimingOptions = {}): GiftOrderTiming | null => {
  if (!ISO_DATE_RE.test(occasionDate)) return null;
  const shippingLeadDays = resolveShippingLeadDays(options.shippingLeadDays);
  const today = options.today && ISO_DATE_RE.test(options.today) ? options.today : todayIsoLocal();
  const deliveryBy = shiftIsoDate(occasionDate, -ARRIVAL_BUFFER_DAYS);
  const idealPlaceOrderOn = shiftIsoDate(occasionDate, -(shippingLeadDays + ARRIVAL_BUFFER_DAYS));
  const placeOrderASAP = idealPlaceOrderOn <= today;
  const placeOrderOn = placeOrderASAP ? today : idealPlaceOrderOn;
  const feasible = daysBetweenIso(placeOrderOn, deliveryBy) >= shippingLeadDays;
  return {
    occasionDate,
    deliveryBy,
    idealPlaceOrderOn,
    placeOrderOn,
    shippingLeadDays,
    shippingEstimate: formatShippingEstimate(shippingLeadDays),
    placeOrderASAP,
    feasible,
  };
};

/** True once today is on or after place-by (occasion − lead − buffer). */
export const isPlaceByReached = (
  occasionDate: string,
  todayIso: string,
  shippingLeadDays?: number | null,
): boolean => {
  const timing = giftOrderTiming(occasionDate, { today: todayIso, shippingLeadDays });
  return Boolean(timing && timing.idealPlaceOrderOn <= todayIso);
};

export type AutoOrderGift = {
  wallet_reserved?: boolean | null;
  status?: string | null;
  address_confirmed_at?: string | null;
  payment_status?: string | null;
  goody_order_id?: string | null;
  occasion_date?: string | null;
  shipping_lead_days?: number | null;
  place_by_date?: string | null;
};

/** Stored place_by_date wins; otherwise occasion − lead − buffer. */
export const isGiftPlaceByReached = (
  gift: { occasion_date?: string | null; shipping_lead_days?: number | null; place_by_date?: string | null },
  todayIso: string,
): boolean => {
  const stored = typeof gift.place_by_date === "string" ? gift.place_by_date.slice(0, 10) : "";
  if (ISO_DATE_RE.test(stored)) return stored <= todayIso;
  if (!gift.occasion_date || !ISO_DATE_RE.test(gift.occasion_date)) return false;
  return isPlaceByReached(gift.occasion_date, todayIso, gift.shipping_lead_days);
};

/**
 * The daily job places an order only when this is true.
 * Confirmed + reserved + address on file + not already ordered + place-by has arrived.
 */
export const shouldAutoOrderGift = (gift: AutoOrderGift, todayIso: string): boolean => {
  if (!gift.wallet_reserved) return false;
  if ((gift.status || "").toLowerCase() !== "confirmed") return false;
  if (!gift.address_confirmed_at) return false;
  if (gift.goody_order_id) return false;
  const payment = (gift.payment_status || "").toLowerCase();
  if (payment !== "unpaid" && payment !== "paid" && payment !== "pending") return false;
  return isGiftPlaceByReached(gift, todayIso);
};
