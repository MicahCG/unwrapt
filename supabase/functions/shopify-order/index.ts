
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Available product variants
const PRODUCT_VARIANTS = {
  OCEAN_DRIFTWOOD_COCONUT_CANDLE: 51056282272063,
  LAVENDER_FIELDS_COFFEE: 51056282075455,
  TRUFFLE_CHOCOLATE: 51056285221183
};

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

    // For test mode, create mock data if gift doesn't exist
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
      // Get the scheduled gift details - for live mode, require payment confirmation
      const giftQuery = supabaseService
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (name, email, phone, street, city, state, zip_code, country, interests)
        `)
        .eq('id', scheduledGiftId)
        .eq('payment_status', 'paid');

      const { data: giftQueryData, error: giftError } = await giftQuery.single();

      if (giftError || !giftQueryData) {
        console.error('❌ Gift query error:', giftError);
        throw new Error("Gift not found or payment not confirmed");
      }
      giftData = giftQueryData;
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

    // Select product variant based on gift type or interests
    let selectedVariantId = PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE; // Default
    let matchReason = 'default ocean driftwood coconut candle';

    // Check if gift type is specified first
    if (giftData.gift_type) {
      const giftTypeLower = giftData.gift_type.toLowerCase();
      
      if (giftTypeLower.includes('coffee') || giftTypeLower.includes('lavender')) {
        selectedVariantId = PRODUCT_VARIANTS.LAVENDER_FIELDS_COFFEE;
        matchReason = `gift type: ${giftData.gift_type}`;
      } else if (giftTypeLower.includes('chocolate') || giftTypeLower.includes('truffle')) {
        selectedVariantId = PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE;
        matchReason = `gift type: ${giftData.gift_type}`;
      }
    }

    // Check recipient interests if using default and interests exist
    if (selectedVariantId === PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE && 
        matchReason === 'default ocean driftwood coconut candle' &&
        giftData.recipients?.interests && Array.isArray(giftData.recipients.interests)) {
      
      const interests = giftData.recipients.interests.map((i: string) => i.toLowerCase());
      
      // Check for coffee/lavender interests
      const coffeeInterests = interests.filter((interest: string) => 
        interest.includes('coffee') || 
        interest.includes('caffeine') || 
        interest.includes('lavender')
      );
      
      if (coffeeInterests.length > 0) {
        selectedVariantId = PRODUCT_VARIANTS.LAVENDER_FIELDS_COFFEE;
        matchReason = `recipient interests: ${coffeeInterests.join(', ')}`;
      } else {
        // Check for chocolate interests
        const chocolateInterests = interests.filter((interest: string) => 
          interest.includes('chocolate') || 
          interest.includes('truffle') || 
          interest.includes('sweet')
        );
        
        if (chocolateInterests.length > 0) {
          selectedVariantId = PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE;
          matchReason = `recipient interests: ${chocolateInterests.join(', ')}`;
        }
      }
    }

    console.log(`🎯 Selected variant ID: ${selectedVariantId} (${matchReason})`);

    // Default product information
    let variantPrice = "25.00";
    let productName = selectedVariantId === PRODUCT_VARIANTS.LAVENDER_FIELDS_COFFEE ? "Lavender Fields Coffee" : 
                     selectedVariantId === PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE ? "Truffle Chocolate" : 
                     "Ocean Driftwood Coconut Candle";

    // Create Shopify order (skip in test mode)
    let orderResult;
    
    if (testMode) {
      // Return test results without creating actual order
      orderResult = {
        id: 'test-order-' + Date.now(),
        name: '#TEST-' + Math.floor(Math.random() * 10000),
        test: true
      };
      console.log('🧪 TEST MODE: Skipping actual order creation');
    } else {
      // Get Shopify configuration
      const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
      const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
      
      if (!shopifyStore || !shopifyToken) {
        throw new Error("Shopify credentials not configured for live orders");
      }

      const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

      console.log(`🛒 Creating order via: ${shopifyApiUrl}/orders.json`);

      const orderData = {
        order: {
          line_items: [
            {
              variant_id: selectedVariantId,
              quantity: 1,
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
          email: giftData.recipients?.email || "gift@unwrapt.com",
          phone: recipientAddress.phone || giftData.recipients?.phone,
          note: `Gift from Unwrapt - Occasion: ${giftData.occasion}. Recipient interests: ${giftData.recipients?.interests?.join(', ') || 'none'}. Selected product: ${productName}. Match reason: ${matchReason}. ${giftData.gift_description || ''}`,
          tags: "unwrapt-gift",
          financial_status: "paid",
        }
      };

      const orderResponse = await fetch(`${shopifyApiUrl}/orders.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.text();
        console.error('❌ Shopify order creation failed:', errorData);
        throw new Error(`Failed to create Shopify order: ${errorData}`);
      }

      const { order } = await orderResponse.json();
      orderResult = order;
      console.log(`✅ Successfully created Shopify order: ${order.name} (ID: ${order.id})`);
    }

    // Get product image URL based on selected variant
    let productImageUrl = null;
    
    // First try to get actual Shopify product images for live orders
    if (!testMode && orderResult && orderResult.line_items && orderResult.line_items.length > 0) {
      try {
        const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
        const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
        const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;
        
        // Get the product ID from the order line item
        const lineItem = orderResult.line_items[0];
        if (lineItem.product_id) {
          console.log(`🖼️ Fetching product image for product ID: ${lineItem.product_id}`);
          
          const productResponse = await fetch(`${shopifyApiUrl}/products/${lineItem.product_id}.json`, {
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
              'Content-Type': 'application/json',
            },
          });
          
          if (productResponse.ok) {
            const { product } = await productResponse.json();
            if (product.images && product.images.length > 0) {
              productImageUrl = product.images[0].src;
              console.log(`✅ Retrieved product image: ${productImageUrl}`);
            }
          }
        }
      } catch (imageError) {
        console.error('⚠️ Error fetching product image:', imageError);
      }
    }
    
    // Fallback to variant-specific image URLs if no Shopify image was retrieved
    if (!productImageUrl) {
      const VARIANT_IMAGES = {
        [PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE]: "https://cdn.shopify.com/s/files/1/0234/5678/products/ocean-driftwood-coconut-candle.jpg",
        [PRODUCT_VARIANTS.LAVENDER_FIELDS_COFFEE]: "https://cdn.shopify.com/s/files/1/0234/5678/products/lavender-fields-coffee.jpg", 
        [PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE]: "https://cdn.shopify.com/s/files/1/0234/5678/products/truffle-chocolate.jpg"
      };
      
      productImageUrl = VARIANT_IMAGES[selectedVariantId];
      console.log(`📷 Using fallback image for variant ${selectedVariantId}: ${productImageUrl}`);
    }

    // Update the scheduled gift with order information (only if not test mode with mock data)
    if (!testMode || giftData.id !== scheduledGiftId) {
      const giftDescription = `${giftData.gift_description || ''} | Product: ${productName} | Variant ID: ${selectedVariantId} | Match: ${matchReason}${testMode ? ' | TEST MODE' : ''} | Shopify Order: ${orderResult.name}`;
      
      const updateData = {
        status: testMode ? 'test-ordered' : 'ordered',
        updated_at: new Date().toISOString(),
        gift_description: giftDescription.substring(0, 500),
        ...(productImageUrl && { gift_image_url: productImageUrl })
      };
      
      const { error: updateError } = await supabaseService
        .from('scheduled_gifts')
        .update(updateData)
        .eq('id', scheduledGiftId);

      if (updateError) {
        console.error('❌ Error updating gift status:', updateError);
      } else {
        console.log(`✅ Updated gift status to ${testMode ? 'test-ordered' : 'ordered'}${productImageUrl ? ' with product image' : ''}`);
      }
    }

    console.log(`🎉 Successfully ${testMode ? 'tested' : 'created'} Shopify order ${orderResult.name} for gift ${scheduledGiftId}`);

    return new Response(JSON.stringify({
      success: true,
      testMode,
      shopifyOrderId: orderResult.id,
      shopifyOrderName: orderResult.name,
      selectedProduct: {
        variantId: selectedVariantId,
        productName: productName,
        matchReason: matchReason
      },
      variant: {
        id: selectedVariantId,
        price: variantPrice
      },
      interests: giftData.recipients?.interests || [],
      trackingUrl: testMode ? null : `https://${Deno.env.get("SHOPIFY_STORE_URL")}/admin/orders/${orderResult.id}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error in Shopify order processing:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      details: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
