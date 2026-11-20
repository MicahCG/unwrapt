// Low-balance watch for the Goody prepaid Balance that pays for orders. Orders fail when it runs dry, and Goody
// offers no way to top it up from code, so we email the admin(s) before that happens.

import type { GoodyPaymentMethod } from "./goodyPayment.ts";
import { pickOrderApiKey } from "./goodyPayment.ts";

/** About two orders' worth (an order is roughly $26 with shipping and tax). Override with GOODY_LOW_BALANCE_THRESHOLD_USD. */
export const DEFAULT_LOW_BALANCE_USD = 55;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** The Balance in cents, or null when Goody lists no balance-bearing method. */
export const balanceCentsFrom = (methods: GoodyPaymentMethod[]): number | null => {
  const named = methods.find((m) => m.id === "BALANCE" && typeof m.balance === "number");
  if (named) return named.balance as number;
  const any = methods.find((m) => typeof m.balance === "number");
  return any ? (any.balance as number) : null;
};

export const thresholdUsd = (raw: string | undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_LOW_BALANCE_USD;
};

/** Alert when the balance is below the threshold and we haven't already alerted within the cooldown. */
export const shouldAlertLowBalance = (input: {
  balanceCents: number | null;
  thresholdUsd: number;
  lastAlertAt?: string | null;
  now?: Date;
}): boolean => {
  if (input.balanceCents == null) return false; // can't tell: stay quiet rather than cry wolf
  if (input.balanceCents >= Math.round(input.thresholdUsd * 100)) return false;
  if (input.lastAlertAt) {
    const last = Date.parse(input.lastAlertAt);
    if (Number.isFinite(last) && (input.now ?? new Date()).getTime() - last < COOLDOWN_MS) return false;
  }
  return true;
};

export const goodyBalanceCredentials = (read: (name: string) => string | undefined) => {
  const environment = read("GOODY_API_ENV") === "production" ? "production" : "sandbox";
  const commerce = environment === "production" ? read("GOODY_PRODUCTION_COMMERCE_API_KEY") : read("GOODY_SANDBOX_COMMERCE_API_KEY");
  const { key } = pickOrderApiKey(environment, read, commerce);
  return {
    apiKey: key,
    baseUrl: environment === "production" ? "https://api.ongoody.com" : "https://api.sandbox.ongoody.com",
  };
};

// deno-lint-ignore no-explicit-any
type AdminClient = any;

/**
 * Reads the Goody balance and, if it is low, emails every admin (at most once per day). Best effort: never throws,
 * so it can ride along with ordering and the nightly job without ever breaking them.
 */
export const checkGoodyBalanceAndAlert = async (
  admin: AdminClient,
  opts: { apiKey: string | undefined; baseUrl: string; thresholdUsd: number; source: string },
): Promise<{ balanceUsd: number | null; alerted: boolean }> => {
  try {
    if (!opts.apiKey) return { balanceUsd: null, alerted: false };
    const response = await fetch(`${opts.baseUrl}/v1/payment_methods`, {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { balanceUsd: null, alerted: false };
    const methods = ((await response.json()) as { data?: GoodyPaymentMethod[] }).data || [];
    const cents = balanceCentsFrom(methods);
    const balanceUsd = cents == null ? null : cents / 100;
    console.log(`Goody balance check (${opts.source}): ${balanceUsd == null ? "unknown" : `$${balanceUsd.toFixed(2)}`}, threshold $${opts.thresholdUsd}`);
    if (cents == null) return { balanceUsd, alerted: false };

    const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = ((roles || []) as Array<{ user_id: string }>).map((r) => r.user_id);
    if (adminIds.length === 0) return { balanceUsd, alerted: false };

    const since = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recent } = await admin
      .from("automation_logs")
      .select("created_at")
      .eq("stage", "goody_balance")
      .eq("action", "low_balance_alert")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    const lastAlertAt = (recent as Array<{ created_at: string }> | null)?.[0]?.created_at ?? null;
    if (!shouldAlertLowBalance({ balanceCents: cents, thresholdUsd: opts.thresholdUsd, lastAlertAt })) {
      return { balanceUsd, alerted: false };
    }

    const { data: profiles } = await admin.from("profiles").select("id, email, full_name").in("id", adminIds);
    let sent = false;
    for (const p of (profiles || []) as Array<{ id: string; email: string | null; full_name: string | null }>) {
      if (!p.email) continue;
      const { error } = await admin.functions.invoke("send-notification-email", {
        body: {
          type: "goody_balance_low",
          recipientEmail: p.email,
          userName: p.full_name || undefined,
          data: { currentBalance: balanceUsd, requiredAmount: opts.thresholdUsd },
        },
      });
      if (!error) sent = true;
    }
    if (sent) {
      await admin.from("automation_logs").insert({
        user_id: adminIds[0],
        stage: "goody_balance",
        action: "low_balance_alert",
        details: { balanceUsd, thresholdUsd: opts.thresholdUsd, source: opts.source },
      });
    }
    return { balanceUsd, alerted: sent };
  } catch (error) {
    console.error("Goody balance check failed (ignored)", error);
    return { balanceUsd: null, alerted: false };
  }
};
