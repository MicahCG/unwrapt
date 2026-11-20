// A gift that already has a Goody order must never go back through the nightly pipeline: re-running it sends a
// false "Gift confirmed" email and then fails the wallet charge (already charged) with an "Automation issue" email.
export const isAlreadyOrdered = (gift: { status?: string | null; goody_order_id?: string | null }): boolean =>
  Boolean(gift.goody_order_id) || ["ordered", "fulfilled", "shipped", "delivered"].includes(String(gift.status || ""));
