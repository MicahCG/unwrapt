import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  try {
    console.log("🎣 Processing Stripe webhook");

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log(`📨 Webhook event type: ${event.type}`);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const planType = session.metadata?.plan_type;

        if (!userId) {
          console.error("❌ No user ID in session metadata");
          break;
        }

        console.log(`✅ Checkout completed for user: ${userId}, plan: ${planType}`);

        // Update user to VIP tier
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_tier: "vip",
            subscription_status: "active",
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error updating profile:", updateError);
          throw updateError;
        }

        console.log(`✅ User ${userId} upgraded to VIP`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get user by customer ID
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) break;

        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        console.log(`📝 Subscription updated for user: ${userId}`);

        // Update subscription status based on Stripe status
        let status = "active";
        if (subscription.status === "canceled" || subscription.status === "unpaid") {
          status = "cancelled";
        } else if (subscription.status === "past_due") {
          status = "expired";
        }

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_tier: subscription.status === "active" ? "vip" : "free",
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error updating subscription:", updateError);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) break;

        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        console.log(`🚫 Subscription cancelled for user: ${userId}`);

        // Downgrade to free tier
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "cancelled",
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error downgrading user:", updateError);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🎣 Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
