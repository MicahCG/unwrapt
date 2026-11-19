// Which Goody payment method an order should draw from. Goody's docs: payment_method_id defaults to the first
// payment method on the account, and GET /v1/payment_methods lists them ({ id, name, balance? }). The old
// hard-coded "COMMERCE_STORED_VALUE" is not a real id on this account ("Payment method not found").

export type GoodyPaymentMethod = { id?: string | null; name?: string | null; balance?: number | null };

/**
 * Which key places the order. The Commerce key (catalog) cannot see this workspace's Balance or cards; a
 * workspace Automation API key can. When one is configured, orders use it and the workspace's own payment methods;
 * otherwise we keep the Commerce key (and Commerce Stored Value).
 */
export const pickOrderApiKey = (
  environment: "production" | "sandbox",
  read: (name: string) => string | undefined,
  commerceKey: string | undefined,
): { key: string | undefined; source: "automation" | "commerce" } => {
  const automation = read(environment === "production" ? "GOODY_PRODUCTION_AUTOMATION_API_KEY" : "GOODY_SANDBOX_AUTOMATION_API_KEY")?.trim();
  return automation ? { key: automation, source: "automation" } : { key: commerceKey, source: "commerce" };
};

export type PaymentChoice =
  | { ok: true; id: string; reason: "override" | "balance" }
  | { ok: false; error: string };

const label = (m: GoodyPaymentMethod) => m.name || m.id || "unnamed method";

/**
 * Prefer an explicit override; otherwise the method that holds a prepaid balance (largest first). We do not
 * quietly pick a card: the account owner expects orders to come out of the prepaid balance.
 */
export const choosePaymentMethod = (methods: GoodyPaymentMethod[], override?: string | null): PaymentChoice => {
  const forced = (override || "").trim();
  if (forced) return { ok: true, id: forced, reason: "override" };

  const usable = methods.filter((m): m is GoodyPaymentMethod & { id: string } => typeof m.id === "string" && m.id.length > 0);
  if (usable.length === 0) {
    return { ok: false, error: "Goody has no payment method on this account. Add funds or a payment method in Goody, then try again." };
  }
  const funded = usable
    .filter((m) => typeof m.balance === "number" && m.balance > 0)
    .sort((a, b) => (b.balance as number) - (a.balance as number));
  if (funded.length > 0) return { ok: true, id: funded[0].id, reason: "balance" };

  return {
    ok: false,
    error: `None of Goody's payment methods (${usable.map(label).join(", ")}) shows a prepaid balance to draw from. Add funds in Goody, or set GOODY_PAYMENT_METHOD_ID to the one to use.`,
  };
};
