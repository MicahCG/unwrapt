import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isAlreadyOrdered } from "./giftOrderState.ts";

Deno.test("gifts with a Goody order or an ordered/shipped status are skipped", () => {
  assertEquals(isAlreadyOrdered({ status: "ordered", goody_order_id: "abc" }), true);
  assertEquals(isAlreadyOrdered({ status: "confirmed", goody_order_id: "abc" }), true);
  assertEquals(isAlreadyOrdered({ status: "shipped" }), true);
  assertEquals(isAlreadyOrdered({ status: "fulfilled" }), true);
});

Deno.test("unordered gifts still go through the pipeline", () => {
  assertEquals(isAlreadyOrdered({ status: "confirmed", goody_order_id: null }), false);
  assertEquals(isAlreadyOrdered({ status: "approved" }), false);
  assertEquals(isAlreadyOrdered({}), false);
});
