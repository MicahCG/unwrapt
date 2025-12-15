import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("💰 Starting wallet-add-funds function");

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication failed: ${userError.message}`);

    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    console.log(`💰 Processing wallet deposit for user: ${user.email}`);

    // Parse request body
    const body = await req.json();
    const { amount } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount < 10 || amount > 1000) {
      throw new Error("Invalid amount. Must be between $10 and $1,000");
    }

    console.log(`💰 Amount to add: $${amount}`);

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
      throw new Error("Stripe secret key not configured");
    }

    // Check if customer exists
    let customerId;
    try {
      const customersResponse = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email)}&limit=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (!customersResponse.ok) {
        throw new Error(`Stripe API error: ${customersResponse.status}`);
      }

      const customersData = await customersResponse.json();
      if (customersData.data && customersData.data.length > 0) {
        customerId = customersData.data[0].id;
        console.log(`💰 Found existing Stripe customer: ${customerId}`);
      }
    } catch (error) {
      console.error('Error checking for existing customer:', error);
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || 
                  req.headers.get("referer")?.replace(/\/[^\/]*$/, '') || 
                  'https://app.unwrapt.io';
    const cleanOrigin = origin.replace(/\/$/, '');

    console.log(`💰 Creating Stripe session for $${amount}`);

    // Create checkout session
    const sessionData = new URLSearchParams({
      'mode': 'payment',
      'success_url': `${cleanOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${cleanOrigin}/`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'Gift Wallet Funds',
      'line_items[0][price_data][product_data][description]': 'Add funds to your Unwrapt gift wallet',
      'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
      'line_items[0][quantity]': '1',
      'metadata[user_id]': user.id,
      'metadata[transaction_type]': 'wallet_deposit',
      'metadata[amount]': amount.toString(),
    });

    if (customerId) {
      sessionData.append('customer', customerId);
    } else {
      sessionData.append('customer_email', user.email);
    }

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionData.toString(),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text();
      console.error('💰 Stripe session creation failed:', errorData);
      throw new Error(`Failed to create Stripe session: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    console.log(`💰 Stripe session created successfully: ${session.id}`);

    // Create pending wallet transaction record
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabaseService
      .from("profiles")
      .select("gift_wallet_balance")
      .eq("id", user.id)
      .single();

    const currentBalance = profile?.gift_wallet_balance || 0;

    const { error: insertError } = await supabaseService
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        amount: amount,
        balance_after: currentBalance + amount,
        transaction_type: "deposit",
        status: "pending",
        stripe_payment_intent_id: session.id,
      });

    if (insertError) {
      console.error(`💰 Error creating transaction record:`, insertError);
    } else {
      console.log(`💰 Created pending transaction record`);
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("💰 Error in wallet-add-funds:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process wallet deposit";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
