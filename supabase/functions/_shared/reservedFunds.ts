/**
 * Wallet holds and the charge that spends them.
 * A reservation does not reduce gift_wallet_balance. Available = balance − pending holds.
 * Charging a hold must deduct the reserved amount and close that hold, or available goes negative.
 */

export const SERVICE_FEE = 7;

export const roundMoney = (amount: number): number => Math.round((Number(amount) || 0) * 100) / 100;

/** Whole dollars render as $47; anything else keeps cents. */
export const formatUsd = (amount: number): string => {
  const rounded = roundMoney(amount);
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) return `$${Math.round(rounded)}`;
  return `$${rounded.toFixed(2)}`;
};

export type ReservationAssessment = {
  covered: boolean;
  cost: number;
  shortfall: number;
  /** Amount to deduct from the gross balance. 0 when the gift is already paid or the hold is short. */
  chargeAmount: number;
  alreadyPaid: boolean;
};

/**
 * A hold covers the gift when it matches the quoted price + service fee,
 * or when it matches the product price exactly (older automation holds that did not include the fee).
 * A shortfall is only the difference, never a second full charge.
 */
export const assessReservation = (args: {
  productPrice: number;
  pendingReserved: number;
  paymentStatus?: string | null;
}): ReservationAssessment => {
  const price = roundMoney(Math.max(0, args.productPrice || 0));
  const reserved = roundMoney(Math.max(0, args.pendingReserved || 0));
  const quoted = roundMoney(price + (price > 0 ? SERVICE_FEE : 0));
  const paid = (args.paymentStatus || "").toLowerCase() === "paid";

  if (paid && reserved <= 0.009) {
    return { covered: true, cost: quoted || price, shortfall: 0, chargeAmount: 0, alreadyPaid: true };
  }
  if (quoted > 0 && reserved + 0.009 >= quoted) {
    return { covered: true, cost: quoted, shortfall: 0, chargeAmount: reserved, alreadyPaid: false };
  }
  if (price > 0 && Math.abs(reserved - price) <= 0.009) {
    return { covered: true, cost: price, shortfall: 0, chargeAmount: reserved, alreadyPaid: false };
  }

  const cost = quoted > 0 ? quoted : reserved;
  const shortfall = roundMoney(Math.max(0, cost - reserved));
  return { covered: shortfall <= 0.009 && reserved > 0, cost, shortfall, chargeAmount: 0, alreadyPaid: false };
};

export type ReservedChargePlan =
  | {
      action: "charge";
      userId: string;
      chargeAmount: number;
      newBalance: number;
      availableAfter: number;
      cost: number;
      reserved: number;
    }
  | {
      action: "already_paid";
      userId: string;
      cost: number;
    }
  | {
      action: "shortfall";
      userId: string;
      shortfall: number;
      reserved: number;
      cost: number;
    }
  | {
      action: "no_reservation";
      userId: string;
    }
  | { action: "forbidden" }
  | { action: "already_ordered" }
  | { action: "insufficient"; reserved: number; cost: number };

/**
 * Decide whether a service-role or user call may spend this gift's hold.
 * Service role (actorUserId null) charges reservation's owner, which is giftUserId.
 */
export const planReservedCharge = (args: {
  grossBalance: number;
  pendingReserved: number;
  otherReserved: number;
  productPrice: number;
  paymentStatus: string | null;
  /** Null when the caller is the service role. */
  actorUserId: string | null;
  giftUserId: string;
  /** Set when a pending reservation row exists. */
  hasPendingReservation: boolean;
  alreadyOrdered: boolean;
}): ReservedChargePlan => {
  if (args.alreadyOrdered) return { action: "already_ordered" };
  if (args.actorUserId && args.actorUserId !== args.giftUserId) return { action: "forbidden" };

  const userId = args.giftUserId;
  if (!args.hasPendingReservation) {
    if ((args.paymentStatus || "").toLowerCase() === "paid") {
      const assessment = assessReservation({
        productPrice: args.productPrice,
        pendingReserved: 0,
        paymentStatus: "paid",
      });
      return { action: "already_paid", userId, cost: assessment.cost };
    }
    return { action: "no_reservation", userId };
  }

  const assessment = assessReservation({
    productPrice: args.productPrice,
    pendingReserved: args.pendingReserved,
    paymentStatus: args.paymentStatus,
  });
  if (!assessment.covered) {
    return {
      action: "shortfall",
      userId,
      shortfall: assessment.shortfall,
      reserved: roundMoney(args.pendingReserved),
      cost: assessment.cost,
    };
  }

  const chargeAmount = assessment.chargeAmount;
  const newBalance = roundMoney(args.grossBalance - chargeAmount);
  const availableAfter = roundMoney(newBalance - args.otherReserved);
  if (newBalance < -0.009 || availableAfter < -0.009) {
    return {
      action: "insufficient",
      reserved: roundMoney(args.pendingReserved),
      cost: assessment.cost,
    };
  }
  return {
    action: "charge",
    userId,
    chargeAmount,
    newBalance,
    availableAfter,
    cost: assessment.cost,
    reserved: roundMoney(args.pendingReserved),
  };
};

export type DirectChargePlan =
  | { ok: true; amount: number; newBalance: number; availableAfter: number }
  | { ok: false; shortfall: number; available: number };

/** Spend available balance only. Other gifts' holds are not part of the spendable amount. */
export const planDirectCharge = (args: {
  grossBalance: number;
  otherReserved: number;
  amount: number;
}): DirectChargePlan => {
  const amount = roundMoney(args.amount);
  const available = roundMoney(args.grossBalance - args.otherReserved);
  if (!(amount > 0) || available + 0.009 < amount) {
    return { ok: false, shortfall: roundMoney(Math.max(0, amount - Math.max(0, available))), available };
  }
  const newBalance = roundMoney(args.grossBalance - amount);
  const availableAfter = roundMoney(newBalance - args.otherReserved);
  if (newBalance < -0.009 || availableAfter < -0.009) {
    return { ok: false, shortfall: roundMoney(Math.max(0, amount - Math.max(0, available))), available };
  }
  return { ok: true, amount, newBalance, availableAfter };
};

export type OrderNowDecision =
  | { action: "place"; chargeAmount: number; usesHold: boolean; confirmationCopy: string }
  | { action: "shortfall"; shortfall: number; reserved: number; cost: number; confirmationCopy: string }
  | { action: "reject"; error: string };

export const orderNowConfirmationCopy = (args: {
  recipientName: string;
  reservedAmount: number;
  cost: number;
  shortfall: number;
  placed: boolean;
}): string => {
  const name = (args.recipientName || "them").split(/\s+/)[0] || "them";
  if (args.placed && args.shortfall <= 0.009 && args.reservedAmount > 0.009) {
    return `I'll place this now using the ${formatUsd(args.reservedAmount)} already held for ${name}. Nothing new will be charged.`;
  }
  if (args.placed && args.shortfall <= 0.009) {
    return `I'll place this now for ${name}. Nothing new will be charged.`;
  }
  if (args.reservedAmount <= 0.009) {
    return `This gift costs ${formatUsd(args.cost)} and nothing is held for it yet, so ${formatUsd(args.shortfall || args.cost)} is needed before I can place it.`;
  }
  return `The hold for ${name} is ${formatUsd(args.reservedAmount)} and this gift costs ${formatUsd(args.cost)}, so ${formatUsd(args.shortfall)} more is needed before I can place it.`;
};

/** Ownership, address, already-ordered, and whether the existing hold covers the gift. */
export const decideReservedOrder = (args: {
  owned: boolean;
  hasAddress: boolean;
  alreadyOrdered: boolean;
  recipientName: string;
  productPrice: number;
  pendingReserved: number;
  paymentStatus: string | null;
}): OrderNowDecision => {
  if (!args.owned) return { action: "reject", error: "That gift isn't on this account." };
  if (args.alreadyOrdered) return { action: "reject", error: "This gift is already ordered." };
  if (!args.hasAddress) return { action: "reject", error: "A delivery address is needed before this can be ordered." };

  const assessment = assessReservation({
    productPrice: args.productPrice,
    pendingReserved: args.pendingReserved,
    paymentStatus: args.paymentStatus,
  });
  if (assessment.covered) {
    return {
      action: "place",
      chargeAmount: assessment.chargeAmount,
      usesHold: assessment.chargeAmount > 0.009,
      confirmationCopy: orderNowConfirmationCopy({
        recipientName: args.recipientName,
        reservedAmount: args.pendingReserved,
        cost: assessment.cost,
        shortfall: 0,
        placed: true,
      }),
    };
  }
  return {
    action: "shortfall",
    shortfall: assessment.shortfall,
    reserved: roundMoney(Math.max(0, args.pendingReserved)),
    cost: assessment.cost,
    confirmationCopy: orderNowConfirmationCopy({
      recipientName: args.recipientName,
      reservedAmount: args.pendingReserved,
      cost: assessment.cost,
      shortfall: assessment.shortfall,
      placed: false,
    }),
  };
};

/**
 * Decide whether a new (or swapped) gift hold can be placed.
 * `existingReserved` for this gift is transferable and is not counted in `otherReserved`.
 * Spendable = gross − other holds (= true available + this gift's current hold).
 * Top-up is only the shortfall against that spendable amount, never a second full charge.
 */
export type ReserveFundsPlan = {
  cost: number;
  existingReserved: number;
  /** True wallet available: gross − all pending holds (including this gift). */
  available: number;
  /** Gross − other gifts' holds (includes this gift's transferable hold). */
  spendable: number;
  shortfall: number;
  covered: boolean;
};

export const planReserveFunds = (args: {
  grossBalance: number;
  otherReserved: number;
  existingReserved: number;
  giftPrice: number;
}): ReserveFundsPlan => {
  const price = roundMoney(Math.max(0, args.giftPrice || 0));
  const cost = roundMoney(price + (price > 0 ? SERVICE_FEE : 0));
  const other = roundMoney(Math.max(0, args.otherReserved || 0));
  const existing = roundMoney(Math.max(0, args.existingReserved || 0));
  const gross = roundMoney(Math.max(0, args.grossBalance || 0));
  const spendable = roundMoney(gross - other);
  const available = roundMoney(spendable - existing);
  const shortfall = roundMoney(Math.max(0, cost - Math.max(0, spendable)));
  return {
    cost,
    existingReserved: existing,
    available: Math.max(0, available),
    spendable: Math.max(0, spendable),
    shortfall,
    covered: shortfall <= 0.009 && cost > 0.009,
  };
};

/** Top-up amount once a gift's transferable reserved hold is applied. */
export const topUpShortfall = (args: {
  cost: number;
  available: number;
  reservedApplied?: number;
}): number =>
  roundMoney(Math.max(0, roundMoney(args.cost) - roundMoney(Math.max(0, args.available)) - roundMoney(Math.max(0, args.reservedApplied || 0))));

/** Service-role bearer tokens must not be sent to auth.getUser. */
export const resolveChargeActor = (
  token: string | null,
  serviceRoleKey: string,
): "service" | "user" | "missing" => {
  if (!token) return "missing";
  if (serviceRoleKey && token === serviceRoleKey) return "service";
  return "user";
};
