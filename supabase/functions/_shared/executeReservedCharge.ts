import { decideReservedOrder, formatUsd, planDirectCharge, planReservedCharge, roundMoney } from "./reservedFunds.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export type ChargeOk = {
  ok: true;
  alreadyCharged?: boolean;
  chargedAmount: number;
  newBalance: number;
  userId: string;
  fromReservation: boolean;
  transactionId: string | null;
  confirmationCopy: string;
};

export type ChargeFail = {
  ok: false;
  status: number;
  code: "unauthorized" | "forbidden" | "not_found" | "already_ordered" | "shortfall" | "no_reservation" | "insufficient" | "failed";
  error: string;
  shortfall?: number;
  reserved?: number;
  cost?: number;
  confirmationCopy?: string;
};

export type ChargeOutcome = ChargeOk | ChargeFail;

const absAmount = (value: unknown): number => Math.abs(Number(value) || 0);

/**
 * Convert this gift's pending hold into a completed charge on the gift owner's wallet.
 * actorUserId null means the service role: charge reservation.user_id / gift.user_id, never auth.getUser(serviceKey).
 */
export async function executeReservedCharge(
  supabase: SupabaseLike,
  args: { scheduledGiftId: string; actorUserId: string | null; recipientName?: string },
): Promise<ChargeOutcome> {
  const { data: gift, error: giftError } = await supabase
    .from("scheduled_gifts")
    .select("id, user_id, payment_status, payment_amount, estimated_cost, wallet_reserved, goody_order_id, status")
    .eq("id", args.scheduledGiftId)
    .maybeSingle();
  if (giftError || !gift) return { ok: false, status: 404, code: "not_found", error: "Gift not found" };

  const ordered = Boolean(gift.goody_order_id) ||
    ["ordered", "fulfilled", "shipped", "delivered"].includes(String(gift.status || "").toLowerCase());

  const { data: reservationRows } = await supabase
    .from("wallet_transactions")
    .select("id, amount, user_id")
    .eq("scheduled_gift_id", gift.id)
    .eq("transaction_type", "reservation")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);
  const reservation = Array.isArray(reservationRows) ? reservationRows[0] : reservationRows;

  const userId = String(gift.user_id);
  const { data: pendingRows } = await supabase
    .from("wallet_transactions")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("transaction_type", "reservation")
    .eq("status", "pending");

  const { data: profile, error: profileError } = reservation
    ? await supabase.from("profiles").select("gift_wallet_balance").eq("id", userId).maybeSingle()
    : { data: null, error: null };
  if (reservation && (profileError || !profile)) {
    return { ok: false, status: 500, code: "failed", error: "Could not read wallet balance" };
  }

  const pendingReserved = reservation ? absAmount(reservation.amount) : 0;
  const otherReserved = ((pendingRows || []) as Array<{ id: string; amount: number }>)
    .filter((row) => !reservation || row.id !== reservation.id)
    .reduce((sum, row) => sum + absAmount(row.amount), 0);

  const plan = planReservedCharge({
    grossBalance: Number(profile?.gift_wallet_balance) || 0,
    pendingReserved,
    otherReserved,
    productPrice: Number(gift.payment_amount ?? gift.estimated_cost) || 0,
    paymentStatus: gift.payment_status,
    actorUserId: args.actorUserId,
    giftUserId: userId,
    hasPendingReservation: Boolean(reservation),
    alreadyOrdered: ordered,
  });

  const name = args.recipientName || "them";
  if (plan.action === "forbidden") return { ok: false, status: 403, code: "forbidden", error: "Unauthorized" };
  if (plan.action === "already_ordered") {
    return { ok: false, status: 409, code: "already_ordered", error: "Gift is already ordered" };
  }
  if (plan.action === "no_reservation") {
    return { ok: false, status: 200, code: "no_reservation", error: "No pending reservation" };
  }
  if (plan.action === "already_paid") {
    const decision = decideReservedOrder({
      owned: true,
      hasAddress: true,
      alreadyOrdered: false,
      recipientName: name,
      productPrice: Number(gift.payment_amount ?? gift.estimated_cost) || 0,
      pendingReserved: 0,
      paymentStatus: "paid",
    });
    return {
      ok: true,
      alreadyCharged: true,
      chargedAmount: 0,
      newBalance: Number(profile?.gift_wallet_balance) || 0,
      userId,
      fromReservation: false,
      transactionId: null,
      confirmationCopy: decision.action === "place" ? decision.confirmationCopy : "Nothing new will be charged.",
    };
  }
  if (plan.action === "shortfall") {
    const decision = decideReservedOrder({
      owned: true,
      hasAddress: true,
      alreadyOrdered: false,
      recipientName: name,
      productPrice: Number(gift.payment_amount ?? gift.estimated_cost) || 0,
      pendingReserved: plan.reserved,
      paymentStatus: gift.payment_status,
    });
    return {
      ok: false,
      status: 200,
      code: "shortfall",
      error: "shortfall",
      shortfall: plan.shortfall,
      reserved: plan.reserved,
      cost: plan.cost,
      confirmationCopy: decision.action === "shortfall" ? decision.confirmationCopy : undefined,
    };
  }
  if (plan.action === "insufficient") {
    return {
      ok: false,
      status: 200,
      code: "insufficient",
      error: "Insufficient balance to complete charge",
      reserved: plan.reserved,
      cost: plan.cost,
    };
  }

  if (!reservation) {
    return { ok: false, status: 500, code: "failed", error: "Reservation disappeared before it could be charged" };
  }
  if (reservation.user_id && reservation.user_id !== userId) {
    return { ok: false, status: 409, code: "failed", error: "Reservation does not belong to the gift owner" };
  }

  const { data: locked, error: lockError } = await supabase
    .from("wallet_transactions")
    .update({
      transaction_type: "charge",
      status: "completed",
      balance_after: plan.newBalance,
    })
    .eq("id", reservation.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (lockError || !locked) {
    return {
      ok: true,
      alreadyCharged: true,
      chargedAmount: 0,
      newBalance: plan.newBalance,
      userId,
      fromReservation: true,
      transactionId: null,
      confirmationCopy: "Nothing new will be charged.",
    };
  }

  const { data: balanceRow, error: balanceError } = await supabase
    .from("profiles")
    .update({ gift_wallet_balance: plan.newBalance })
    .eq("id", userId)
    .gte("gift_wallet_balance", plan.chargeAmount)
    .select("gift_wallet_balance")
    .maybeSingle();
  if (balanceError || !balanceRow) {
    await supabase
      .from("wallet_transactions")
      .update({ transaction_type: "reservation", status: "pending", balance_after: Number(profile?.gift_wallet_balance) || 0 })
      .eq("id", reservation.id);
    return { ok: false, status: 200, code: "insufficient", error: "Insufficient balance to complete charge" };
  }

  const { error: giftUpdateError } = await supabase
    .from("scheduled_gifts")
    .update({
      payment_status: "paid",
      payment_amount: plan.chargeAmount,
      wallet_reserved: true,
      wallet_reservation_amount: plan.chargeAmount,
    })
    .eq("id", gift.id);
  if (giftUpdateError) {
    console.error("executeReservedCharge: gift payment status not saved", giftUpdateError);
  }

  const decision = decideReservedOrder({
    owned: true,
    hasAddress: true,
    alreadyOrdered: false,
    recipientName: name,
    productPrice: Number(gift.payment_amount ?? gift.estimated_cost) || 0,
    pendingReserved: plan.reserved,
    paymentStatus: gift.payment_status,
  });

  return {
    ok: true,
    chargedAmount: plan.chargeAmount,
    newBalance: plan.newBalance,
    userId,
    fromReservation: true,
    transactionId: locked.id,
    confirmationCopy: decision.action === "place"
      ? decision.confirmationCopy
      : `I'll place this now using the hold. Nothing new will be charged.`,
  };
}

/** Charge spendable balance for a gift that has no hold. Refuses if it would make available negative. */
export async function chargeAvailableBalance(
  supabase: SupabaseLike,
  args: { scheduledGiftId: string; userId: string; amount: number },
): Promise<ChargeOutcome> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("gift_wallet_balance")
    .eq("id", args.userId)
    .maybeSingle();
  if (profileError || !profile) return { ok: false, status: 400, code: "failed", error: "Could not fetch wallet balance." };

  const { data: pendingRows } = await supabase
    .from("wallet_transactions")
    .select("amount")
    .eq("user_id", args.userId)
    .eq("transaction_type", "reservation")
    .eq("status", "pending");
  const otherReserved = ((pendingRows || []) as Array<{ amount: number }>)
    .reduce((sum, row) => sum + absAmount(row.amount), 0);
  const plan = planDirectCharge({
    grossBalance: Number(profile.gift_wallet_balance) || 0,
    otherReserved,
    amount: args.amount,
  });
  if (!plan.ok) {
    return {
      ok: false,
      status: 200,
      code: "insufficient",
      error: "insufficient",
      shortfall: plan.shortfall,
      confirmationCopy: `${formatUsd(plan.shortfall)} more is needed before this can be ordered.`,
    };
  }

  const { data: txn, error: txnError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: args.userId,
      amount: -plan.amount,
      balance_after: plan.newBalance,
      transaction_type: "charge",
      status: "completed",
      scheduled_gift_id: args.scheduledGiftId,
    })
    .select("id")
    .maybeSingle();
  if (txnError || !txn) return { ok: false, status: 500, code: "failed", error: "Failed to record wallet transaction." };

  const { data: balanceRow, error: balanceError } = await supabase
    .from("profiles")
    .update({ gift_wallet_balance: plan.newBalance })
    .eq("id", args.userId)
    .gte("gift_wallet_balance", plan.amount)
    .select("gift_wallet_balance")
    .maybeSingle();
  if (balanceError || !balanceRow) {
    await supabase.from("wallet_transactions").update({ status: "cancelled" }).eq("id", txn.id);
    return { ok: false, status: 200, code: "insufficient", error: "Insufficient balance to complete charge", shortfall: plan.amount };
  }

  await supabase
    .from("scheduled_gifts")
    .update({ payment_status: "paid", payment_amount: plan.amount })
    .eq("id", args.scheduledGiftId);

  return {
    ok: true,
    chargedAmount: plan.amount,
    newBalance: plan.newBalance,
    userId: args.userId,
    fromReservation: false,
    transactionId: txn.id,
    confirmationCopy: "Nothing new beyond this order will be charged.",
  };
}

/** Put a charge back so a failed partner order does not keep the money or drop the hold. */
export async function restoreLatestWalletCharge(
  supabase: SupabaseLike,
  args: { scheduledGiftId: string; userId: string },
): Promise<void> {
  const { data: transaction } = await supabase
    .from("wallet_transactions")
    .select("id, amount, transaction_type, status")
    .eq("scheduled_gift_id", args.scheduledGiftId)
    .eq("transaction_type", "charge")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!transaction) return;

  const amount = absAmount(transaction.amount);
  const { data: profile } = await supabase
    .from("profiles")
    .select("gift_wallet_balance")
    .eq("id", args.userId)
    .maybeSingle();
  const restored = roundMoney((Number(profile?.gift_wallet_balance) || 0) + amount);
  await supabase.from("profiles").update({ gift_wallet_balance: restored }).eq("id", args.userId);

  const { data: gift } = await supabase
    .from("scheduled_gifts")
    .select("wallet_reserved")
    .eq("id", args.scheduledGiftId)
    .maybeSingle();
  const fromReservation = Boolean(gift?.wallet_reserved);

  if (fromReservation) {
    await supabase
      .from("wallet_transactions")
      .update({ transaction_type: "reservation", status: "pending", balance_after: restored })
      .eq("id", transaction.id);
    await supabase
      .from("scheduled_gifts")
      .update({
        payment_status: "unpaid",
        wallet_reserved: true,
        wallet_reservation_amount: amount,
      })
      .eq("id", args.scheduledGiftId);
    return;
  }

  await supabase.from("wallet_transactions").update({ status: "cancelled" }).eq("id", transaction.id);
  await supabase
    .from("scheduled_gifts")
    .update({ payment_status: "unpaid" })
    .eq("id", args.scheduledGiftId);
}
