import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Starting auto-reload process");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, amount, paymentMethodId } = await req.json();

    if (!userId || !amount || !paymentMethodId) {
      throw new Error("Missing required parameters");
    }

    console.log(`💳 Auto-reloading $${amount} for user ${userId}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, full_name, gift_wallet_balance")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;

    // Create Stripe charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        user_id: userId,
        type: "auto_reload",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment failed: ${paymentIntent.status}`);
    }

    console.log("✅ Stripe charge succeeded");

    // Update wallet balance
    const newBalance = (profile.gift_wallet_balance || 0) + amount;

    const { error: balanceError } = await supabaseClient
      .from("profiles")
      .update({ gift_wallet_balance: newBalance })
      .eq("id", userId);

    if (balanceError) throw balanceError;

    // Create wallet transaction record
    const { error: transactionError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        amount: amount,
        balance_after: newBalance,
        transaction_type: "auto_reload",
        status: "completed",
        stripe_payment_intent_id: paymentIntent.id,
      });

    if (transactionError) throw transactionError;

    // Send confirmation email
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "auto_reload_success",
        recipientEmail: profile.email,
        userName: profile.full_name,
        data: {
          reloadAmount: amount,
          newBalance: newBalance,
        },
      },
    });

    console.log(`✅ Auto-reload completed: $${amount}, new balance: $${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        newBalance,
        reloadedAmount: amount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Auto-reload error:", error);

    // If this is called from automation, update auto_reload_enabled = false
    const { userId } = await req.json().catch(() => ({}));
    if (userId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseClient
        .from("profiles")
        .update({ auto_reload_enabled: false })
        .eq("id", userId);

      // Notify user
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (profile) {
        await supabaseClient.functions.invoke("send-notification-email", {
          body: {
            type: "auto_reload_failed",
            recipientEmail: profile.email,
            data: {
              userName: profile.full_name,
              error: error.message,
            },
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
