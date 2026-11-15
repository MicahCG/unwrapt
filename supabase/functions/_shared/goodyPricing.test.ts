// Run with: deno test --no-check -A supabase/functions/_shared/goodyPricing.test.ts
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { quoteGoodyOrderPrice } from "./goodyPricing.ts";

const US_RECIPIENT = {
  firstName: "Aunty",
  lastName: "Smith",
  street: "1 Main St",
  city: "Austin",
  state: "TX",
  zipCode: "78701",
  country: "US",
};

const withStubbedFetch = async (
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) => {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
};

Deno.test("quoteGoodyOrderPrice returns null for a non-US recipient without calling Goody at all (the price endpoint is US-only today)", async () => {
  let called = false;
  await withStubbedFetch(
    () => {
      called = true;
      return Promise.resolve(new Response("{}", { status: 200 }));
    },
    async () => {
      const quote = await quoteGoodyOrderPrice({
        apiKey: "test-key",
        environment: "sandbox",
        productId: "prod_1",
        recipient: { ...US_RECIPIENT, country: "Canada" },
      });
      assertEquals(quote, null);
    },
  );
  assertEquals(called, false);
});

Deno.test("quoteGoodyOrderPrice parses a cart_price response (the documented shape)", async () => {
  await withStubbedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            cart_price: { price_product: 1000, price_shipping: 1000, price_processing_fee: 100, price_est_tax_high: 210 },
            total_price: { est_tax_calculated: 187 },
          }),
          { status: 200 },
        ),
      ),
    async () => {
      const quote = await quoteGoodyOrderPrice({
        apiKey: "test-key",
        environment: "sandbox",
        productId: "prod_1",
        recipient: US_RECIPIENT,
      });
      assert(quote);
      assertEquals(quote?.productCost, 10);
      assertEquals(quote?.shippingCost, 10);
      assertEquals(quote?.processingFeeCost, 1);
      // Prefers the real calculated tax (direct_send + full address) over the estimate range.
      assertEquals(quote?.taxCost, 1.87);
    },
  );
});

Deno.test("quoteGoodyOrderPrice also parses the alternate cart_price_estimate key (docs show both names)", async () => {
  await withStubbedFetch(
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            cart_price_estimate: { price_product: 2000, price_shipping: 500, price_processing_fee: 150, price_est_tax_high: 100 },
          }),
          { status: 200 },
        ),
      ),
    async () => {
      const quote = await quoteGoodyOrderPrice({
        apiKey: "test-key",
        environment: "sandbox",
        productId: "prod_1",
        recipient: US_RECIPIENT,
      });
      assert(quote);
      assertEquals(quote?.shippingCost, 5);
      // No total_price.est_tax_calculated this time - falls back to the estimate range's high end.
      assertEquals(quote?.taxCost, 1);
    },
  );
});

Deno.test("quoteGoodyOrderPrice returns null (never throws) on a non-ok response or missing address fields", async () => {
  await withStubbedFetch(
    () => Promise.resolve(new Response(JSON.stringify({ error: "Product not found" }), { status: 400 })),
    async () => {
      const quote = await quoteGoodyOrderPrice({
        apiKey: "test-key",
        environment: "sandbox",
        productId: "prod_missing",
        recipient: US_RECIPIENT,
      });
      assertEquals(quote, null);
    },
  );
});
