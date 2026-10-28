import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Self-service account deletion (App Store guideline 5.1.1(v)). Deletes only the caller's own
 * data and auth user, identified from their JWT, never from the request body. Web (Stripe)
 * subscriptions are cancelled here; App Store subscriptions can only be cancelled by the user
 * in iOS Settings, which the app tells them before they confirm.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Rows owned by the user. Everything else (profile, conversations, fulfillment rows) cascades
// from the auth user or from scheduled_gifts.
const USER_TABLES = [
  "automation_logs",
  "wallet_transactions",
  "payments",
  "scheduled_gifts",
  "recipients",
  "user_metrics",
  "calendar_integrations",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Cancel any web subscription so a deleted account is never billed again.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey && user.email) {
      try {
        const customers = await fetch(
          `https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email)}&limit=1`,
          { headers: { Authorization: `Bearer ${stripeKey}` } },
        ).then((r) => r.json());
        const customerId = customers.data?.[0]?.id;
        if (customerId) {
          const subs = await fetch(
            `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=10`,
            { headers: { Authorization: `Bearer ${stripeKey}` } },
          ).then((r) => r.json());
          for (const sub of subs.data || []) {
            await fetch(`https://api.stripe.com/v1/subscriptions/${sub.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${stripeKey}` },
            });
          }
        }
      } catch (error) {
        console.error("delete-account: Stripe cancellation failed", error);
        return json({ error: "Couldn't cancel your subscription. Nothing was deleted; please try again." }, 502);
      }
    }

    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", user.id);
      if (error) console.error(`delete-account: ${table}`, error.message);
    }
    if (user.email) await admin.from("notification_queue").delete().eq("user_email", user.email);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return json({ success: true });
  } catch (error) {
    console.error("delete-account failed", error);
    return json({ error: error instanceof Error ? error.message : "Account deletion failed" }, 500);
  }
});
