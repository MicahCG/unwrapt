
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
    console.log('🧪 Create-test-data: Function started');
    
    // Use service role to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json();
    console.log('🧪 Create-test-data: Request body:', requestBody);

    const { testGiftId, testUserId, testRecipientId, recipient, gift } = requestBody;

    if (!testGiftId || !testUserId || !testRecipientId || !recipient || !gift) {
      throw new Error("Missing required test data parameters");
    }

    console.log('👤 Creating test recipient...');
    const { data: recipientData, error: recipientError } = await supabaseService
      .from('recipients')
      .insert({
        id: testRecipientId,
        user_id: testUserId,
        name: recipient.name,
        email: recipient.email,
        street: recipient.street,
        city: recipient.city,
        state: recipient.state,
        zip_code: recipient.zip_code,
        country: recipient.country
      })
      .select()
      .single();

    if (recipientError) {
      console.error('❌ Failed to create test recipient:', recipientError);
      throw new Error(`Failed to create test recipient: ${recipientError.message}`);
    }

    console.log('✅ Test recipient created:', recipientData);

    console.log('🎁 Creating test scheduled gift...');
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .insert({
        id: testGiftId,
        user_id: testUserId,
        occasion: gift.occasion,
        occasion_date: gift.occasion_date,
        recipient_id: testRecipientId,
        payment_status: gift.payment_status,
        status: gift.status,
        gift_type: gift.gift_type,
        price_range: gift.price_range
      })
      .select()
      .single();

    if (giftError) {
      console.error('❌ Failed to create test gift:', giftError);
      throw new Error(`Failed to create test gift: ${giftError.message}`);
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
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
