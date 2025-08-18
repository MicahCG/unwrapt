
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input sanitization utilities
const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/script/gi, '')
    .trim();
};

// Rate limiting for payment attempts
const rateLimitStore = new Map<string, { count: number; lastAttempt: number }>();
const PAYMENT_RATE_LIMIT = { maxRequests: 3, windowMs: 600000 }; // 3 attempts per 10 minutes

const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId) || { count: 0, lastAttempt: 0 };
  
  // Reset if window has passed
  if (now - userLimit.lastAttempt > PAYMENT_RATE_LIMIT.windowMs) {
    userLimit.count = 0;
  }
  
  if (userLimit.count >= PAYMENT_RATE_LIMIT.maxRequests) {
    return true;
  }
  
  userLimit.count++;
  userLimit.lastAttempt = now;
  rateLimitStore.set(userId, userLimit);
  return false;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting create-gift-payment function");
    
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No Authorization header found");
      throw new Error("No authorization header provided");
    }
    
    const token = authHeader.replace("Bearer ", "");
    console.log("🔐 Attempting to get user with token");
    
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      console.error("❌ Error getting user:", userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      console.error("❌ User not authenticated or email not available");
      throw new Error("User not authenticated or email not available");
    }

    // Check rate limiting
    if (isRateLimited(user.id)) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please try again later.",
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    console.log(`💳 Creating payment for user: ${user.email}`);

    // Parse and sanitize request body
    console.log("📝 Parsing request body");
    const body = await req.json();
    console.log("📝 Request body parsed successfully:", Object.keys(body));
    console.log("📝 Full body content:", JSON.stringify(body, null, 2));
    
    const { 
      scheduledGiftId, 
      giftDetails, 
      shippingAddress,
      productPrice,
      productImage,
      variantId 
    } = body;

    // Input validation and sanitization
    if (!scheduledGiftId || typeof scheduledGiftId !== 'string') {
      throw new Error("Invalid scheduled gift ID");
    }
    
    if (!productPrice || typeof productPrice !== 'number' || productPrice <= 0) {
      throw new Error("Invalid product price");
    }
    
    if (!giftDetails || typeof giftDetails !== 'object') {
      throw new Error("Invalid gift details");
    }

    // Sanitize string inputs with fallbacks
    const sanitizedGiftType = sanitizeInput(giftDetails?.giftType || 'Gift');
    const sanitizedOccasion = sanitizeInput(giftDetails?.occasion || 'Special Occasion');
    const sanitizedRecipientName = sanitizeInput(giftDetails?.recipientName || 'Recipient');
    
    console.log(`💳 Payment request details:`, {
      scheduledGiftId,
      productPrice,
      hasShippingAddress: !!shippingAddress,
      hasProductImage: !!productImage,
      variantId,
      giftType: sanitizedGiftType,
      occasion: sanitizedOccasion,
      recipientName: sanitizedRecipientName
    });

    // Initialize Stripe
    console.log("🔍 Checking for Stripe secret key...");
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeSecretKey || stripeSecretKey.trim() === '') {
      console.error("❌ Stripe secret key is empty");
      throw new Error("Stripe secret key not configured");
    }
    
    // Validate Stripe key format
    if (!stripeSecretKey.startsWith('sk_')) {
      console.error("❌ Invalid Stripe secret key format");
      throw new Error("Invalid Stripe secret key format");
    }
    
    console.log("✅ Stripe secret key validated, starts with:", stripeSecretKey.substring(0, 7));

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
      'line_items[0][price_data][product_data][name]': `Gift: ${sanitizedGiftType} for ${sanitizedRecipientName}`,
      'line_items[0][price_data][product_data][description]': `${sanitizedOccasion} gift`,
      'line_items[0][price_data][unit_amount]': Math.round(productPrice * 100).toString(),
      'line_items[0][quantity]': '1',
      'metadata[scheduled_gift_id]': scheduledGiftId,
      'metadata[user_id]': user.id,
      'metadata[gift_type]': sanitizedGiftType,
      'metadata[occasion]': sanitizedOccasion,
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
    console.error("💳 Error stack:", error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
