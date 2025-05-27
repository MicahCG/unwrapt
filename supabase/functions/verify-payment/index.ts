
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === "paid") {
      // Update payment and gift status using service role key
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const scheduledGiftId = session.metadata?.scheduled_gift_id;
      
      if (scheduledGiftId) {
        // Update payment status
        await supabaseService
          .from("payments")
          .update({ 
            status: "paid",
            stripe_payment_intent_id: session.payment_intent,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_session_id", sessionId);

        // Update scheduled gift status
        await supabaseService
          .from("scheduled_gifts")
          .update({ 
            payment_status: "paid",
            payment_amount: session.amount_total,
            updated_at: new Date().toISOString()
          })
          .eq("id", scheduledGiftId);

        // Trigger gift fulfillment if not in onboarding
        if (scheduledGiftId !== 'onboarding-temp-id') {
          try {
            const fulfillmentResponse = await fetch(`${req.headers.get("origin")}/functions/process-gift-fulfillment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ scheduledGiftId })
            });

            const fulfillmentResult = await fulfillmentResponse.json();
            console.log('Fulfillment result:', fulfillmentResult);
          } catch (fulfillmentError) {
            console.error('Error triggering fulfillment:', fulfillmentError);
            // Don't fail the payment verification if fulfillment fails
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      paymentStatus: session.payment_status,
      scheduledGiftId: session.metadata?.scheduled_gift_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
