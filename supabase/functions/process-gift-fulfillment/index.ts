
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎁 Process-gift-fulfillment: Function started');
    
    // Create Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(JSON.stringify({ 
        error: "Missing scheduledGiftId",
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`🎁 Process-gift-fulfillment: Processing gift fulfillment for: ${scheduledGiftId}`);

    // Verify the gift belongs to the authenticated user
    const { data: giftCheck } = await supabaseClient
      .from('scheduled_gifts')
      .select('user_id')
      .eq('id', scheduledGiftId)
      .single();

    if (!giftCheck || giftCheck.user_id !== user.id) {
      console.error('Gift verification failed: gift does not belong to user');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize input
    const sanitizedGiftId = scheduledGiftId.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    // Only allow test mode in development environments
    const isDevelopment = Deno.env.get("DENO_DEPLOYMENT_ID") === undefined;
    const isTestGift = isDevelopment && (sanitizedGiftId.includes('test') || sanitizedGiftId.length < 25);
    
    if (isTestGift) {
      console.log('🧪 Process-gift-fulfillment: Test mode detected, using mock data');
      
      // For test mode, create mock gift data and call shopify-order in test mode
      const testRecipientAddress = {
        first_name: 'Test',
        last_name: 'Recipient',
        address1: '123 Test Street',
        city: 'Test City',
        province: 'CA',
        country: 'US',
        zip: '12345',
        phone: '555-123-4567',
      };

      console.log('🎁 Process-gift-fulfillment: Calling shopify-order in test mode...');
      
      // Use Supabase function invocation instead of direct HTTP call
      const orderResult = await supabaseService.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId,
          recipientAddress: testRecipientAddress,
          testMode: true
        }
      });

      console.log('🎁 Process-gift-fulfillment: Shopify order test result:', orderResult);

      if (orderResult.error) {
        console.error('🎁 Process-gift-fulfillment: Shopify order test failed:', orderResult.error);
        return new Response(JSON.stringify({
          success: false,
          error: `Test order creation failed: ${orderResult.error}`,
          testMode: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      if (!orderResult.data || !orderResult.data.success) {
        console.error('🎁 Process-gift-fulfillment: Shopify order test not successful:', orderResult.data?.error);
        return new Response(JSON.stringify({
          success: false,
          error: `Test order creation failed: ${orderResult.data?.error || 'Unknown error'}`,
          testMode: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      console.log('🎁 Process-gift-fulfillment: Test completed successfully');

      return new Response(JSON.stringify({
        success: true,
        message: "Test gift fulfillment processed successfully",
        testMode: true,
        orderDetails: orderResult.data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Production mode - get gift and recipient details
    console.log('🎁 Process-gift-fulfillment: Querying database for gift data...');

    // First get the gift data
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .select('*')
      .eq('id', scheduledGiftId)
      .eq('payment_status', 'paid')
      .single();

    console.log('🎁 Process-gift-fulfillment: Gift query result:', { 
      found: !!giftData, 
      id: giftData?.id,
      payment_status: giftData?.payment_status,
      recipient_id: giftData?.recipient_id,
      error: giftError 
    });

    if (giftError || !giftData) {
      console.error('🎁 Process-gift-fulfillment: Gift query error:', giftError);
      return new Response(JSON.stringify({ 
        error: "Gift not found or payment not confirmed",
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Then get the recipient data separately to avoid relationship issues
    const { data: recipientData, error: recipientError } = await supabaseService
      .from('recipients')
      .select('name, email, phone, street, city, state, zip_code, country, interests')
      .eq('id', giftData.recipient_id)
      .single();

    console.log('🎁 Process-gift-fulfillment: Recipient query result:', { 
      found: !!recipientData,
      name: recipientData?.name,
      hasAddress: !!(recipientData?.street && recipientData?.city),
      error: recipientError 
    });

    if (recipientError || !recipientData) {
      console.error('🎁 Process-gift-fulfillment: Recipient query error:', recipientError);
      return new Response(JSON.stringify({ 
        error: "Recipient not found",
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Combine the data (simulate the original structure)
    giftData.recipients = recipientData;

    console.log(`🎁 Process-gift-fulfillment: Combined gift data:`, {
      id: giftData.id,
      recipient: giftData.recipients?.name,
      paymentStatus: giftData.payment_status,
      hasAddress: !!(giftData.recipients?.street && giftData.recipients?.city)
    });

    // Prepare recipient address from stored data
    const recipient = giftData.recipients;
    console.log('🎁 Process-gift-fulfillment: Recipient data for address:', {
      name: recipient?.name,
      street: recipient?.street,
      city: recipient?.city,
      state: recipient?.state,
      zip: recipient?.zip_code
    });

    if (!recipient || !recipient.street) {
      console.error('🎁 Process-gift-fulfillment: Missing recipient address:', recipient);
      return new Response(JSON.stringify({ 
        error: "Recipient address not found - please ensure the recipient has a complete address",
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`🎁 Process-gift-fulfillment: Recipient address validated:`, {
      name: recipient.name,
      street: recipient.street,
      city: recipient.city,
      state: recipient.state,
      zip: recipient.zip_code
    });

    // Create Shopify order using direct HTTP call
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

    console.log(`🎁 Process-gift-fulfillment: Calling shopify-order via Supabase client`);

    // Use Supabase function invocation instead of direct HTTP call  
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

    console.log(`🎁 Process-gift-fulfillment: Shopify order result:`, orderResult);

    if (orderResult.error) {
      console.error('🎁 Process-gift-fulfillment: Shopify order function error:', orderResult.error);
      return new Response(JSON.stringify({ 
        error: `Order creation failed: ${orderResult.error}`,
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!orderResult.data || !orderResult.data.success) {
      console.error('🎁 Process-gift-fulfillment: Shopify order creation failed:', orderResult.data?.error);
      return new Response(JSON.stringify({ 
        error: `Order creation failed: ${orderResult.data?.error || 'Unknown error'}`,
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
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
    console.error('🎁 Process-gift-fulfillment: Error message:', error.message);
    console.error('🎁 Process-gift-fulfillment: Error stack:', error.stack);
    
    // Return generic error message (detailed errors are in server logs)
    return new Response(JSON.stringify({ 
      error: "Failed to process gift fulfillment. Please contact support.",
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
