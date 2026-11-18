import { goodyMailingCountry } from "./isoCountry.ts";

/**
 * Real per-order shipping/tax from Goody's own price-check endpoint
 * (POST /v1/order_batches/price), so a wallet reservation isn't just the
 * catalog price plus a flat guess - Goody bills shipping and tax as real,
 * separate amounts that vary by recipient address and product.
 * Docs: https://developer.ongoody.com/api-reference/order-batches/calculate-the-price-for-an-order-batch
 */
export type GoodyOrderPriceQuote = {
  /** Goody's own live product price, in dollars - informational only; callers should keep
   * using the price they already quoted the user rather than silently swapping it in. */
  productCost: number;
  shippingCost: number;
  /** Goody's own processing fee for the order, in dollars. */
  processingFeeCost: number;
  /** Real calculated tax when Goody has a full address (direct_send), in dollars. */
  taxCost: number;
};

type GoodyPriceCart = {
  price_product?: number;
  price_shipping?: number;
  price_processing_fee?: number;
  price_est_tax_high?: number;
};

type GoodyPriceResponse = {
  cart_price?: GoodyPriceCart;
  // Docs show both names across the schema and its own examples - read whichever is present.
  cart_price_estimate?: GoodyPriceCart;
  total_price?: { est_tax_calculated?: number | null; est_total_calculated?: number | null };
};

/**
 * Quotes real shipping/tax for one product shipped to one recipient. Returns null (never
 * throws) on any failure - callers should fall back to their existing flat estimate rather
 * than block a reservation on a non-critical pricing call. Goody's price endpoint only
 * supports US addresses today, so a non-US recipient also returns null.
 */
export async function quoteGoodyOrderPrice(args: {
  apiKey: string;
  environment: "production" | "sandbox";
  productId: string;
  quantity?: number;
  variants?: string[];
  recipient: {
    firstName?: string | null;
    lastName?: string | null;
    street: string;
    apartment?: string | null;
    city: string;
    state: string;
    zipCode: string;
    country?: string | null;
  };
}): Promise<GoodyOrderPriceQuote | null> {
  const country = goodyMailingCountry(args.recipient.country);
  if (country !== "US") return null;

  const baseUrl = args.environment === "production" ? "https://api.ongoody.com" : "https://api.sandbox.ongoody.com";
  const firstName = (args.recipient.firstName || "Gift").trim() || "Gift";
  const lastName = (args.recipient.lastName || "Recipient").trim() || "Recipient";
  const cartItem: { product_id: string; quantity: number; variants?: string[] } = {
    product_id: args.productId,
    quantity: args.quantity ?? 1,
  };
  if (args.variants?.length) cartItem.variants = args.variants;

  try {
    const response = await fetch(`${baseUrl}/v1/order_batches/price`, {
      method: "POST",
      headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        send_method: "direct_send",
        recipients: [{
          first_name: firstName,
          last_name: lastName,
          mailing_address: {
            first_name: firstName,
            last_name: lastName,
            address_1: args.recipient.street,
            address_2: args.recipient.apartment || undefined,
            city: args.recipient.city,
            state: args.recipient.state,
            postal_code: args.recipient.zipCode,
            country,
          },
        }],
        cart: { items: [cartItem] },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error("Goody price quote failed", response.status, await response.text());
      return null;
    }
    const data = await response.json() as GoodyPriceResponse;
    const cart = data.cart_price || data.cart_price_estimate;
    if (!cart) return null;
    const productCost = Number(cart.price_product) || 0;
    const shippingCost = Number(cart.price_shipping) || 0;
    const processingFeeCost = Number(cart.price_processing_fee) || 0;
    // Direct send with a full address gets a real calculated tax, not just an estimate range.
    const taxCents = data.total_price?.est_tax_calculated ?? cart.price_est_tax_high ?? 0;
    return {
      productCost: productCost / 100,
      shippingCost: shippingCost / 100,
      processingFeeCost: processingFeeCost / 100,
      taxCost: Number(taxCents) / 100,
    };
  } catch (error) {
    console.error("Goody price quote error", error);
    return null;
  }
}
