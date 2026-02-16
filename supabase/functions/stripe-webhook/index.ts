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
        const transactionType = session.metadata?.transaction_type;
        
        // Handle gift payment
        if (transactionType === "gift_payment") {
          const scheduledGiftId = session.metadata?.scheduled_gift_id;
          const userId = session.metadata?.user_id;
          
          if (!scheduledGiftId || !userId) {
            console.error("❌ Missing scheduled_gift_id or user_id in gift payment metadata");
            break;
          }
          
          console.log(`🎁 Gift payment completed for gift: ${scheduledGiftId}, user: ${userId}`);
          
          // Update payment status
          const { error: paymentError } = await supabaseClient
            .from("payments")
            .update({ 
              status: "paid",
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString()
            })
            .eq("stripe_session_id", session.id);
          
          if (paymentError) {
            console.error("❌ Error updating payment:", paymentError);
          }
          
          // Update gift payment status
          const { error: giftError } = await supabaseClient
            .from("scheduled_gifts")
            .update({ 
              payment_status: "paid",
              payment_amount: session.amount_total,
              updated_at: new Date().toISOString()
            })
            .eq("id", scheduledGiftId);
          
          if (giftError) {
            console.error("❌ Error updating gift:", giftError);
          }
          
          // Trigger fulfillment (Shopify order)
          console.log("🚀 Triggering gift fulfillment from webhook...");
          try {
            const fulfillmentResult = await supabaseClient.functions.invoke('process-gift-fulfillment', {
              body: { scheduledGiftId }
            });
            
            if (fulfillmentResult.error) {
              console.error("❌ Fulfillment error:", fulfillmentResult.error);
            } else {
              console.log("✅ Fulfillment triggered successfully from webhook");
            }
          } catch (fulfillmentError) {
            console.error("❌ Fulfillment trigger failed:", fulfillmentError);
          }
          
          break;
        }

        // Handle wallet deposit
        if (transactionType === "wallet_deposit") {
          const userId = session.metadata?.user_id;
          const amount = parseFloat(session.metadata?.amount || "0");
          
          if (!userId || !amount) {
            console.error("❌ Missing user_id or amount in wallet deposit metadata");
            break;
          }
          
          console.log(`💰 Wallet deposit completed for user: ${userId}, amount: $${amount}`);
          
          // Get current balance
          const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("gift_wallet_balance")
            .eq("id", userId)
            .single();
          
          if (profileError) {
            console.error("❌ Error fetching profile:", profileError);
            break;
          }
          
          const currentBalance = profile?.gift_wallet_balance || 0;
          const newBalance = currentBalance + amount;
          
          // Update wallet balance
          const { error: updateError } = await supabaseClient
            .from("profiles")
            .update({ gift_wallet_balance: newBalance })
            .eq("id", userId);
          
          if (updateError) {
            console.error("❌ Error updating wallet balance:", updateError);
            break;
          }
          
          // Update pending transaction to completed
          const { error: txError } = await supabaseClient
            .from("wallet_transactions")
            .update({ 
              status: "completed",
              balance_after: newBalance
            })
            .eq("stripe_payment_intent_id", session.id)
            .eq("user_id", userId);
          
          if (txError) {
            console.error("❌ Error updating transaction:", txError);
          }
          
          console.log(`✅ Wallet updated: $${currentBalance} → $${newBalance}`);
          break;
        }
        
        // Handle subscription checkout
        const userId = session.metadata?.supabase_user_id;
        const planType = session.metadata?.plan_type;

        if (!userId) {
          console.error("❌ No user ID in session metadata");
          break;
        }

        console.log(`✅ Checkout completed for user: ${userId}, plan: ${planType}`);

        // Check if this is a trial subscription
        const subscriptionId = session.subscription as string;
        let trialEndsAt: string | null = null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          if (subscription.trial_end) {
            trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
          }
        }

        // Update user to VIP tier
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_tier: "vip",
            subscription_status: trialEndsAt ? "trialing" : "active",
            trial_ends_at: trialEndsAt,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error updating profile:", updateError);
          throw updateError;
        }

        console.log(`✅ User ${userId} upgraded to VIP${trialEndsAt ? ' (trial)' : ''}`);
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) break;

        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        // Get user profile for email
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          // Calculate days remaining
          const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : new Date();
          const now = new Date();
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          console.log(`⏳ Trial ending in ${daysRemaining} days for user: ${userId}`);

          await supabaseClient.functions.invoke("send-notification-email", {
            body: {
              type: "trial_ending",
              recipientEmail: profile.email,
              userName: profile.full_name,
              data: {
                daysRemaining: daysRemaining,
              },
            },
          });
        }
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

        console.log(`📝 Subscription updated for user: ${userId}, status: ${subscription.status}`);

        // Determine tier and status
        let tier = "vip";
        let status = "active";
        let trialEndsAt: string | null = null;

        if (subscription.status === "trialing") {
          status = "trialing";
          if (subscription.trial_end) {
            trialEndsAt = new Date(subscription.trial_end * 1000).toISOString();
          }
        } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
          status = "cancelled";
          tier = "free";
        } else if (subscription.status === "past_due") {
          status = "expired";
        }

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_status: status,
            subscription_tier: tier,
            trial_ends_at: trialEndsAt,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error updating subscription:", updateError);
        }

        // If trial ended and no active subscription, send trial ended email
        if (subscription.status === "canceled" && subscription.canceled_at) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("email, full_name")
            .eq("id", userId)
            .single();

          if (profile?.email && subscription.trial_end && subscription.trial_end * 1000 > Date.now() - 86400000) {
            // Trial ended recently (within 24 hours)
            await supabaseClient.functions.invoke("send-notification-email", {
              body: {
                type: "trial_ended",
                recipientEmail: profile.email,
                userName: profile.full_name,
                data: {},
              },
            });
          }
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

        // Get user profile for email
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        // Downgrade to free tier
        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "cancelled",
            trial_ends_at: null,
          })
          .eq("id", userId);

        if (updateError) {
          console.error("❌ Error downgrading user:", updateError);
        }

        // Pause all automations for this user
        const { error: automationError } = await supabaseClient
          .from("recipients")
          .update({ automation_enabled: false })
          .eq("user_id", userId);

        if (automationError) {
          console.error("❌ Error pausing automations:", automationError);
        }

        // Send cancellation email
        if (profile?.email) {
          await supabaseClient.functions.invoke("send-notification-email", {
            body: {
              type: "subscription_cancelled",
              recipientEmail: profile.email,
              userName: profile.full_name,
              data: {},
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || customer.deleted) break;

        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        console.log(`❌ Payment failed for user: ${userId}`);

        // Get user profile for email
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("email, full_name")
          .eq("id", userId)
          .single();

        if (profile?.email) {
          await supabaseClient.functions.invoke("send-notification-email", {
            body: {
              type: "auto_reload_failed",
              recipientEmail: profile.email,
              userName: profile.full_name,
              data: {
                error: "Your subscription payment failed. Please update your payment method.",
              },
            },
          });
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
