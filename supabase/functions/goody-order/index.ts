import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

// Inlined rather than imported from ../_shared/cors.ts so this function is a
// single self-contained file, pastable directly into the Supabase Dashboard
// function editor (which only sees this one file, not sibling folders).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type GoodyVariant = { id?: string; name?: string };
type GoodyProduct = {
  id?: string;
  name?: string;
  price?: number | null;
  variants_num_selectable?: number;
  variants?: GoodyVariant[];
};

const goodyEnvironment = () => (Deno.env.get("GOODY_API_ENV") === "production" ? "production" : "sandbox");

const goodyApiKey = () => {
  const environment = goodyEnvironment();
  return environment === "production"
    ? Deno.env.get("GOODY_PRODUCTION_COMMERCE_API_KEY")
    : Deno.env.get("GOODY_SANDBOX_COMMERCE_API_KEY");
};

const goodyBaseUrl = () =>
  goodyEnvironment() === "production" ? "https://api.ongoody.com" : "https://api.sandbox.ongoody.com";

// Goody's product-catalog endpoint only supports listing (no confirmed
// single-product-by-id endpoint), so we fetch the page and find the product
// we need. Mirrors the same call gift-catalog's getGoodyCatalog already makes.
const findGoodyProduct = async (apiKey: string, productId: string): Promise<GoodyProduct | null> => {
  const response = await fetch(`${goodyBaseUrl()}/v1/products?page=1&per_page=100`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Goody product lookup failed with ${response.status}`);
  const payload = await response.json() as { data?: GoodyProduct[] };
  return (payload.data || []).find((product) => product.id === productId) || null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 200 });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "Server configuration unavailable" }, 503);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { scheduledGiftId, testMode = false } = await req.json();
    if (!scheduledGiftId) return json({ success: false, error: "Missing scheduledGiftId" }, 400);

    if (testMode) {
      return json({
        success: true,
        testMode: true,
        goodyOrderId: "test-order-" + Date.now(),
        message: "Test mode: skipped real Goody order creation",
      });
    }

    const apiKey = goodyApiKey();
    if (!apiKey) return json({ success: false, error: "Goody commerce API key not configured" }, 503);

    const { data: gift, error: giftError } = await admin
      .from("scheduled_gifts")
      .select("id, user_id, recipient_id, occasion, gift_variant_id, status, goody_order_id")
      .eq("id", scheduledGiftId)
      .single();
    if (giftError || !gift) return json({ success: false, error: "Gift not found" }, 404);

    // Idempotency: don't place a second order for a gift that already has one.
    if (gift.status === "ordered" || gift.status === "delivered" || gift.goody_order_id) {
      return json({ success: true, alreadyFulfilled: true, goodyOrderId: gift.goody_order_id });
    }

    if (!gift.gift_variant_id) {
      return json({ success: false, error: "Gift has no product selected" }, 400);
    }

    const { data: recipient, error: recipientError } = await admin
      .from("recipients")
      .select("name, email, street, apartment, city, state, zip_code, country")
      .eq("id", gift.recipient_id)
      .single();
    if (recipientError || !recipient) return json({ success: false, error: "Recipient not found" }, 404);
    if (!recipient.street || !recipient.city || !recipient.state || !recipient.zip_code) {
      return json({ success: false, error: "Recipient address is incomplete" }, 400);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", gift.user_id)
      .single();

    const product = await findGoodyProduct(apiKey, gift.gift_variant_id);
    if (!product || !product.id) {
      return json({ success: false, error: "Selected Goody product is no longer available" }, 400);
    }

    const cartItem: { product_id: string; quantity: number; variants?: string[] } = {
      product_id: product.id,
      quantity: 1,
    };
    if ((product.variants_num_selectable || 0) > 0) {
      const variantName = product.variants?.[0]?.name;
      if (!variantName) return json({ success: false, error: "Product requires a variant, none available" }, 400);
      cartItem.variants = [variantName];
    }

    const [firstName, ...lastNameParts] = recipient.name.trim().split(/\s+/);
    const fromName = profile?.full_name || (profile?.email ? profile.email.split("@")[0] : "A friend");

    const orderBody = {
      from_name: fromName,
      send_method: "direct_send",
      recipients: [
        {
          first_name: firstName || "Gift",
          last_name: lastNameParts.join(" ") || "Recipient",
          email: recipient.email || undefined,
          mailing_address: {
            first_name: firstName || "Gift",
            last_name: lastNameParts.join(" ") || "Recipient",
            address_1: recipient.street,
            address_2: recipient.apartment || undefined,
            city: recipient.city,
            state: recipient.state,
            postal_code: recipient.zip_code,
            country: recipient.country || "US",
          },
        },
      ],
      cart: { items: [cartItem] },
      // Draws from the account's prepaid Goody balance rather than relying on
      // "first payment method on the account" auto-resolution, which doesn't
      // pick up a dashboard-added card reliably.
      payment_method_id: "COMMERCE_STORED_VALUE",
    };

    const orderResponse = await fetch(`${goodyBaseUrl()}/v1/order_batches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(orderBody),
      signal: AbortSignal.timeout(15000),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("Goody order_batches request failed", orderResponse.status, errorText);
      return json({ success: false, error: `Goody order creation failed with ${orderResponse.status}` }, 502);
    }

    const orderBatch = await orderResponse.json() as {
      id?: string;
      orders_preview?: Array<{ id?: string }>;
    };
    const goodyOrderId = orderBatch.orders_preview?.[0]?.id || orderBatch.id;
    if (!goodyOrderId) {
      console.error("Goody order_batches response missing order id", orderBatch);
      return json({ success: false, error: "Goody did not return an order id" }, 502);
    }

    const { error: updateError } = await admin
      .from("scheduled_gifts")
      .update({
        status: "ordered",
        goody_order_id: goodyOrderId,
        gift_description: `Goody order: ${goodyOrderId} | Product: ${product.name || gift.gift_variant_id}`.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduledGiftId);
    if (updateError) console.error("Failed to record goody_order_id on scheduled_gifts", updateError);

    return json({ success: true, goodyOrderId, selectedProduct: { productId: product.id, productName: product.name } });
  } catch (error) {
    console.error("goody-order failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create Goody order",
    }, 500);
  }
});
