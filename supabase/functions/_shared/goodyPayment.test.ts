import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { choosePaymentMethod } from "./goodyPayment.ts";

Deno.test("an explicit override wins", () => {
  assertEquals(choosePaymentMethod([{ id: "a", balance: 500 }], " pm-x "), { ok: true, id: "pm-x", reason: "override" });
});

Deno.test("uses the method that holds a prepaid balance, largest first", () => {
  const r = choosePaymentMethod([{ id: "card", name: "Visa 1234" }, { id: "w1", balance: 1000 }, { id: "w2", balance: 5000 }]);
  assertEquals(r, { ok: true, id: "w2", reason: "balance" });
});

Deno.test("does not quietly pick a card when nothing has a balance", () => {
  const r = choosePaymentMethod([{ id: "card", name: "Visa 1234", balance: null }]);
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.error.includes("Visa 1234"), true);
});

Deno.test("no payment methods at all says so", () => {
  const r = choosePaymentMethod([]);
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.error.includes("no payment method"), true);
});

Deno.test("a zero balance is not usable", () => {
  assertEquals(choosePaymentMethod([{ id: "w", balance: 0 }]).ok, false);
});
