
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`💳 Found existing Stripe customer: ${customerId}`);
    } else {
      console.log(`💳 No existing Stripe customer found for ${user.email}`);
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

    // Get the origin URL for redirect URLs
    const origin = req.headers.get("origin");
    console.log(`💳 Request origin: ${origin}`);

    // Create a one-time payment session with gift image and shipping
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `Gift: ${giftDetails.giftType} for ${giftDetails.recipientName}`,
              description: `${giftDetails.occasion} gift`,
              images: productImage ? [productImage] : undefined,
            },
            unit_amount: Math.round(productPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Make sure the success URL includes the session_id parameter
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      shipping_address_collection: shippingAddress ? undefined : {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      shipping_options: shippingAddress ? [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // Free shipping
              currency: 'usd',
            },
            display_name: 'Standard Delivery',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 3,
              },
              maximum: {
                unit: 'business_day',
                value: 7,
              },
            },
          },
        },
      ] : undefined,
      metadata: {
        scheduled_gift_id: scheduledGiftId,
        user_id: user.id,
        gift_type: giftDetails.giftType,
        occasion: giftDetails.occasion,
        variant_id: variantId || '', // Store variant ID for Shopify order creation
      },
    });

    console.log(`💳 Created Stripe checkout session: ${session.id}`);
    console.log(`💳 Success URL configured: ${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`);

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
