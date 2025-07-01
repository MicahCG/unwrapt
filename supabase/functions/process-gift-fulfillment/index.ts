
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

    console.log(`🎁 Processing gift fulfillment for: ${scheduledGiftId}`);

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
      console.error('❌ Gift query error:', giftError);
      throw new Error("Gift not found or payment not confirmed");
    }

    console.log(`✅ Found gift data:`, {
      id: giftData.id,
      recipient: giftData.recipients?.name,
      paymentStatus: giftData.payment_status
    });

    // Prepare recipient address from stored data
    const recipient = giftData.recipients;
    if (!recipient || !recipient.street) {
      console.error('❌ Missing recipient address:', recipient);
      throw new Error("Recipient address not found");
    }

    console.log(`📮 Recipient address:`, {
      name: recipient.name,
      street: recipient.street,
      city: recipient.city,
      state: recipient.state,
      zip: recipient.zip_code
    });

    // Create Shopify order
    console.log('🛒 Creating Shopify order...');
    
    // Get the current origin or use a default
    const originUrl = req.headers.get("origin") || 'https://preview--unwrapt.lovable.app';
    const shopifyOrderUrl = `${originUrl}/functions/shopify-order`;
    
    console.log(`📞 Calling Shopify order function at: ${shopifyOrderUrl}`);
    
    const orderResponse = await fetch(shopifyOrderUrl, {
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

    console.log(`📞 Shopify order response status: ${orderResponse.status}`);

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ Shopify order response error:', errorText);
      throw new Error(`Order creation failed: ${errorText}`);
    }

    const orderResult = await orderResponse.json();
    console.log('🛒 Shopify order result:', orderResult);

    if (!orderResult.success) {
      console.error('❌ Shopify order creation failed:', orderResult.error);
      throw new Error(`Order creation failed: ${orderResult.error}`);
    }

    // Update the gift status to indicate it's been sent to Shopify
    const { error: updateError } = await supabaseService
      .from('scheduled_gifts')
      .update({
        status: 'ordered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduledGiftId);

    if (updateError) {
      console.error('❌ Error updating gift status:', updateError);
    } else {
      console.log('✅ Gift status updated to ordered');
    }

    console.log(`✅ Gift fulfillment processed successfully for ${scheduledGiftId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Gift fulfillment processed successfully",
      orderDetails: orderResult
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error processing gift fulfillment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
