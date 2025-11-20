import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ShopifyOrderRequest {
  scheduledGiftId: string;
  recipientAddress: {
    first_name: string;
    last_name: string;
    address1: string;
    city: string;
    province?: string;
    country: string;
    zip: string;
    phone?: string;
  };
  testMode?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { scheduledGiftId, recipientAddress, testMode = false }: ShopifyOrderRequest = await req.json();

    if (!scheduledGiftId) {
      throw new Error("Missing scheduledGiftId");
    }

    console.log(`🛒 Processing ${testMode ? 'TEST' : 'LIVE'} order for gift: ${scheduledGiftId}`);
    
    // Check environment variables
    const shopifyStoreUrl = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    const shopifyStorefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_API_TOKEN");
    
    console.log("🔍 Environment check:");
    console.log("SHOPIFY_STORE_URL:", !!shopifyStoreUrl);
    console.log("SHOPIFY_ADMIN_API_TOKEN:", !!shopifyToken);
    console.log("SHOPIFY_STOREFRONT_API_TOKEN:", !!shopifyStorefrontToken);
    
    if (!shopifyStoreUrl || !shopifyToken) {
      throw new Error("Missing required Shopify environment variables");
    }

    // Get or create gift data
    let giftData;
    if (testMode) {
      console.log('🧪 Test mode: Creating mock gift data...');
      giftData = {
        id: scheduledGiftId,
        user_id: 'test-user-id',
        occasion: 'Test Birthday',
        occasion_date: '2024-12-25',
        payment_status: 'paid',
        status: 'scheduled',
        gift_type: 'Test Gift',
        price_range: '$25-50',
        recipients: {
          name: 'Test Recipient',
          email: 'test@example.com',
          interests: ['coffee', 'chocolate'],
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip_code: '12345',
          country: 'US'
        }
      };
    } else {
      // Query gift and recipient data
      const { data: giftQueryData, error: giftError } = await supabaseService
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (name, email, phone, street, city, state, zip_code, country, interests)
        `)
        .eq('id', scheduledGiftId)
        .eq('payment_status', 'paid')
        .single();

      if (giftError || !giftQueryData) {
        console.error('❌ Gift query error:', giftError);
        throw new Error("Gift not found or payment not confirmed");
      }

      // Separately query profile data using user_id
      const { data: profileData } = await supabaseService
        .from('profiles')
        .select('full_name, email')
        .eq('id', giftQueryData.user_id)
        .single();

      giftData = {
        ...giftQueryData,
        user: profileData || null
      };
    }

    console.log(`🎁 Gift data:`, {
      id: giftData.id,
      recipient: giftData.recipients?.name,
      interests: giftData.recipients?.interests,
      price_range: giftData.price_range,
      gift_type: giftData.gift_type,
      payment_status: giftData.payment_status,
      testMode
    });

    // CRITICAL FIX: Use the exact product the user selected during payment
    let selectedVariantId;
    let matchReason = 'default';
    let productName = 'Gift Item';
    let variantPrice = "25.00";

    // First, check if we have the user's specific product selection from payment
    // This should be stored in the payment metadata or gift data
    console.log('🔍 Checking for user-selected variant ID...');
    
    // Try to get the variant ID from the payment record first
    let userSelectedVariantId = null;
    let userSelectedPrice = null;
    
    if (!testMode) {
      try {
        const { data: paymentData, error: paymentError } = await supabaseService
          .from('payments')
          .select('stripe_session_id, amount')
          .eq('scheduled_gift_id', scheduledGiftId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (paymentData && !paymentError) {
          console.log('💳 Found payment record, checking Stripe session metadata...');
          
          // Get the Stripe session to extract variant_id from metadata
          const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${paymentData.stripe_session_id}`, {
            headers: {
              'Authorization': `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
            },
          });
          
          if (stripeResponse.ok) {
            const stripeSession = await stripeResponse.json();
            if (stripeSession.metadata?.variant_id) {
              userSelectedVariantId = stripeSession.metadata.variant_id;
              userSelectedPrice = (paymentData.amount / 100).toString(); // Convert from cents
              console.log(`🎯 Found user-selected variant: ${userSelectedVariantId} for $${userSelectedPrice}`);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not retrieve payment variant info:', error.message);
      }
    }

    // Use the user's exact selection if available
    if (userSelectedVariantId) {
      selectedVariantId = userSelectedVariantId;
      variantPrice = userSelectedPrice || variantPrice;
      matchReason = 'user-selected-product';
      productName = giftData.gift_type || 'Selected Gift';
      console.log(`✅ Using user-selected product: ${productName} (variant: ${selectedVariantId})`);
    }
    // Only fall back to dynamic selection if we don't have user's specific choice
    else if (shopifyStorefrontToken) {
      try {
        console.log('🛍️ No user selection found, attempting dynamic product selection...');
        const dynamicProduct = await selectProductFromInterests(
          giftData.recipients?.interests || [],
          giftData.gift_type
        );
        
        if (dynamicProduct) {
          selectedVariantId = dynamicProduct.variantId;
          matchReason = dynamicProduct.matchReason;
          productName = dynamicProduct.title;
          variantPrice = dynamicProduct.price?.toString() || "25.00";
          console.log(`🎯 Selected dynamic product: ${productName} (${matchReason})`);
        }
      } catch (error) {
        console.error('⚠️ Dynamic selection failed:', error.message);
        // Continue to fallback
      }
    }

    // If no dynamic product, try to get any available product from Admin API
    if (!selectedVariantId) {
      console.log('🔄 Attempting to find any available product via Admin API...');
      const fallbackProduct = await getAnyAvailableProduct(shopifyStoreUrl, shopifyToken);
      
      if (fallbackProduct) {
        selectedVariantId = fallbackProduct.variantId;
        productName = fallbackProduct.title;
        variantPrice = fallbackProduct.price;
        matchReason = 'admin-api-fallback';
        console.log(`✅ Found fallback product: ${productName} (ID: ${selectedVariantId})`);
      }
    }

    // Final hardcoded fallback - use numeric ID format
    if (!selectedVariantId) {
      console.log('⚠️ Using hardcoded fallback variant...');
      // Use numeric ID instead of GID format for REST API
      selectedVariantId = '51056282272063';
      productName = 'Default Gift Item';
      matchReason = 'hardcoded-fallback';
      variantPrice = "25.00";
    }

    // Create order in test mode or live mode
    let orderResult;

    if (testMode) {
      orderResult = {
        id: 'test-order-' + Date.now(),
        name: '#TEST-' + Math.floor(Math.random() * 10000),
        test: true
      };
      console.log('🧪 TEST MODE: Skipping actual order creation');
    } else {
      // Create real Shopify order
      const cleanStoreUrl = shopifyStoreUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

      console.log(`🛒 Creating order with variant ID: ${selectedVariantId}`);

      // Convert GID format to numeric if needed
      const numericVariantId = selectedVariantId.includes('gid://') 
        ? selectedVariantId.split('/').pop() 
        : selectedVariantId;

      // Validate variant exists (optional, can skip if causing issues)
      let validatedPrice = variantPrice;
      try {
        const variantCheckUrl = `${shopifyApiUrl}/variants/${numericVariantId}.json`;
        console.log(`🔍 Checking variant at: ${variantCheckUrl}`);
        
        const variantResponse = await fetch(variantCheckUrl, {
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
        });

        if (variantResponse.ok) {
          const { variant } = await variantResponse.json();
          validatedPrice = variant.price || variantPrice;
          console.log(`✅ Variant validated: ${variant.title} - $${validatedPrice}`);
        } else {
          console.log(`⚠️ Could not validate variant ${numericVariantId}, proceeding anyway`);
        }
      } catch (e) {
        console.log(`⚠️ Variant validation skipped: ${e.message}`);
      }

      // Create the order
      const customerName = giftData.user?.full_name || giftData.user?.email?.split('@')[0] || 'Customer';
      const customerEmail = giftData.user?.email || "orders@unwrapt.com";
      
      const orderData = {
        order: {
          line_items: [
            {
              variant_id: numericVariantId,
              quantity: 1,
              price: validatedPrice,
            }
          ],
          shipping_address: {
            ...recipientAddress,
            country_code: recipientAddress.country === 'United States' ? 'US' : recipientAddress.country
          },
          billing_address: {
            ...recipientAddress,
            country_code: recipientAddress.country === 'United States' ? 'US' : recipientAddress.country
          },
          customer: {
            first_name: customerName.split(' ')[0] || customerName,
            last_name: customerName.split(' ').slice(1).join(' ') || '',
            email: customerEmail
          },
          email: customerEmail,
          phone: recipientAddress.phone || giftData.recipients?.phone,
          note: `Gift from ${customerName} via Unwrapt - ${giftData.occasion || 'Special Occasion'}. Recipient: ${giftData.recipients?.name}. Product: ${productName} (${matchReason})`,
          tags: "unwrapt-gift",
          financial_status: "paid",
          send_receipt: false,
          send_fulfillment_receipt: false,
          contact_email: customerEmail,
        }
      };

      console.log(`📦 Creating order with line item:`, {
        variant_id: numericVariantId,
        quantity: 1,
        price: validatedPrice
      });

      const orderResponse = await fetch(`${shopifyApiUrl}/orders.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log(`📨 Order response status: ${orderResponse.status}`);

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('❌ Shopify order creation failed:', errorText);
        
        // Try to parse error for better logging
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors) {
            console.error('❌ Shopify errors:', errorJson.errors);
          }
        } catch (e) {
          // Text wasn't JSON
        }
        
        throw new Error(`Failed to create Shopify order: ${orderResponse.status}`);
      }

      const { order } = await orderResponse.json();
      orderResult = order;
      console.log(`✅ Successfully created Shopify order: ${order.name} (ID: ${order.id})`);
    }

    // Update gift record
    if (!testMode) {
      const updateData = {
        status: 'ordered',
        updated_at: new Date().toISOString(),
        gift_description: `Order: ${orderResult.name} | Product: ${productName} | ${matchReason}`.substring(0, 500)
      };
      
      await supabaseService
        .from('scheduled_gifts')
        .update(updateData)
        .eq('id', scheduledGiftId);
    }

    return new Response(JSON.stringify({
      success: true,
      testMode,
      shopifyOrderId: orderResult.id,
      shopifyOrderName: orderResult.name,
      selectedProduct: {
        variantId: selectedVariantId,
        productName: productName,
        matchReason: matchReason
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error in Shopify order processing:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Return generic error message (detailed errors are in server logs)
    return new Response(JSON.stringify({ 
      error: "Failed to create Shopify order. Please contact support.",
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to get any available product from Admin API
async function getAnyAvailableProduct(shopifyStoreUrl: string, shopifyToken: string) {
  try {
    const cleanStoreUrl = shopifyStoreUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;
    
    console.log('🔍 Fetching available products from Admin API...');
    
    // Get products with available inventory
    const productsResponse = await fetch(
      `${shopifyApiUrl}/products.json?limit=10&status=active`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!productsResponse.ok) {
      console.error('❌ Failed to fetch products:', productsResponse.status);
      return null;
    }

    const { products } = await productsResponse.json();
    
    console.log(`📦 Found ${products?.length || 0} products`);

    // Find first product with available variants
    for (const product of products || []) {
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          // Check if variant is available
          if (variant.inventory_quantity === null || variant.inventory_quantity > 0) {
            console.log(`✅ Found available variant: ${product.title} - ${variant.title}`);
            return {
              variantId: variant.id.toString(),
              title: `${product.title}${variant.title !== 'Default Title' ? ' - ' + variant.title : ''}`,
              price: variant.price
            };
          }
        }
      }
    }

    console.log('⚠️ No available products found in store');
    return null;
    
  } catch (error) {
    console.error('❌ Error fetching products from Admin API:', error);
    return null;
  }
}

// Simplified dynamic selection function
async function selectProductFromInterests(interests: string[], giftType?: string) {
  const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
  const shopifyToken = Deno.env.get("SHOPIFY_STOREFRONT_API_TOKEN");
  
  if (!shopifyStore || !shopifyToken) {
    console.log('⚠️ Storefront API not configured, skipping dynamic selection');
    return null;
  }

  try {
    const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    // Use current API version
    const shopifyGraphQLUrl = `https://${cleanStoreUrl}/api/2024-10/graphql.json`;

    // Try to query products directly without collection
    const query = `
      query getProducts {
        products(first: 10, query: "status:active") {
          edges {
            node {
              id
              title
              handle
              availableForSale
              variants(first: 5) {
                edges {
                  node {
                    id
                    availableForSale
                    quantityAvailable
                    price {
                      amount
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log(`🌐 Querying Storefront API for products...`);

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.log(`⚠️ Storefront API request failed: ${response.status}`);
      return null;
    }

    const { data, errors } = await response.json();
    
    if (errors) {
      console.log('⚠️ GraphQL errors:', errors);
      return null;
    }

    if (!data?.products?.edges?.length) {
      console.log('⚠️ No products found via Storefront API');
      return null;
    }

    // Find first available product
    for (const edge of data.products.edges) {
      const product = edge.node;
      if (product.availableForSale && product.variants?.edges?.length) {
        const availableVariant = product.variants.edges.find(
          (v: any) => v.node.availableForSale
        );
        
        if (availableVariant) {
          return {
            variantId: availableVariant.node.id,
            title: product.title,
            price: parseFloat(availableVariant.node.price.amount),
            matchReason: 'storefront-api-product'
          };
        }
      }
    }

    return null;

  } catch (error) {
    console.error('⚠️ Storefront API error:', error);
    return null;
  }
}