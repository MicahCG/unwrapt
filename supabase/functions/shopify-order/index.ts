
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Get the scheduled gift details - for test mode, don't require payment confirmation
    const giftQuery = supabaseService
      .from('scheduled_gifts')
      .select(`
        *,
        recipients (name, email, phone, street, city, state, zip_code, country, interests)
      `)
      .eq('id', scheduledGiftId);

    // Only require payment confirmation for live orders
    if (!testMode) {
      giftQuery.eq('payment_status', 'paid');
    }

    const { data: giftData, error: giftError } = await giftQuery.single();

    if (giftError || !giftData) {
      console.error('❌ Gift query error:', giftError);
      const errorMessage = testMode 
        ? "Gift not found - please ensure the gift exists and try again" 
        : "Gift not found or payment not confirmed";
      throw new Error(errorMessage);
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
      } else if (giftTypeLower.includes('candle') || giftTypeLower.includes('ocean') || 
                 giftTypeLower.includes('driftwood') || giftTypeLower.includes('coconut')) {
        selectedVariantId = PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE;
        matchReason = `gift type: ${giftData.gift_type}`;
      }
    }

    // Check recipient interests if no specific gift type match and using default
    if (selectedVariantId === PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE && 
        matchReason === 'default ocean driftwood coconut candle' &&
        giftData.recipients?.interests && Array.isArray(giftData.recipients.interests)) {
      
      const interests = giftData.recipients.interests.map((i: string) => i.toLowerCase());
      
      // Check for coffee/lavender interests
      const coffeeInterests = interests.filter((interest: string) => 
        interest.includes('coffee') || 
        interest.includes('caffeine') || 
        interest.includes('espresso') || 
        interest.includes('latte') ||
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
          interest.includes('sweet') || 
          interest.includes('dessert') ||
          interest.includes('candy')
        );
        
        if (chocolateInterests.length > 0) {
          selectedVariantId = PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE;
          matchReason = `recipient interests: ${chocolateInterests.join(', ')}`;
        } else {
          // Check for candle/aromatherapy interests
          const candleInterests = interests.filter((interest: string) => 
            interest.includes('candle') || 
            interest.includes('ocean') || 
            interest.includes('coconut') || 
            interest.includes('driftwood') ||
            interest.includes('scent') || 
            interest.includes('aromatherapy') ||
            interest.includes('relaxation')
          );
          
          if (candleInterests.length > 0) {
            selectedVariantId = PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE;
            matchReason = `recipient interests: ${candleInterests.join(', ')}`;
          }
        }
      }
    }

    console.log(`🎯 Selected variant ID: ${selectedVariantId} (${matchReason})`);

    // Get Shopify configuration
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    // Default product information
    let variantPrice = "25.00";
    let productName = selectedVariantId === PRODUCT_VARIANTS.LAVENDER_FIELDS_COFFEE ? "Lavender Fields Coffee" : 
                     selectedVariantId === PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE ? "Truffle Chocolate" : 
                     "Ocean Driftwood Coconut Candle";

    // Try to get actual product details from Shopify
    if (shopifyStore && shopifyToken && !testMode) {
      try {
        const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;
        
        console.log(`🔍 Fetching variant details from: ${shopifyApiUrl}/variants/${selectedVariantId}.json`);
        
        const variantResponse = await fetch(`${shopifyApiUrl}/variants/${selectedVariantId}.json`, {
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
        });
        
        if (variantResponse.ok) {
          const { variant } = await variantResponse.json();
          variantPrice = variant.price;
          
          // Get product name
          const productResponse = await fetch(`${shopifyApiUrl}/products/${variant.product_id}.json`, {
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
              'Content-Type': 'application/json',
            },
          });
          
          if (productResponse.ok) {
            const { product } = await productResponse.json();
            productName = product.title;
          }
          
          console.log(`✅ Retrieved product: ${productName}, price: $${variantPrice}`);
        } else {
          const errorText = await variantResponse.text();
          console.log(`⚠️ Could not fetch variant details: ${variantResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.log('⚠️ Could not fetch product details, using defaults:', error.message);
      }
    } else if (!shopifyStore || !shopifyToken) {
      console.log('⚠️ Shopify credentials not configured, using defaults');
    }

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
          financial_status: "paid", // Since we already collected payment
        }
      };

      console.log('🛒 Order data prepared:', JSON.stringify(orderData, null, 2));

      const orderResponse = await fetch(`${shopifyApiUrl}/orders.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      console.log(`🛒 Order response status: ${orderResponse.status}`);

      if (!orderResponse.ok) {
        const errorData = await orderResponse.text();
        console.error('❌ Shopify order creation failed:', errorData);
        throw new Error(`Failed to create Shopify order: ${orderData}`);
      }

      const { order } = await orderResponse.json();
      orderResult = order;
      console.log(`✅ Successfully created Shopify order: ${order.name} (ID: ${order.id})`);
    }

    // Update the scheduled gift with order information
    const giftDescription = `${giftData.gift_description || ''} | Product: ${productName} | Variant ID: ${selectedVariantId} | Match: ${matchReason}${testMode ? ' | TEST MODE' : ''} | Shopify Order: ${orderResult.name}`;
    
    const { error: updateError } = await supabaseService
      .from('scheduled_gifts')
      .update({
        status: testMode ? 'test-ordered' : 'ordered',
        updated_at: new Date().toISOString(),
        gift_description: giftDescription.substring(0, 500) // Ensure we don't exceed any length limits
      })
      .eq('id', scheduledGiftId);

    if (updateError) {
      console.error('❌ Error updating gift status:', updateError);
    } else {
      console.log(`✅ Updated gift status to ${testMode ? 'test-ordered' : 'ordered'}`);
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
      trackingUrl: testMode ? null : `https://${shopifyStore}/admin/orders/${orderResult.id}`
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
