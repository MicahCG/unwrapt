
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log(`💳 Creating payment for user: ${user.email}`);

    // Parse request body
    const { 
      scheduledGiftId, 
      giftDetails, 
      shippingAddress,
      productPrice,
      productImage,
      variantId 
    } = await req.json();
    
    console.log(`💳 Payment request details:`, {
      scheduledGiftId,
      productPrice,
      hasShippingAddress: !!shippingAddress,
      hasProductImage: !!productImage,
      variantId
    });
    
    if (!scheduledGiftId || !productPrice) {
      throw new Error("Missing required fields: scheduledGiftId and productPrice");
    }

    // Initialize Stripe using direct API calls instead of the library
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    // Check if a Stripe customer record exists for this user
    let customerId;
    try {
      const customersResponse = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email)}&limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!customersResponse.ok) {
        throw new Error(`Stripe API error: ${customersResponse.status}`);
      }

      const customersData = await customersResponse.json();
      if (customersData.data && customersData.data.length > 0) {
        customerId = customersData.data[0].id;
        console.log(`💳 Found existing Stripe customer: ${customerId}`);
      } else {
        console.log(`💳 No existing Stripe customer found for ${user.email}`);
      }
    } catch (error) {
      console.error('Error checking for existing customer:', error);
      // Continue without existing customer
    }

    // Prepare shipping address for Stripe if provided
    let shippingDetails = undefined;
    if (shippingAddress) {
      shippingDetails = {
        name: `${shippingAddress.first_name} ${shippingAddress.last_name}`.trim(),
        address: {
          line1: shippingAddress.address1,
          line2: shippingAddress.address2 || undefined,
          city: shippingAddress.city,
          state: shippingAddress.province,
          postal_code: shippingAddress.zip,
          country: shippingAddress.country === 'United States' ? 'US' : shippingAddress.country,
        },
      };
      console.log(`💳 Using provided shipping address for ${shippingDetails.name}`);
    }

    // Get the origin URL for redirect URLs with fallback and cleanup
    const origin = req.headers.get("origin") || 
                  req.headers.get("referer")?.replace(/\/[^\/]*$/, '') || 
                  'https://preview--unwrapt.lovable.app';
    
    // Ensure the origin doesn't end with a slash for consistent URL building
    const cleanOrigin = origin.replace(/\/$/, '');
    
    console.log(`💳 Request origin: ${origin} -> cleaned: ${cleanOrigin}`);

    // Create checkout session data
    const sessionData = new URLSearchParams({
      'mode': 'payment',
      'success_url': `${cleanOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': `${cleanOrigin}/`,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': `Gift: ${giftDetails.giftType} for ${giftDetails.recipientName}`,
      'line_items[0][price_data][product_data][description]': `${giftDetails.occasion} gift`,
      'line_items[0][price_data][unit_amount]': Math.round(productPrice * 100).toString(),
      'line_items[0][quantity]': '1',
      'metadata[scheduled_gift_id]': scheduledGiftId,
      'metadata[user_id]': user.id,
      'metadata[gift_type]': giftDetails.giftType,
      'metadata[occasion]': giftDetails.occasion,
      'metadata[variant_id]': variantId || '',
    });

    // Add customer information
    if (customerId) {
      sessionData.append('customer', customerId);
    } else {
      sessionData.append('customer_email', user.email);
    }

    // Add product image if provided
    if (productImage) {
      sessionData.append('line_items[0][price_data][product_data][images][0]', productImage);
    }

    // Add shipping configuration
    if (shippingAddress) {
      sessionData.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
      sessionData.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '0');
      sessionData.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
      sessionData.append('shipping_options[0][shipping_rate_data][display_name]', 'Standard Delivery');
      sessionData.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
      sessionData.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '3');
      sessionData.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
      sessionData.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '7');
    } else {
      sessionData.append('shipping_address_collection[allowed_countries][0]', 'US');
      sessionData.append('shipping_address_collection[allowed_countries][1]', 'CA');
      sessionData.append('shipping_address_collection[allowed_countries][2]', 'GB');
      sessionData.append('shipping_address_collection[allowed_countries][3]', 'AU');
    }

    // Create a one-time payment session
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
      console.error('Stripe session creation failed:', errorData);
      throw new Error(`Failed to create Stripe session: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();

    console.log(`💳 Created Stripe checkout session: ${session.id}`);
    console.log(`💳 Success URL configured: ${cleanOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`);

    // Create payment record in Supabase using service role key
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    
    const { error: insertError } = await supabaseService.from("payments").insert({
      user_id: user.id,
      scheduled_gift_id: scheduledGiftId,
      stripe_session_id: session.id,
      amount: Math.round(productPrice * 100),
      status: "pending",
    });

    if (insertError) {
      console.error(`💳 Error creating payment record:`, insertError);
      // Don't fail the payment creation for this, but log it
    } else {
      console.log(`💳 Created payment record in database`);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("💳 Error creating payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
