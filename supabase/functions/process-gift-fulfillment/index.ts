
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎁 Process-gift-fulfillment: Function started');
    
    const authHeader = req.headers.get('Authorization');
    const isServiceRoleCall = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'INVALID');
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let userId: string | null = null;

    // Check if this is an internal service call (from verify-payment or automation)
    if (isServiceRoleCall) {
      console.log('🎁 Process-gift-fulfillment: Service role call detected - internal request');
      // For service role calls, we trust the caller and skip user auth
      // The scheduledGiftId will be validated against the database
    } else {
      // For client calls, verify user authentication
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader! },
          },
        }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError || !user) {
        console.error('Authentication failed:', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized', success: false }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = user.id;
    }

    console.log('🎁 Process-gift-fulfillment: Supabase client created');

    const requestBody = await req.json();
    console.log('🎁 Process-gift-fulfillment: Request body:', requestBody);

    const { scheduledGiftId, manualTrigger } = requestBody;

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

    console.log(`🎁 Process-gift-fulfillment: Processing gift fulfillment for: ${scheduledGiftId} (manualTrigger: ${!!manualTrigger})`);
    // Verify the gift exists and get user_id + current status
    const { data: giftCheck, error: giftCheckError } = await supabaseService
      .from('scheduled_gifts')
      .select('user_id, status, goody_order_id')
      .eq('id', scheduledGiftId)
      .single();

    if (giftCheckError || !giftCheck) {
      console.error('Gift not found:', giftCheckError);
      return new Response(
        JSON.stringify({ error: 'Gift not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY CHECK: If the gift already has a Goody order, skip fulfillment
    if (giftCheck.status === 'ordered' || giftCheck.status === 'fulfilled' || giftCheck.status === 'delivered' || giftCheck.goody_order_id) {
      console.log(`🎁 Process-gift-fulfillment: Gift ${scheduledGiftId} already fulfilled (status: ${giftCheck.status}, goody_order_id: ${giftCheck.goody_order_id}). Skipping duplicate.`);
      return new Response(JSON.stringify({
        success: true,
        message: "Gift already fulfilled - skipping duplicate order",
        alreadyFulfilled: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // For client calls, verify ownership
    if (userId && giftCheck.user_id !== userId) {
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

      console.log('🎁 Process-gift-fulfillment: Calling goody-order in test mode...');

      // Use Supabase function invocation instead of direct HTTP call
      const orderResult = await supabaseService.functions.invoke('goody-order', {
        body: {
          scheduledGiftId,
          testMode: true
        }
      });

      console.log('🎁 Process-gift-fulfillment: Goody order test result:', orderResult);

    const typedTestOrderResult = orderResult as unknown as { error?: { message?: string }; data?: { success?: boolean; error?: string } };

    if (typedTestOrderResult.error) {
      console.error('🎁 Process-gift-fulfillment: Goody order test failed:', typedTestOrderResult.error);
      return new Response(JSON.stringify({
        success: false,
        error: `Test order creation failed: ${typedTestOrderResult.error}`,
        testMode: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!typedTestOrderResult.data || !typedTestOrderResult.data.success) {
      console.error('🎁 Process-gift-fulfillment: Shopify order test not successful:', typedTestOrderResult.data?.error);
      return new Response(JSON.stringify({
        success: false,
        error: `Test order creation failed: ${typedTestOrderResult.data?.error || 'Unknown error'}`,
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
        orderDetails: typedTestOrderResult.data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Production mode - get gift and recipient details
    console.log('🎁 Process-gift-fulfillment: Querying database for gift data...');

    // First get the gift data
    // When manually triggered (Order Now button), don't require payment_status = 'paid'
    // The wallet charge will happen as part of this flow
    let giftQuery = supabaseService
      .from('scheduled_gifts')
      .select('*')
      .eq('id', scheduledGiftId);
    
    if (!manualTrigger) {
      giftQuery = giftQuery.eq('payment_status', 'paid');
    }

    const { data: giftData, error: giftError } = await giftQuery.single();

    console.log('🎁 Process-gift-fulfillment: Gift query result:', { 
      found: !!giftData, 
      id: giftData?.id,
      payment_status: giftData?.payment_status,
      recipient_id: giftData?.recipient_id,
      manualTrigger: !!manualTrigger,
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

    // For manual triggers, handle wallet charging directly if not already paid
    if (manualTrigger && giftData.payment_status !== 'paid') {
      console.log('🎁 Process-gift-fulfillment: Manual trigger - charging wallet directly...');
      const chargeAmount = giftData.estimated_cost || 42;
      
      // Get current wallet balance
      const { data: profile, error: profileError } = await supabaseService
        .from('profiles')
        .select('gift_wallet_balance')
        .eq('id', giftData.user_id)
        .single();

      if (profileError || !profile) {
        console.error('🎁 Process-gift-fulfillment: Could not fetch user profile:', profileError);
        return new Response(JSON.stringify({ 
          error: "Could not fetch wallet balance.",
          success: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const currentBalance = profile.gift_wallet_balance || 0;
      if (currentBalance < chargeAmount) {
        console.error(`🎁 Process-gift-fulfillment: Insufficient balance: $${currentBalance} < $${chargeAmount}`);
        return new Response(JSON.stringify({ 
          error: `Insufficient wallet balance. You have $${currentBalance.toFixed(2)} but need $${chargeAmount.toFixed(2)}.`,
          success: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const newBalance = currentBalance - chargeAmount;

      // Create wallet transaction record
      const { error: txnError } = await supabaseService
        .from('wallet_transactions')
        .insert({
          user_id: giftData.user_id,
          amount: -chargeAmount,
          balance_after: newBalance,
          transaction_type: 'charge',
          status: 'completed',
          scheduled_gift_id: scheduledGiftId,
        });

      if (txnError) {
        console.error('🎁 Process-gift-fulfillment: Wallet transaction insert failed:', txnError);
        return new Response(JSON.stringify({ 
          error: "Failed to record wallet transaction.",
          success: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      // Deduct from wallet balance
      const { error: balanceError } = await supabaseService
        .from('profiles')
        .update({ gift_wallet_balance: newBalance })
        .eq('id', giftData.user_id);

      if (balanceError) {
        console.error('🎁 Process-gift-fulfillment: Balance update failed:', balanceError);
      }

      // Update gift payment status
      await supabaseService
        .from('scheduled_gifts')
        .update({ payment_status: 'paid', payment_amount: chargeAmount })
        .eq('id', scheduledGiftId);

      console.log(`🎁 Process-gift-fulfillment: Wallet charged $${chargeAmount}, new balance: $${newBalance}`);
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

    // goody-order fetches the recipient's address itself; we only needed the
    // check above to fail fast (before charging the wallet) if it's missing.
    console.log(`🎁 Process-gift-fulfillment: Calling goody-order via Supabase client`);

    const orderResult = await Promise.race([
      supabaseService.functions.invoke('goody-order', {
        body: { scheduledGiftId }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Goody order creation timeout after 25 seconds')), 25000)
      )
    ]);

    console.log(`🎁 Process-gift-fulfillment: Goody order result:`, orderResult);

    const typedOrderResult = orderResult as { error?: { message?: string }; data?: { success?: boolean; error?: string } };

    if (typedOrderResult.error) {
      console.error('🎁 Process-gift-fulfillment: Goody order function error:', typedOrderResult.error);
      return new Response(JSON.stringify({
        error: `Order creation failed: ${typedOrderResult.error}`,
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!typedOrderResult.data || !typedOrderResult.data.success) {
      console.error('🎁 Process-gift-fulfillment: Goody order creation failed:', typedOrderResult.data?.error);
      return new Response(JSON.stringify({
        error: `Order creation failed: ${typedOrderResult.data?.error || 'Unknown error'}`,
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // goody-order already writes status='ordered' and goody_order_id on
    // success, so there's nothing left to update here.
    console.log(`🎁 Process-gift-fulfillment: Gift fulfillment processed successfully for ${scheduledGiftId}`);

    return new Response(JSON.stringify({
      success: true,
      message: "Gift fulfillment processed successfully",
      orderDetails: typedOrderResult.data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('🎁 Process-gift-fulfillment: Error processing gift fulfillment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('🎁 Process-gift-fulfillment: Error message:', errorMessage);
    console.error('🎁 Process-gift-fulfillment: Error stack:', errorStack);
    
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
