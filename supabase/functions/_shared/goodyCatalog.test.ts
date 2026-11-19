// Run with: deno test --no-check -A supabase/functions/_shared/goodyCatalog.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { matchesOccasion, productOccasions, productsMentionedIn, remainingPages, shippingFromBrand, shippingLabel } from "./goodyCatalog.ts";

Deno.test("shippingFromBrand converts cents to dollars and keeps unknowns null", () => {
  assertEquals(shippingFromBrand({ shipping_price: 1000, free_shipping_minimum: 7500 }), { shipping_price: 10, free_shipping_minimum: 75 });
  assertEquals(shippingFromBrand({ shipping_price: 0 }), { shipping_price: 0, free_shipping_minimum: null });
  assertEquals(shippingFromBrand(null), { shipping_price: null, free_shipping_minimum: null });
});

Deno.test("shippingLabel says free, a price, or nothing", () => {
  assertEquals(shippingLabel(30, { shipping_price: 0 }), "Free shipping");
  assertEquals(shippingLabel(30, { shipping_price: 10 }), "+ $10 shipping");
  assertEquals(shippingLabel(30, { shipping_price: 5.5 }), "+ $5.50 shipping");
  assertEquals(shippingLabel(80, { shipping_price: 10, free_shipping_minimum: 75 }), "Free shipping");
  assertEquals(shippingLabel(30, { shipping_price: 10, free_shipping_minimum: 75 }), "+ $10 shipping");
  assertEquals(shippingLabel(30, {}), null);
});

Deno.test("productOccasions keeps only the occasion set; matchesOccasion is loose", () => {
  const cats = [
    { name: "Food & Drink", sets: ["categories"] },
    { name: "Birthday", sets: ["occasions"] },
    { name: "Christmas", sets: ["occasions"] },
  ];
  const occ = productOccasions(cats);
  assertEquals(occ, ["birthday", "christmas"]);
  assertEquals(matchesOccasion(occ, "Birthday"), true);
  assertEquals(matchesOccasion(occ, "holiday"), true);
  assertEquals(matchesOccasion(occ, "anniversary"), false);
  assertEquals(matchesOccasion(undefined, "birthday"), false);
});

Deno.test("remainingPages covers the whole catalog, capped", () => {
  assertEquals(remainingPages(100), []);
  assertEquals(remainingPages(250), [2, 3]);
  assertEquals(remainingPages(undefined), []);
  assertEquals(remainingPages(10_000_000).length, 39);
});

Deno.test("productsMentionedIn finds named gifts, merging a name inside a longer one, ignoring short names", () => {
  const catalog = [
    { id: "1", name: "Grateful Mug" },
    { id: "2", name: "Grateful Mug Set of 4" },
    { id: "3", name: "Tote" },
    { id: "4", name: "Holiday Cookie & Brownie Duo" },
  ];
  assertEquals(productsMentionedIn("How about the Holiday Cookie & Brownie Duo for Kora?", catalog).map((p) => p.id), ["4"]);
  assertEquals(productsMentionedIn("The Grateful Mug Set of 4 is nice", catalog).map((p) => p.id), ["2"]);
  assertEquals(productsMentionedIn("Grateful Mug or the Holiday Cookie & Brownie Duo", catalog).map((p) => p.id), ["4", "1"]);
  assertEquals(productsMentionedIn("A tote would work", catalog), []);
});
