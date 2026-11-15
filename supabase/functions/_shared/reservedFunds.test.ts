import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { isPlaceByReached, shouldAutoOrderGift } from "./giftTiming.ts";
import {
  assessReservation,
  decideReservedOrder,
  orderNowConfirmationCopy,
  planDirectCharge,
  planReserveFunds,
  planReservedCharge,
  resolveChargeActor,
  topUpShortfall,
} from "./reservedFunds.ts";

const vipGift = {
  wallet_reserved: true,
  status: "confirmed",
  address_confirmed_at: "2026-11-01T00:00:00Z",
  payment_status: "unpaid",
  goody_order_id: null,
  occasion_date: "2026-12-02",
  shipping_lead_days: null,
};

Deno.test("place-by for a Dec 2 gift is Nov 8, and Nov 11 is due", () => {
  assertEquals(isPlaceByReached("2026-12-02", "2026-11-04"), false);
  assertEquals(isPlaceByReached("2026-12-02", "2026-11-08"), true);
  assertEquals(isPlaceByReached("2026-12-02", "2026-11-11"), true);
  assertEquals(shouldAutoOrderGift(vipGift, "2026-11-04"), false);
  assertEquals(shouldAutoOrderGift(vipGift, "2026-11-11"), true);
});

Deno.test("a shorter shipping lead moves place-by later", () => {
  assertEquals(isPlaceByReached("2026-12-02", "2026-11-11", 7), false);
  assertEquals(isPlaceByReached("2026-12-02", "2026-11-22", 7), true);
});

Deno.test("service role is not treated as a user token", () => {
  assertEquals(resolveChargeActor("service-key", "service-key"), "service");
  assertEquals(resolveChargeActor("user-jwt", "service-key"), "user");
  assertEquals(resolveChargeActor("", "service-key"), "missing");
});

Deno.test("charging a $47 hold on a $50 wallet leaves $3 and does not charge the $40 sticker price", () => {
  const plan = planReservedCharge({
    grossBalance: 50,
    pendingReserved: 47,
    otherReserved: 0,
    productPrice: 40,
    paymentStatus: "unpaid",
    actorUserId: null,
    giftUserId: "vip-user",
    hasPendingReservation: true,
    alreadyOrdered: false,
  });
  assertEquals(plan.action, "charge");
  if (plan.action !== "charge") return;
  assertEquals(plan.userId, "vip-user");
  assertEquals(plan.chargeAmount, 47);
  assertEquals(plan.newBalance, 3);
  assertEquals(plan.availableAfter, 3);
});

Deno.test("a user cannot charge someone else's reservation", () => {
  const plan = planReservedCharge({
    grossBalance: 50,
    pendingReserved: 47,
    otherReserved: 0,
    productPrice: 40,
    paymentStatus: "unpaid",
    actorUserId: "someone-else",
    giftUserId: "vip-user",
    hasPendingReservation: true,
    alreadyOrdered: false,
  });
  assertEquals(plan.action, "forbidden");
});

Deno.test("price above the hold asks for the difference and does not charge", () => {
  const plan = planReservedCharge({
    grossBalance: 50,
    pendingReserved: 47,
    otherReserved: 0,
    productPrice: 50,
    paymentStatus: "unpaid",
    actorUserId: null,
    giftUserId: "vip-user",
    hasPendingReservation: true,
    alreadyOrdered: false,
  });
  assertEquals(plan.action, "shortfall");
  if (plan.action !== "shortfall") return;
  assertEquals(plan.shortfall, 10);
  assertEquals(plan.cost, 57);
  assertEquals(plan.reserved, 47);
});

Deno.test("a legacy hold of the exact product price is spent as-is", () => {
  const assessment = assessReservation({ productPrice: 40, pendingReserved: 40, paymentStatus: "unpaid" });
  assertEquals(assessment.covered, true);
  assertEquals(assessment.chargeAmount, 40);
  assertEquals(assessment.shortfall, 0);
});

Deno.test("a direct charge cannot spend another gift's hold", () => {
  const blocked = planDirectCharge({ grossBalance: 50, otherReserved: 47, amount: 40 });
  assertEquals(blocked.ok, false);
  if (blocked.ok) return;
  assertEquals(blocked.available, 3);
  assertEquals(blocked.shortfall, 37);

  const fits = planDirectCharge({ grossBalance: 50, otherReserved: 47, amount: 3 });
  assertEquals(fits.ok, true);
  if (!fits.ok) return;
  assertEquals(fits.newBalance, 47);
  assertEquals(fits.availableAfter, 0);
});

Deno.test("order-now copy for a fully reserved gift does not ask for a top-up", () => {
  const decision = decideReservedOrder({
    owned: true,
    hasAddress: true,
    alreadyOrdered: false,
    recipientName: "Alex Rivera",
    productPrice: 40,
    pendingReserved: 47,
    paymentStatus: "unpaid",
  });
  assertEquals(decision.action, "place");
  if (decision.action !== "place") return;
  assertEquals(decision.usesHold, true);
  assertEquals(decision.chargeAmount, 47);
  assert(!/top-?up/i.test(decision.confirmationCopy));
  assert(!/add funds/i.test(decision.confirmationCopy));
  assert(/nothing new will be charged/i.test(decision.confirmationCopy));
  assert(decision.confirmationCopy.includes("$47"));
  assert(decision.confirmationCopy.includes("Alex"));
});

Deno.test("order-now copy states the exact shortfall and still does not ask to repay the whole gift", () => {
  const copy = orderNowConfirmationCopy({
    recipientName: "Alex",
    reservedAmount: 40,
    cost: 47,
    shortfall: 7,
    placed: false,
  });
  assert(copy.includes("$7"));
  assert(copy.includes("$40"));
  assert(copy.includes("$47"));
  assert(!/top-?up/i.test(copy));
  assert(!/full price/i.test(copy));
});

Deno.test("order-now rejects a gift that is not owned, already ordered, or missing an address", () => {
  assertEquals(decideReservedOrder({
    owned: false, hasAddress: true, alreadyOrdered: false, recipientName: "Alex",
    productPrice: 40, pendingReserved: 47, paymentStatus: "unpaid",
  }).action, "reject");
  assertEquals(decideReservedOrder({
    owned: true, hasAddress: true, alreadyOrdered: true, recipientName: "Alex",
    productPrice: 40, pendingReserved: 47, paymentStatus: "unpaid",
  }).action, "reject");
  assertEquals(decideReservedOrder({
    owned: true, hasAddress: false, alreadyOrdered: false, recipientName: "Alex",
    productPrice: 40, pendingReserved: 47, paymentStatus: "unpaid",
  }).action, "reject");
});

Deno.test("swap reuses a $47 hold toward a $41 gift with $3 available and needs no top-up", () => {
  // Matches the Aunty Coffee O'Clock → Layla Red Wine Glasses bug: $47 reserved, $3 available.
  const plan = planReserveFunds({
    grossBalance: 50,
    otherReserved: 0,
    existingReserved: 47,
    giftPrice: 34,
  });
  assertEquals(plan.cost, 41);
  assertEquals(plan.available, 3);
  assertEquals(plan.spendable, 50);
  assertEquals(plan.existingReserved, 47);
  assertEquals(plan.shortfall, 0);
  assertEquals(plan.covered, true);
  assertEquals(topUpShortfall({ cost: 41, available: 3, reservedApplied: 47 }), 0);
});

Deno.test("swap to a pricier gift only asks for the delta above the transferable hold", () => {
  const plan = planReserveFunds({
    grossBalance: 50,
    otherReserved: 0,
    existingReserved: 47,
    giftPrice: 50,
  });
  assertEquals(plan.cost, 57);
  assertEquals(plan.spendable, 50);
  assertEquals(plan.shortfall, 7);
  assertEquals(plan.covered, false);
  assertEquals(topUpShortfall({ cost: 57, available: 3, reservedApplied: 47 }), 7);
});

Deno.test("a new gift without a hold cannot spend another gift's reservation", () => {
  const plan = planReserveFunds({
    grossBalance: 50,
    otherReserved: 47,
    existingReserved: 0,
    giftPrice: 34,
  });
  assertEquals(plan.cost, 41);
  assertEquals(plan.available, 3);
  assertEquals(plan.spendable, 3);
  assertEquals(plan.shortfall, 38);
  assertEquals(plan.covered, false);
});
