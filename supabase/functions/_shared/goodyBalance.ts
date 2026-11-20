// Low-balance watch for the Goody prepaid Balance that pays for orders. Orders fail when it runs dry, and Goody
// offers no way to top it up from code, so we email the admin(s) before that happens.

import type { GoodyPaymentMethod } from "./goodyPayment.ts";
import { pickOrderApiKey } from "./goodyPayment.ts";

/** About two orders' worth (an order is roughly $26 with shipping and tax). Override with GOODY_LOW_BALANCE_THRESHOLD_USD. */
export const DEFAULT_LOW_BALANCE_USD = 55;

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

/** What we last recorded for the Balance: an alert we sent, or the balance recovering above the threshold. */
export type BalanceEvent = "alert" | "recovered" | null;

/**
 * One email per low period. Alert when the balance is below the threshold and the last thing we recorded was not
 * already an alert. Topping back up records "recovered", which re-arms the next alert.
 */
export const shouldAlertLowBalance = (input: {
  balanceCents: number | null;
  thresholdUsd: number;
  lastEvent: BalanceEvent;
}): boolean => {
  if (input.balanceCents == null) return false; // can't tell: stay quiet rather than cry wolf
  if (input.balanceCents >= Math.round(input.thresholdUsd * 100)) return false;
  return input.lastEvent !== "alert";
};

/** True when the balance is healthy again after we alerted, so the alert can be re-armed. */
export const shouldRecordRecovery = (input: { balanceCents: number | null; thresholdUsd: number; lastEvent: BalanceEvent }): boolean =>
  input.balanceCents != null && input.balanceCents >= Math.round(input.thresholdUsd * 100) && input.lastEvent === "alert";

/**
 * Who gets the alert: every admin plus any extra addresses in GOODY_LOW_BALANCE_ALERT_EMAILS (comma or space
 * separated). Case-insensitive, de-duplicated, malformed entries dropped. Keeps addresses out of the code.
 */
export const alertRecipients = (
  admins: Array<{ email: string | null; full_name: string | null }>,
  extraRaw: string | undefined,
): Array<{ email: string; name?: string }> => {
  const seen = new Set<string>();
  const out: Array<{ email: string; name?: string }> = [];
  const add = (email: string | null | undefined, name?: string | null) => {
    const clean = (email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ email: clean, ...(name ? { name } : {}) });
  };
  for (const a of admins) add(a.email, a.full_name);
  for (const e of (extraRaw || "").split(/[\s,;]+/)) add(e);
  return out;
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
 * Reads the Goody balance and, when it first drops below the threshold, emails the alert recipients once (no repeats
 * until it has recovered above the threshold). Best effort: never throws,
 * so it can ride along with ordering and the nightly job without ever breaking them.
 */
export const checkGoodyBalanceAndAlert = async (
  admin: AdminClient,
  opts: { apiKey: string | undefined; baseUrl: string; thresholdUsd: number; source: string; extraEmails?: string },
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

    const { data: recent } = await admin
      .from("automation_logs")
      .select("action")
      .eq("stage", "goody_balance")
      .in("action", ["low_balance_alert", "balance_recovered"])
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = (recent as Array<{ action: string }> | null)?.[0]?.action;
    const lastEvent: BalanceEvent = latest === "low_balance_alert" ? "alert" : latest === "balance_recovered" ? "recovered" : null;

    if (shouldRecordRecovery({ balanceCents: cents, thresholdUsd: opts.thresholdUsd, lastEvent })) {
      await admin.from("automation_logs").insert({
        user_id: adminIds[0],
        stage: "goody_balance",
        action: "balance_recovered",
        details: { balanceUsd, thresholdUsd: opts.thresholdUsd, source: opts.source },
      });
      return { balanceUsd, alerted: false };
    }
    if (!shouldAlertLowBalance({ balanceCents: cents, thresholdUsd: opts.thresholdUsd, lastEvent })) {
      return { balanceUsd, alerted: false };
    }

    const { data: profiles } = await admin.from("profiles").select("id, email, full_name").in("id", adminIds);
    let sent = false;
    const recipients = alertRecipients((profiles || []) as Array<{ email: string | null; full_name: string | null }>, opts.extraEmails);
    for (const p of recipients) {
      const { error } = await admin.functions.invoke("send-notification-email", {
        body: {
          type: "goody_balance_low",
          recipientEmail: p.email,
          userName: p.name,
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
