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
  /** idealPlaceOrderOn, or today when that date has already passed. A stored or chosen place date replaces this. */
  placeOrderOn: string;
  /** placeOrderOn plus this gift's shipping lead. */
  expectedArrival: string;
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
  const expectedArrival = shiftIsoDate(placeOrderOn, shippingLeadDays);
  const feasible = expectedArrival <= deliveryBy;
  return {
    occasionDate,
    deliveryBy,
    idealPlaceOrderOn,
    placeOrderOn,
    expectedArrival,
    shippingLeadDays,
    shippingEstimate: formatShippingEstimate(shippingLeadDays),
    placeOrderASAP,
    feasible,
  };
};

const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "November 15, 2026". Built from the ISO parts so the spoken day cannot drift. */
export const formatSpeakableDate = (iso: string): string => {
  if (!ISO_DATE_RE.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const month = MONTH_LONG[(m || 1) - 1];
  if (!month || !y || !d) return iso;
  return `${month} ${d}, ${y}`;
};

const isoFromParts = (year: number, month: number | undefined, day: number): string | null => {
  if (month == null || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const MONTH_INDEX: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/** Soonest matching month/day on or after today that still falls on or before the occasion.
 * A match only in the past (this Nov 1, when today is Nov 11) stays in the past so the caller can reject it. */
const chooseMonthDay = (month: number | undefined, day: number, today: string, occasionDate?: string | null): string | null => {
  if (month == null) return null;
  const todayYear = Number(today.slice(0, 4));
  const years = [todayYear, todayYear + 1];
  const occasionYear = occasionDate && ISO_DATE_RE.test(occasionDate) ? Number(occasionDate.slice(0, 4)) : null;
  if (occasionYear != null && !years.includes(occasionYear)) years.unshift(occasionYear);
  const inOccasionYear = occasionYear != null ? isoFromParts(occasionYear, month, day) : null;
  const upcoming = years
    .map((year) => isoFromParts(year, month, day))
    .filter((iso): iso is string => Boolean(iso))
    .filter((iso) => iso >= today)
    .sort();
  if (occasionDate && ISO_DATE_RE.test(occasionDate)) {
    const beforeOccasion = upcoming.find((iso) => iso <= occasionDate);
    if (beforeOccasion) return beforeOccasion;
  }
  if (inOccasionYear && inOccasionYear < today) return inOccasionYear;
  return upcoming[0] ?? inOccasionYear;
};

const chooseDayOfMonth = (day: number, today: string): string | null => {
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  for (let i = 0; i < 14; i++) {
    const iso = isoFromParts(year, month, day);
    if (iso && iso >= today) return iso;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return null;
};

export type PlaceOnResolution =
  | { ok: true; placeOn: string }
  | { ok: false; error: string };

/**
 * Resolve a user's place-date words to one ISO day. The model must not invent this.
 * Explicit dates win over relative phrases. A date before today is rejected.
 */
export const resolvePlaceOnRequest = (
  input: string,
  options: { today?: string; occasionDate?: string | null } = {},
): PlaceOnResolution => {
  const today = options.today && ISO_DATE_RE.test(options.today) ? options.today : todayIsoLocal();
  const text = input.trim();
  if (!text) return { ok: false, error: "Say which day to place the order." };

  const found: string[] = [];
  const occupied: Array<[number, number]> = [];
  const remember = (iso: string | null, start?: number, end?: number) => {
    if (!iso) return;
    found.push(iso);
    if (start != null && end != null) occupied.push([start, end]);
  };
  const overlaps = (start: number, end: number) => occupied.some(([from, to]) => start < to && end > from);

  for (const match of text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
    if (ISO_DATE_RE.test(match[1])) remember(match[1], match.index, match.index + match[0].length);
  }

  const monthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/gi;
  for (const match of text.matchAll(monthRe)) {
    const month = MONTH_INDEX[match[1].toLowerCase()];
    const day = Number(match[2]);
    const year = match[3] ? Number(match[3]) : null;
    const iso = year ? isoFromParts(year, month, day) : chooseMonthDay(month, day, today, options.occasionDate);
    remember(iso, match.index, match.index + match[0].length);
  }

  const slashRe = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
  for (const match of text.matchAll(slashRe)) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    let year = match[3] ? Number(match[3]) : null;
    if (year != null && year < 100) year += 2000;
    const iso = year ? isoFromParts(year, month, day) : chooseMonthDay(month, day, today, options.occasionDate);
    remember(iso, match.index, match.index + match[0].length);
  }

  const dayRe = /\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)\b/gi;
  for (const match of text.matchAll(dayRe)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps(start, end)) continue;
    remember(chooseDayOfMonth(Number(match[1]), today));
  }

  if (!found.length) {
    if (/\bnext\s+week\b/i.test(text)) found.push(shiftIsoDate(today, 7));
    else if (/\btomorrow\b/i.test(text)) found.push(shiftIsoDate(today, 1));
    else if (/\b(sooner|earlier|today|asap)\b/i.test(text)) found.push(today);
  }

  if (!found.length) {
    return { ok: false, error: "I couldn't read a place date. Ask for a day, like Nov 15, or say sooner or next week." };
  }
  const placeOn = found[found.length - 1];
  if (placeOn < today) {
    return { ok: false, error: `That date is in the past. The soonest I can place it is ${formatSpeakableDate(today)}.` };
  }
  return { ok: true, placeOn };
};

/** Timing for a chosen or stored place date, using that gift's shipping lead. */
export const timingForPlaceOn = (
  occasionDate: string,
  placeOn: string,
  options: GiftOrderTimingOptions = {},
): GiftOrderTiming | null => {
  const base = giftOrderTiming(occasionDate, options);
  if (!base || !ISO_DATE_RE.test(placeOn)) return null;
  const today = options.today && ISO_DATE_RE.test(options.today) ? options.today : todayIsoLocal();
  const placeOrderOn = placeOn < today ? today : placeOn;
  const expectedArrival = shiftIsoDate(placeOrderOn, base.shippingLeadDays);
  return {
    ...base,
    placeOrderOn,
    expectedArrival,
    placeOrderASAP: placeOrderOn <= today,
    feasible: expectedArrival <= base.deliveryBy,
  };
};

/**
 * What get_recipients should quote. A stored place_by_date wins over the computed ideal.
 * A stored date already in the past is quoted as today, because the ordering job will place it.
 */
export const timingForStoredGift = (
  occasionDate: string,
  options: GiftOrderTimingOptions & { placeByDate?: string | null } = {},
): GiftOrderTiming | null => {
  const stored = typeof options.placeByDate === "string" ? options.placeByDate.slice(0, 10) : "";
  if (!ISO_DATE_RE.test(stored)) return giftOrderTiming(occasionDate, options);
  return timingForPlaceOn(occasionDate, stored, options);
};

export type PlaceByDecision =
  | {
      ok: true;
      saved: boolean;
      feasible: boolean;
      tooLate: boolean;
      acceptedLate: boolean;
      /** Date to write, or null when a too-late request must not be stored. */
      placeByDate: string | null;
      shippingLeadDays: number;
      timing: GiftOrderTiming;
      usedOverride: boolean;
      options?: Array<"place_asap" | "pick_earlier_date" | "accept_late_arrival">;
      confirmationCopy: string;
    }
  | { ok: false; error: string };

const feasiblePlaceCopy = (timing: GiftOrderTiming, withArrival: boolean): string => {
  const place = formatSpeakableDate(timing.placeOrderOn);
  const ask = `Expected delivery is about ${timing.shippingLeadDays} days, so I'm placing this on ${place}. Does that work?`;
  if (!withArrival) return ask;
  return `Expected delivery is about ${timing.shippingLeadDays} days, so I'm placing this on ${place}. It should arrive about ${formatSpeakableDate(timing.expectedArrival)}. Does that work?`;
};

const tooLatePlaceCopy = (timing: GiftOrderTiming): string => {
  const place = formatSpeakableDate(timing.placeOrderOn);
  const arrival = formatSpeakableDate(timing.expectedArrival);
  const by = formatSpeakableDate(timing.deliveryBy);
  return `Expected delivery is about ${timing.shippingLeadDays} days, so placing this on ${place} would arrive about ${arrival}, which is after ${by}. That date doesn't work if it needs to arrive for the occasion. I didn't change the place date. I can place it as soon as possible, you can pick an earlier date, or you can accept a late arrival.`;
};

/**
 * Default confirm stores idealPlaceOrderOn. A user date replaces it only when that
 * gift's lead can still arrive by the occasion, unless they explicitly accept a late arrival.
 */
export const decidePlaceBy = (args: {
  occasionDate: string;
  shippingLeadDays?: number | null;
  requestedPlaceOn?: string | null;
  acceptLate?: boolean;
  today?: string;
}): PlaceByDecision => {
  const today = args.today && ISO_DATE_RE.test(args.today) ? args.today : todayIsoLocal();
  const base = giftOrderTiming(args.occasionDate, { shippingLeadDays: args.shippingLeadDays, today });
  if (!base) return { ok: false, error: "A valid occasion date (YYYY-MM-DD) is required." };

  const requested = typeof args.requestedPlaceOn === "string" ? args.requestedPlaceOn.trim() : "";
  if (!requested) {
    return {
      ok: true,
      saved: true,
      feasible: base.feasible,
      tooLate: false,
      acceptedLate: false,
      placeByDate: base.idealPlaceOrderOn,
      shippingLeadDays: base.shippingLeadDays,
      timing: base,
      usedOverride: false,
      confirmationCopy: base.feasible
        ? feasiblePlaceCopy(base, false)
        : `Expected delivery is about ${base.shippingLeadDays} days. Placing this on ${formatSpeakableDate(base.placeOrderOn)} would arrive about ${formatSpeakableDate(base.expectedArrival)}, which misses ${formatSpeakableDate(base.deliveryBy)}. On-time arrival isn't realistic. I can place it as soon as possible, look for a faster gift, or you can accept a late arrival.`,
    };
  }

  const resolved = resolvePlaceOnRequest(requested, { today, occasionDate: args.occasionDate });
  if (!resolved.ok) return resolved;
  const timing = timingForPlaceOn(args.occasionDate, resolved.placeOn, { shippingLeadDays: base.shippingLeadDays, today });
  if (!timing) return { ok: false, error: "Could not compute timing for that date." };

  if (!timing.feasible && !args.acceptLate) {
    return {
      ok: true,
      saved: false,
      feasible: false,
      tooLate: true,
      acceptedLate: false,
      placeByDate: null,
      shippingLeadDays: timing.shippingLeadDays,
      timing,
      usedOverride: true,
      options: ["place_asap", "pick_earlier_date", "accept_late_arrival"],
      confirmationCopy: tooLatePlaceCopy(timing),
    };
  }

  return {
    ok: true,
    saved: true,
    feasible: timing.feasible,
    tooLate: !timing.feasible,
    acceptedLate: !timing.feasible && Boolean(args.acceptLate),
    placeByDate: resolved.placeOn,
    shippingLeadDays: timing.shippingLeadDays,
    timing,
    usedOverride: true,
    confirmationCopy: timing.feasible
      ? feasiblePlaceCopy(timing, true)
      : `Expected delivery is about ${timing.shippingLeadDays} days, so I'm placing this on ${formatSpeakableDate(timing.placeOrderOn)}. It should arrive about ${formatSpeakableDate(timing.expectedArrival)}, which is after ${formatSpeakableDate(timing.deliveryBy)}. It will not make the occasion.`,
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
