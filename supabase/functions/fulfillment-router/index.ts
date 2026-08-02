import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

type Route = "exact_gift" | "recipient_choice" | "retailer_handoff" | "concierge";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (message: string, status = 400) => json({ success: false, error: message }, status);

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");

const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
};

const newToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const firstName = (name: string | null | undefined) =>
  (name || "Your recipient").trim().split(/\s+/)[0].slice(0, 60);

const appOrigin = () => Deno.env.get("APP_URL") || "https://app.unwrapt.io";

const routeForGift = (gift: Record<string, unknown>): { route: Route; confidence: "high" | "medium" | "low" } => {
  const amount = Number(gift.estimated_cost || gift.wallet_reservation_amount || 0);
  if (amount >= 300) return { route: "concierge", confidence: "medium" };
  if (gift.gift_variant_id && gift.gift_description) return { route: "exact_gift", confidence: "high" };
  if (gift.gift_description || gift.gift_type) return { route: "recipient_choice", confidence: "medium" };
  return { route: "recipient_choice", confidence: "low" };
};

const publicOrder = (order: Record<string, unknown>) => {
  const { choice_token_hash: _token, metadata: _metadata, ...safe } = order;
  return safe;
};

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return fail("Server configuration unavailable", 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "view_choice" || action === "select_choice") {
      const rawToken = String(body?.token || "");
      if (rawToken.length < 32 || rawToken.length > 128) return fail("This gift link is invalid", 404);
      const tokenHash = await hashToken(rawToken);
      const { data: order, error } = await admin
        .from("fulfillment_orders")
        .select("id, route, status, choice_expires_at, recipient_id, scheduled_gift_id")
        .eq("choice_token_hash", tokenHash)
        .maybeSingle();

      if (error || !order) return fail("This gift link is invalid", 404);
      if (!order.choice_expires_at || new Date(order.choice_expires_at) <= new Date()) {
        return fail("This gift link has expired. Ask the sender for a new one.", 410);
      }
      if (order.route !== "recipient_choice") return fail("This gift does not use recipient choice", 409);

      const [{ data: recipient }, { data: gift }, { data: options }] = await Promise.all([
        admin.from("recipients").select("name").eq("id", order.recipient_id).single(),
        admin.from("scheduled_gifts").select("occasion, occasion_date").eq("id", order.scheduled_gift_id).single(),
        admin.from("fulfillment_options")
          .select("id, title, description, image_url, price, currency, rank, is_selected")
          .eq("fulfillment_order_id", order.id)
          .order("rank"),
      ]);

      if (action === "view_choice") {
        return json({
          success: true,
          gift: {
            recipientFirstName: firstName(recipient?.name),
            occasion: gift?.occasion || "special occasion",
            occasionDate: gift?.occasion_date || null,
            status: order.status,
            options: options || [],
          },
        });
      }

      if (order.status !== "awaiting_recipient") {
        return fail(order.status === "recipient_selected" ? "A gift has already been selected" : "Selection is no longer available", 409);
      }
      const optionId = String(body?.optionId || "");
      const selected = options?.find((option) => option.id === optionId);
      if (!selected) return fail("That option is not available", 404);

      await admin.from("fulfillment_options").update({ is_selected: false }).eq("fulfillment_order_id", order.id);
      const { error: optionError } = await admin.from("fulfillment_options").update({ is_selected: true }).eq("id", optionId);
      if (optionError) throw optionError;

      const { data: updated, error: updateError } = await admin
        .from("fulfillment_orders")
        .update({ status: "recipient_selected", recipient_selected_at: new Date().toISOString() })
        .eq("id", order.id)
        .eq("status", "awaiting_recipient")
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return fail("A gift has already been selected", 409);

      await admin.from("fulfillment_events").insert({
        fulfillment_order_id: order.id,
        event_type: "recipient_selected_option",
        from_status: "awaiting_recipient",
        to_status: "recipient_selected",
        actor_type: "recipient",
        metadata: { option_id: optionId },
      });
      return json({ success: true, selection: { title: selected.title } });
    }

    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) return fail("Unauthorized", 401);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !user) return fail("Unauthorized", 401);

    if (action === "list") {
      const { data: orders, error } = await admin
        .from("fulfillment_orders")
        .select(`
          *,
          recipients(name),
          scheduled_gifts(occasion, occasion_date, gift_description, gift_image_url, estimated_cost),
          fulfillment_options(id, title, image_url, price, currency, rank, is_selected),
          fulfillment_events(id, event_type, from_status, to_status, actor_type, created_at)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ success: true, orders: (orders || []).map(publicOrder) });
    }

    if (action === "rotate_choice_link") {
      const orderId = String(body?.orderId || "");
      const { data: order } = await admin.from("fulfillment_orders")
        .select("id, route, status").eq("id", orderId).eq("user_id", user.id).maybeSingle();
      if (!order) return fail("Fulfillment order not found", 404);
      if (order.route !== "recipient_choice" || ["recipient_selected", "delivered", "cancelled"].includes(order.status)) {
        return fail("A choice link is not available for this order", 409);
      }
      const token = newToken();
      const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
      const { error } = await admin.from("fulfillment_orders").update({
        choice_token_hash: await hashToken(token), choice_expires_at: expiresAt, status: "awaiting_recipient",
      }).eq("id", order.id);
      if (error) throw error;
      await admin.from("fulfillment_events").insert({
        fulfillment_order_id: order.id, user_id: user.id, event_type: "choice_link_rotated",
        from_status: order.status, to_status: "awaiting_recipient", actor_type: "sender", actor_id: user.id,
      });
      return json({ success: true, choiceUrl: `${appOrigin()}/gift-choice/${token}`, expiresAt });
    }

    if (action !== "create_route") return fail("Unknown action", 400);
    const giftId = String(body?.giftId || "");
    const { data: gift, error: giftError } = await admin.from("scheduled_gifts")
      .select("id, user_id, recipient_id, occasion, occasion_date, gift_type, gift_description, gift_image_url, gift_variant_id, gift_vibe, estimated_cost, wallet_reservation_amount, shopify_order_id, fulfilled_at")
      .eq("id", giftId).eq("user_id", user.id).maybeSingle();
    if (giftError || !gift) return fail("Gift not found", 404);

    const automatic = routeForGift(gift);
    const requested = body?.route as Route | undefined;
    const route: Route = requested && ["exact_gift", "recipient_choice", "retailer_handoff", "concierge"].includes(requested)
      ? requested : automatic.route;
    const confidence = automatic.confidence;
    const existingStatus = route === "recipient_choice" ? "awaiting_recipient"
      : route === "concierge" ? "exception"
      : route === "exact_gift" && gift.shopify_order_id ? "submitted_to_partner"
      : route === "exact_gift" ? "ready_for_partner" : "awaiting_sender";
    const token = route === "recipient_choice" ? newToken() : null;
    const expiresAt = token ? new Date(Date.now() + 14 * 86400000).toISOString() : null;
    const provider = route === "concierge" ? "unwrapt_concierge"
      : route === "retailer_handoff" || gift.shopify_order_id ? "shopify" : "unassigned";

    const { data: existingOrder } = await admin.from("fulfillment_orders")
      .select("id, status").eq("scheduled_gift_id", gift.id).maybeSingle();
    if (existingOrder && ["submitted_to_partner", "shipped", "delivered", "cancelled"].includes(existingOrder.status)) {
      return fail("This fulfillment route can no longer be changed", 409);
    }

    const { data: order, error: upsertError } = await admin.from("fulfillment_orders").upsert({
      scheduled_gift_id: gift.id,
      user_id: user.id,
      recipient_id: gift.recipient_id,
      route,
      confidence,
      status: existingStatus,
      provider,
      external_order_id: gift.shopify_order_id || null,
      choice_token_hash: token ? await hashToken(token) : null,
      choice_expires_at: expiresAt,
      exception_reason: route === "concierge" ? "Concierge review requested" : null,
      approved_at: route === "exact_gift" ? new Date().toISOString() : null,
      submitted_at: gift.shopify_order_id ? (gift.fulfilled_at || new Date().toISOString()) : null,
      metadata: { routing_version: "mvp_v1", auto_recommended_route: automatic.route },
    }, { onConflict: "scheduled_gift_id" }).select("*").single();
    if (upsertError) throw upsertError;

    await admin.from("fulfillment_options").delete().eq("fulfillment_order_id", order.id);
    const { data: catalog } = await admin.from("products")
      .select("id, title, description, price, currency, featured_image_url, handle, shopify_product_id, shopify_variant_id")
      .eq("active", true).eq("available_for_sale", true).order("rank").limit(12);
    const sorted = [...(catalog || [])].sort((a, b) => {
      if (a.shopify_variant_id === gift.gift_variant_id) return -1;
      if (b.shopify_variant_id === gift.gift_variant_id) return 1;
      return Math.abs(Number(a.price) - Number(gift.estimated_cost || a.price)) - Math.abs(Number(b.price) - Number(gift.estimated_cost || b.price));
    }).slice(0, route === "recipient_choice" ? 3 : 1);

    const options = sorted.length ? sorted.map((product, rank) => ({
      fulfillment_order_id: order.id, product_id: product.id, title: product.title,
      description: product.description, image_url: product.featured_image_url, price: product.price,
      currency: product.currency || "USD", product_url: product.handle ? `https://unwrapt.io/products/${product.handle}` : null,
      provider: "shopify", provider_product_id: product.shopify_product_id,
      provider_variant_id: product.shopify_variant_id, rank,
    })) : [{
      fulfillment_order_id: order.id, title: gift.gift_description || gift.gift_type || "A gift picked for you",
      image_url: gift.gift_image_url, price: gift.estimated_cost, currency: "USD", provider: "unassigned", rank: 0,
    }];
    const { error: optionsError } = await admin.from("fulfillment_options").insert(options);
    if (optionsError) throw optionsError;

    await admin.from("fulfillment_events").insert({
      fulfillment_order_id: order.id, user_id: user.id, event_type: "route_created",
      to_status: existingStatus, actor_type: "sender", actor_id: user.id,
      metadata: { route, confidence, option_count: options.length },
    });

    return json({
      success: true,
      order: publicOrder(order),
      choiceUrl: token ? `${appOrigin()}/gift-choice/${token}` : null,
      expiresAt,
    });
  } catch (error) {
    console.error("fulfillment-router failed", error);
    return fail(error instanceof Error ? error.message : "Fulfillment routing failed", 500);
  }
});
