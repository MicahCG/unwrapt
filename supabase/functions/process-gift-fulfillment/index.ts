
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { scheduledGiftId } = await req.json();

    if (!scheduledGiftId) {
      throw new Error("Missing scheduledGiftId");
    }

    // Get gift and recipient details
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .select(`
        *,
        recipients (name, email, phone, street, city, state, zip_code, country)
      `)
      .eq('id', scheduledGiftId)
      .eq('payment_status', 'paid')
      .single();

    if (giftError || !giftData) {
      throw new Error("Gift not found or payment not confirmed");
    }

    // Prepare recipient address from stored data
    const recipient = giftData.recipients;
    if (!recipient || !recipient.street) {
      throw new Error("Recipient address not found");
    }

    // Create Shopify order
    const orderResponse = await fetch(`${req.headers.get("origin")}/functions/shopify-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        scheduledGiftId,
        recipientAddress: {
          first_name: recipient.name.split(' ')[0] || 'Gift',
          last_name: recipient.name.split(' ').slice(1).join(' ') || 'Recipient',
          address1: recipient.street || '',
          city: recipient.city || '',
          province: recipient.state || '',
          country: recipient.country || 'US',
          zip: recipient.zip_code || '',
          phone: recipient.phone || '',
        }
      })
    });

    const orderResult = await orderResponse.json();

    if (!orderResult.success) {
      throw new Error(`Order creation failed: ${orderResult.error}`);
    }

    console.log(`Gift fulfillment processed successfully for ${scheduledGiftId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Gift fulfillment processed successfully",
      orderDetails: orderResult
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing gift fulfillment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
