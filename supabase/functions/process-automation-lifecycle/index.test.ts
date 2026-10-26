// Regression test for the CC-08 finding: a recipient whose
// default_gift_variant_id can't be resolved against the live Goody catalog
// (e.g. a stale pre-migration Shopify id - confirmed live on 2 production
// recipients during this investigation) must fail for THAT recipient only,
// not abort the rest of the automation batch. Run with:
//   deno test --allow-env supabase/functions/process-automation-lifecycle/index.test.ts
// (index.ts guards its serve() call behind `import.meta.main` so this
// import doesn't start a live HTTP listener - see the comment there.)
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { handleFundReservation } from "./index.ts";

// fetchGoodyProduct short-circuits to null with no network call when no
// Goody API key is configured (supabase/functions/process-automation-lifecycle/index.ts,
// fetchGoodyProduct) - deterministically reproducing "product id can't be
// resolved" without mocking fetch.
Deno.env.delete("GOODY_PRODUCTION_COMMERCE_API_KEY");
Deno.env.delete("GOODY_SANDBOX_COMMERCE_API_KEY");

type LoggedCall = { table: string; row: Record<string, unknown> };

const makeFakeClient = (logged: LoggedCall[]) => ({
  from(table: string) {
    return {
      insert: async (row: Record<string, unknown>) => {
        logged.push({ table, row });
        return { error: null };
      },
    };
  },
  rpc: async () => {
    throw new Error("rpc should not be reached before the product price fetch fails");
  },
});

Deno.test("handleFundReservation logs a per-recipient 'error' and returns (does not throw) when the default gift product can't be resolved", async () => {
  const logged: LoggedCall[] = [];
  const gift = { id: "gift_1", user_id: "user_1" };
  const recipient = { id: "recipient_1", default_gift_variant_id: "gid://shopify/ProductVariant/123", profiles: {} };

  await handleFundReservation(makeFakeClient(logged), gift, recipient);

  assertEquals(logged.length, 1);
  assertEquals(logged[0].table, "automation_logs");
  assertEquals(logged[0].row.action, "error");
  assertEquals(logged[0].row.stage, "fund_reservation");
});

Deno.test("handleFundReservation logs 'failed' (not 'error') and returns cleanly when no default gift variant is set at all", async () => {
  const logged: LoggedCall[] = [];
  const gift = { id: "gift_2", user_id: "user_1" };
  const recipient = { id: "recipient_2", default_gift_variant_id: null, profiles: {} };

  await handleFundReservation(makeFakeClient(logged), gift, recipient);

  assertEquals(logged.length, 1);
  assertEquals(logged[0].row.action, "failed");
});
