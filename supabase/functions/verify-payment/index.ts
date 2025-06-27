
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

    console.log(`💳 Verifying payment for session: ${sessionId}`);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`💳 Payment status: ${session.payment_status}, Amount: ${session.amount_total}`);
    
    if (session.payment_status === "paid") {
      // Update payment and gift status using service role key
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      const scheduledGiftId = session.metadata?.scheduled_gift_id;
      console.log(`🎁 Processing gift fulfillment for: ${scheduledGiftId}`);
      
      if (scheduledGiftId) {
        // Update payment status
        const { error: paymentError } = await supabaseService
          .from("payments")
          .update({ 
            status: "paid",
            stripe_payment_intent_id: session.payment_intent,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_session_id", sessionId);

        if (paymentError) {
          console.error('❌ Error updating payment status:', paymentError);
        } else {
          console.log('✅ Payment status updated successfully');
        }

        // Update scheduled gift status
        const { error: giftError } = await supabaseService
          .from("scheduled_gifts")
          .update({ 
            payment_status: "paid",
            payment_amount: session.amount_total,
            updated_at: new Date().toISOString()
          })
          .eq("id", scheduledGiftId);

        if (giftError) {
          console.error('❌ Error updating gift status:', giftError);
        } else {
          console.log('✅ Gift payment status updated successfully');
        }

        // Get gift and recipient details for email
        const { data: giftData } = await supabaseService
          .from("scheduled_gifts")
          .select(`
            *,
            recipient:recipients(name),
            user:profiles(email, full_name)
          `)
          .eq("id", scheduledGiftId)
          .single();

        // Send payment confirmation email
        if (giftData?.user?.email) {
          try {
            await supabaseService.functions.invoke('send-notification-email', {
              body: {
                type: 'gift_scheduled',
                userEmail: giftData.user.email,
                userName: giftData.user.full_name || giftData.user.email.split('@')[0],
                recipientName: giftData.recipient?.name || 'Unknown',
                giftDetails: {
                  occasion: giftData.occasion,
                  occasionDate: giftData.occasion_date,
                  giftType: giftData.gift_type,
                  priceRange: giftData.price_range
                }
              }
            });
            console.log('📧 Payment confirmation email sent successfully');
          } catch (emailError) {
            console.error('❌ Failed to send payment confirmation email:', emailError);
            // Don't fail the payment verification if email fails
          }
        }

        // Trigger gift fulfillment if not in onboarding
        if (scheduledGiftId !== 'onboarding-temp-id') {
          console.log('🚀 Triggering Shopify order creation...');
          try {
            const fulfillmentResponse = await fetch(`${req.headers.get("origin")}/functions/process-gift-fulfillment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ scheduledGiftId })
            });

            if (!fulfillmentResponse.ok) {
              const errorText = await fulfillmentResponse.text();
              console.error('❌ Fulfillment response error:', errorText);
              throw new Error(`Fulfillment failed: ${errorText}`);
            }

            const fulfillmentResult = await fulfillmentResponse.json();
            console.log('✅ Fulfillment result:', fulfillmentResult);
            
            if (!fulfillmentResult.success) {
              console.error('❌ Fulfillment failed:', fulfillmentResult.error);
            }
          } catch (fulfillmentError) {
            console.error('❌ Error triggering fulfillment:', fulfillmentError);
            // Don't fail the payment verification if fulfillment fails, but log it
          }
        } else {
          console.log('🧪 Skipping fulfillment for onboarding gift');
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
    console.error("❌ Error verifying payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
