import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const bytesToBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

// Manual Svix verification (avoids pulling in the svix npm package's CJS/ESM
// interop uncertainty on esm.sh for a fulfillment-critical function). Scheme
// per https://docs.svix.com/receiving/verifying-payloads/how-manual.
const verifySvixSignature = async (
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): Promise<boolean> => {
  const timestampSeconds = Number(svixTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 5 * 60) return false; // reject anything older than 5 minutes

  const secretBytes = base64ToBytes(secret.replace(/^whsec_/, ""));
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const computed = bytesToBase64(signature);

  return svixSignature
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter(Boolean)
    .some((candidate) => candidate === computed);
};

const sendNotificationEmail = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  type: string,
  recipientEmail: string,
  userName: string | null,
  data: Record<string, unknown>,
) => {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ type, recipientEmail, userName, data }),
    });
  } catch (error) {
    console.error(`Failed to send ${type} email`, error);
  }
};

const handleOrderDelivered = async (admin: ReturnType<typeof createClient>, order: Record<string, unknown>) => {
  const goodyOrderId = order.id as string | undefined;
  if (!goodyOrderId) return;

  const shipments = (order.shipments as Array<Record<string, unknown>> | undefined) || [];
  const trackingNumber = (shipments[0]?.tracking_number as string | undefined) || null;

  const { data: gifts, error } = await admin
    .from("scheduled_gifts")
    .select("id, user_id, recipient_id, occasion, occasion_date, gift_description")
    .eq("goody_order_id", goodyOrderId);
  if (error || !gifts?.length) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  for (const gift of gifts) {
    await admin
      .from("scheduled_gifts")
      .update({
        status: "delivered",
        fulfilled_at: new Date().toISOString(),
        goody_tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gift.id);

    const { data: recipient } = await admin.from("recipients").select("name").eq("id", gift.recipient_id).single();
    const { data: userProfile } = await admin.from("profiles").select("email, full_name").eq("id", gift.user_id).single();

    if (userProfile?.email) {
      await sendNotificationEmail(supabaseUrl, serviceRoleKey, "gift_sent", userProfile.email, userProfile.full_name, {
        recipientName: recipient?.name || "your recipient",
        occasion: gift.occasion,
        trackingNumber,
        deliveryDate: gift.occasion_date,
        giftDescription: gift.gift_description,
      });
    }
  }
};

const handleOrderCanceledOrRefunded = async (admin: ReturnType<typeof createClient>, order: Record<string, unknown>) => {
  const goodyOrderId = order.id as string | undefined;
  if (!goodyOrderId) return;

  const { data: gifts, error } = await admin
    .from("scheduled_gifts")
    .select("id, user_id, recipient_id, occasion, payment_amount, estimated_cost")
    .eq("goody_order_id", goodyOrderId);
  if (error || !gifts?.length) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  for (const gift of gifts) {
    const { data: recipient } = await admin.from("recipients").select("name").eq("id", gift.recipient_id).single();
    const { data: userProfile } = await admin.from("profiles").select("email, full_name").eq("id", gift.user_id).single();

    await admin.from("scheduled_gifts").delete().eq("id", gift.id);

    if (userProfile?.email) {
      await sendNotificationEmail(supabaseUrl, serviceRoleKey, "order_cancelled", userProfile.email, userProfile.full_name, {
        recipientName: recipient?.name || "your recipient",
        occasion: gift.occasion,
        amount: gift.payment_amount || gift.estimated_cost || 0,
      });
    }
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 200 });

  try {
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");
    const signingSecret = Deno.env.get("GOODY_WEBHOOK_SIGNING_SECRET");

    if (!signingSecret) return json({ error: "Webhook not configured" }, 500);
    if (!svixId || !svixTimestamp || !svixSignature) return json({ error: "Missing signature headers" }, 401);

    const rawBody = await req.text();
    const isValid = await verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, signingSecret);
    if (!isValid) return json({ error: "Invalid signature" }, 401);

    const payload = JSON.parse(rawBody) as { event_type?: string; data?: Record<string, unknown> };
    const { event_type: eventType, data: order } = payload;
    if (!eventType || !order) return json({ error: "Invalid payload" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration unavailable" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    switch (eventType) {
      case "order.delivered":
        await handleOrderDelivered(admin, order);
        break;
      case "order.canceled":
      case "order.refunded":
        await handleOrderCanceledOrRefunded(admin, order);
        break;
      default:
        console.log(`Unhandled goody webhook event: ${eventType}`);
    }

    return json({ success: true, eventType, processed: true });
  } catch (error) {
    console.error("goody-webhook failed", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
