
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎁 Process-gift-fulfillment: Function started');
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log('🎁 Process-gift-fulfillment: Supabase client created');

    const requestBody = await req.json();
    console.log('🎁 Process-gift-fulfillment: Request body:', requestBody);

    const { scheduledGiftId } = requestBody;

    if (!scheduledGiftId) {
      console.error('🎁 Process-gift-fulfillment: Missing scheduledGiftId');
      throw new Error("Missing scheduledGiftId");
    }

    console.log(`🎁 Process-gift-fulfillment: Processing gift fulfillment for: ${scheduledGiftId}`);

    // Get gift and recipient details
    console.log('🎁 Process-gift-fulfillment: Querying database for gift data...');
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .select(`
        *,
        recipients (name, email, phone, street, city, state, zip_code, country)
      `)
      .eq('id', scheduledGiftId)
      .eq('payment_status', 'paid')
      .single();

    console.log('🎁 Process-gift-fulfillment: Database query result:', { giftData, giftError });

    if (giftError || !giftData) {
      console.error('🎁 Process-gift-fulfillment: Gift query error:', giftError);
      throw new Error("Gift not found or payment not confirmed");
    }

    console.log(`🎁 Process-gift-fulfillment: Found gift data:`, {
      id: giftData.id,
      recipient: giftData.recipients?.name,
      paymentStatus: giftData.payment_status
    });

    // Prepare recipient address from stored data
    const recipient = giftData.recipients;
    console.log('🎁 Process-gift-fulfillment: Recipient data:', recipient);

    if (!recipient || !recipient.street) {
      console.error('🎁 Process-gift-fulfillment: Missing recipient address:', recipient);
      throw new Error("Recipient address not found");
    }

    console.log(`🎁 Process-gift-fulfillment: Recipient address validated:`, {
      name: recipient.name,
      street: recipient.street,
      city: recipient.city,
      state: recipient.state,
      zip: recipient.zip_code
    });

    // Create Shopify order using Supabase function invocation
    console.log('🎁 Process-gift-fulfillment: Preparing to call shopify-order function...');
    
    const recipientAddress = {
      first_name: recipient.name.split(' ')[0] || 'Gift',
      last_name: recipient.name.split(' ').slice(1).join(' ') || 'Recipient',
      address1: recipient.street || '',
      city: recipient.city || '',
      province: recipient.state || '',
      country: recipient.country || 'US',
      zip: recipient.zip_code || '',
      phone: recipient.phone || '',
    };

    console.log('🎁 Process-gift-fulfillment: Recipient address prepared:', recipientAddress);

    console.log('🎁 Process-gift-fulfillment: Calling shopify-order function...');
    
    // Add timeout for the shopify-order call
    const orderResult = await Promise.race([
      supabaseService.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId,
          recipientAddress
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Shopify order creation timeout after 25 seconds')), 25000)
      )
    ]);

    console.log('🎁 Process-gift-fulfillment: Shopify order result:', orderResult);

    if (orderResult.error) {
      console.error('🎁 Process-gift-fulfillment: Shopify order creation failed:', orderResult.error);
      throw new Error(`Order creation failed: ${orderResult.error.message || orderResult.error}`);
    }

    if (!orderResult.data?.success) {
      console.error('🎁 Process-gift-fulfillment: Shopify order creation failed:', orderResult.data?.error);
      throw new Error(`Order creation failed: ${orderResult.data?.error || 'Unknown error'}`);
    }

    console.log('🎁 Process-gift-fulfillment: Shopify order created successfully');

    // Update the gift status to indicate it's been sent to Shopify
    console.log('🎁 Process-gift-fulfillment: Updating gift status...');
    const { error: updateError } = await supabaseService
      .from('scheduled_gifts')
      .update({
        status: 'ordered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduledGiftId);

    if (updateError) {
      console.error('🎁 Process-gift-fulfillment: Error updating gift status:', updateError);
    } else {
      console.log('🎁 Process-gift-fulfillment: Gift status updated to ordered');
    }

    console.log(`🎁 Process-gift-fulfillment: Gift fulfillment processed successfully for ${scheduledGiftId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Gift fulfillment processed successfully",
      orderDetails: orderResult.data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('🎁 Process-gift-fulfillment: Error processing gift fulfillment:', error);
    console.error('🎁 Process-gift-fulfillment: Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred',
      success: false,
      details: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
