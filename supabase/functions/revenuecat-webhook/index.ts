import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

/**
 * RevenueCat server webhook → profiles.subscription_tier / subscription_status.
 * Configure in RevenueCat dashboard to POST here with Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
 *
 * Docs: https://www.revenuecat.com/docs/webhooks
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RcEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  entitlements?: string[];
  expiration_at_ms?: number | null;
  store?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!webhookSecret || token !== webhookSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const event = (payload?.event || payload) as RcEvent;
    const eventType = String(event.type || payload?.type || "").toUpperCase();
    const appUserId = event.app_user_id || event.original_app_user_id;

    console.log("🍎 RevenueCat webhook", { eventType, appUserId });

    if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
      return new Response(JSON.stringify({ ok: true, skipped: "no identifiable user" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const grantTypes = new Set([
      "INITIAL_PURCHASE",
      "RENEWAL",
      "UNCANCELLATION",
      "NON_RENEWING_PURCHASE",
      "PRODUCT_CHANGE",
      "SUBSCRIPTION_EXTENDED",
      "TEMPORARY_ENTITLEMENT_GRANT",
    ]);
    const revokeTypes = new Set([
      "CANCELLATION",
      "EXPIRATION",
      "SUBSCRIPTION_PAUSED",
    ]);

    // Billing issues keep VIP until expiration event
    if (eventType === "BILLING_ISSUE") {
      await supabase
        .from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", appUserId);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (grantTypes.has(eventType)) {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: "vip",
          subscription_status: "active",
          trial_ends_at: null,
        })
        .eq("id", appUserId);

      if (error) throw error;
      console.log(`✅ Granted VIP via Apple IAP to ${appUserId}`);
    } else if (revokeTypes.has(eventType)) {
      // Only downgrade on true expiration; cancellation alone may still be in paid period
      if (eventType === "EXPIRATION" || eventType === "SUBSCRIPTION_PAUSED") {
        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "cancelled",
            trial_ends_at: null,
          })
          .eq("id", appUserId);
        if (error) throw error;
        console.log(`🚫 Revoked VIP for ${appUserId} (${eventType})`);
      } else if (eventType === "CANCELLATION") {
        await supabase
          .from("profiles")
          .update({ subscription_status: "cancelled" })
          .eq("id", appUserId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("RevenueCat webhook error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Webhook failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
