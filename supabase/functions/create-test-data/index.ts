
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Create-test-data: Function started');
    
    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("❌ Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🧪 Authenticated user: ${user.id}`);
    
    // Use service role to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    if (!supabaseService) {
      throw new Error("Failed to initialize Supabase client");
    }

    const requestBody = await req.json();
    console.log('🧪 Create-test-data: Request body:', requestBody);

    const { testGiftId, testUserId, testRecipientId, recipient, gift } = requestBody;

    if (!testGiftId || !testUserId || !testRecipientId || !recipient || !gift) {
      console.log('🧪 Create-test-data: Missing required parameters');
      return new Response(JSON.stringify({
        error: "Missing required test data parameters",
        success: false,
        details: { testGiftId, testUserId, testRecipientId, hasRecipient: !!recipient, hasGift: !!gift }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // First, create a test profile if it doesn't exist (ignore errors if it already exists)
    console.log('👤 Creating/updating test profile...');
    try {
      const { error: profileError } = await supabaseService
        .from('profiles')
        .upsert({
          id: testUserId,
          email: 'test@unwrapt.com',
          full_name: 'Test User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError && !profileError.message.includes('violates foreign key constraint')) {
        console.log('⚠️ Profile creation warning (may be OK):', profileError);
      } else {
        console.log('✅ Test profile created/updated');
      }
    } catch (profileErr) {
      console.log('⚠️ Profile creation error (continuing anyway):', profileErr);
    }

    console.log('👤 Creating test recipient...');
    const { data: recipientData, error: recipientError } = await supabaseService
      .from('recipients')
      .insert({
        id: testRecipientId,
        user_id: testUserId,
        name: recipient.name || 'Test Recipient',
        email: recipient.email || 'test@example.com',
        street: recipient.street || '123 Test St',
        city: recipient.city || 'Test City',
        state: recipient.state || 'CA',
        zip_code: recipient.zip_code || '12345',
        country: recipient.country || 'US',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recipientError) {
      console.error('❌ Failed to create test recipient:', recipientError);
      return new Response(JSON.stringify({
        error: `Failed to create test recipient: ${recipientError.message}`,
        success: false,
        details: recipientError
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('✅ Test recipient created:', recipientData);

    console.log('🎁 Creating test scheduled gift...');
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .insert({
        id: testGiftId,
        user_id: testUserId,
        occasion: gift.occasion || 'Test Birthday',
        occasion_date: gift.occasion_date || '2024-12-25',
        recipient_id: testRecipientId,
        payment_status: gift.payment_status || 'paid',
        status: gift.status || 'scheduled',
        gift_type: gift.gift_type || 'Test Gift',
        price_range: gift.price_range || '$25-50',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (giftError) {
      console.error('❌ Failed to create test gift:', giftError);
      
      // Clean up recipient if gift creation failed
      try {
        await supabaseService
          .from('recipients')
          .delete()
          .eq('id', testRecipientId);
        console.log('🧹 Cleaned up test recipient after gift creation failure');
      } catch (cleanupError) {
        console.log('⚠️ Failed to cleanup recipient:', cleanupError);
      }
      
      return new Response(JSON.stringify({
        error: `Failed to create test gift: ${giftError.message}`,
        success: false,
        details: giftError
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log('✅ Test gift created:', giftData);

    return new Response(JSON.stringify({
      success: true,
      message: "Test data created successfully",
      recipient: recipientData,
      gift: giftData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error creating test data:', error);
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
