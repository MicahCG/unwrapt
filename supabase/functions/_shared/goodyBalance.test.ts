import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { alertRecipients, balanceCentsFrom, DEFAULT_LOW_BALANCE_USD, goodyBalanceCredentials, shouldAlertLowBalance, thresholdUsd } from "./goodyBalance.ts";

Deno.test("reads the BALANCE method in cents, ignoring cards", () => {
  assertEquals(balanceCentsFrom([{ id: "BALANCE", balance: 575 }, { id: "c1", name: "Visa" }]), 575);
  assertEquals(balanceCentsFrom([{ id: "c1" }]), null);
});

Deno.test("threshold defaults to about two orders and accepts an override", () => {
  assertEquals(thresholdUsd(undefined), DEFAULT_LOW_BALANCE_USD);
  assertEquals(thresholdUsd("80"), 80);
  assertEquals(thresholdUsd("junk"), DEFAULT_LOW_BALANCE_USD);
  assertEquals(thresholdUsd("-5"), DEFAULT_LOW_BALANCE_USD);
});

Deno.test("alerts below the threshold, not at or above it", () => {
  assertEquals(shouldAlertLowBalance({ balanceCents: 575, thresholdUsd: 55 }), true);
  assertEquals(shouldAlertLowBalance({ balanceCents: 5500, thresholdUsd: 55 }), false);
  assertEquals(shouldAlertLowBalance({ balanceCents: 9000, thresholdUsd: 55 }), false);
});

Deno.test("stays quiet when the balance is unknown", () => {
  assertEquals(shouldAlertLowBalance({ balanceCents: null, thresholdUsd: 55 }), false);
});

Deno.test("no second alert inside 24 hours, but one after", () => {
  const now = new Date("2026-11-20T12:00:00Z");
  assertEquals(shouldAlertLowBalance({ balanceCents: 100, thresholdUsd: 55, lastAlertAt: "2026-11-20T02:00:00Z", now }), false);
  assertEquals(shouldAlertLowBalance({ balanceCents: 100, thresholdUsd: 55, lastAlertAt: "2026-11-19T02:00:00Z", now }), true);
});

Deno.test("credentials prefer the Automation key in production", () => {
  const env: Record<string, string> = { GOODY_API_ENV: "production", GOODY_PRODUCTION_AUTOMATION_API_KEY: "auto", GOODY_PRODUCTION_COMMERCE_API_KEY: "comm" };
  assertEquals(goodyBalanceCredentials((n) => env[n]), { apiKey: "auto", baseUrl: "https://api.ongoody.com" });
});

Deno.test("alert goes to admins plus the extra addresses, de-duplicated case-insensitively", () => {
  const r = alertRecipients(
    [{ email: "Admin@Example.com", full_name: "A" }],
    "Extra@Example.com, admin@example.com; not-an-email",
  );
  assertEquals(r.map((x) => x.email), ["Admin@Example.com", "Extra@Example.com"]);
});

Deno.test("with no extra addresses only the admins are alerted", () => {
  assertEquals(alertRecipients([{ email: "a@b.co", full_name: null }], undefined).length, 1);
  assertEquals(alertRecipients([], undefined), []);
});
