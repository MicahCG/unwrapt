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
    console.log('💰 Add-test-wallet-balance: Function started');

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

    console.log(`💰 Authenticated user: ${user.id}`);

    // Use service role to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { amount } = await req.json();

    if (!amount || typeof amount !== 'number' || amount < 0) {
      return new Response(JSON.stringify({
        error: "Invalid amount",
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`💰 Adding test balance: $${amount}`);

    // Get current balance
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('gift_wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to get profile: ${profileError.message}`);
    }

    const currentBalance = profile?.gift_wallet_balance || 0;
    const newBalance = currentBalance + amount;

    // Update wallet balance
    const { error: updateError } = await supabaseService
      .from('profiles')
      .update({
        gift_wallet_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    // Create transaction record
    const { error: transactionError } = await supabaseService
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        balance_after: newBalance,
        transaction_type: 'deposit',
        status: 'completed',
        description: '🧪 TEST FUNDS - Development only',
        stripe_payment_intent_id: `test_${Date.now()}`,
        created_at: new Date().toISOString()
      });

    if (transactionError) {
      console.error('⚠️ Failed to create transaction record:', transactionError);
    }

    console.log(`✅ Test balance added. New balance: $${newBalance}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Added $${amount} test funds`,
      previousBalance: currentBalance,
      newBalance: newBalance
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error adding test wallet balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
