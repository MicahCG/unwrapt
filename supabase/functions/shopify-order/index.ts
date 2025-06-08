import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Available product variants
const PRODUCT_VARIANTS = {
  VANILLA_CANDLE: 50924986532159,
  COFFEE: 50924986663231,
  THIRD_PRODUCT: 51013162041663
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

    console.log(`Processing ${testMode ? 'TEST' : 'LIVE'} order for gift: ${scheduledGiftId}`);

    // Get the scheduled gift details
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .select(`
        *,
        recipients (name, email, phone, address, interests)
      `)
      .eq('id', scheduledGiftId)
      .eq('payment_status', 'paid')
      .single();

    if (giftError || !giftData) {
      throw new Error("Gift not found or payment not confirmed");
    }

    console.log(`Gift data:`, {
      id: giftData.id,
      recipient: giftData.recipients?.name,
      interests: giftData.recipients?.interests,
      price_range: giftData.price_range,
      gift_type: giftData.gift_type
    });

    // Select product variant based on gift type or interests
    let selectedVariantId = PRODUCT_VARIANTS.VANILLA_CANDLE; // Default
    let matchReason = 'default vanilla candle';

    // Check if gift type is specified
    if (giftData.gift_type) {
      if (giftData.gift_type.toLowerCase().includes('coffee')) {
        selectedVariantId = PRODUCT_VARIANTS.COFFEE;
        matchReason = 'gift type: coffee';
      } else if (giftData.gift_type.toLowerCase().includes('candle') || giftData.gift_type.toLowerCase().includes('vanilla')) {
        selectedVariantId = PRODUCT_VARIANTS.VANILLA_CANDLE;
        matchReason = 'gift type: candle/vanilla';
      } else if (giftData.gift_type.toLowerCase().includes('bath') || giftData.gift_type.toLowerCase().includes('body')) {
        selectedVariantId = PRODUCT_VARIANTS.THIRD_PRODUCT;
        matchReason = 'gift type: bath & body';
      }
    }

    // Check recipient interests if no specific gift type match
    if (selectedVariantId === PRODUCT_VARIANTS.VANILLA_CANDLE && giftData.recipients?.interests) {
      const interests = giftData.recipients.interests.map((i: string) => i.toLowerCase());
      
      if (interests.some((interest: string) => 
        interest.includes('coffee') || 
        interest.includes('caffeine') || 
        interest.includes('espresso') || 
        interest.includes('latte')
      )) {
        selectedVariantId = PRODUCT_VARIANTS.COFFEE;
        matchReason = `recipient interests: ${interests.filter((i: string) => 
          i.includes('coffee') || i.includes('caffeine') || i.includes('espresso') || i.includes('latte')
        ).join(', ')}`;
      } else if (interests.some((interest: string) => 
        interest.includes('bath') || 
        interest.includes('body') || 
        interest.includes('skincare') || 
        interest.includes('spa') ||
        interest.includes('wellness')
      )) {
        selectedVariantId = PRODUCT_VARIANTS.THIRD_PRODUCT;
        matchReason = `recipient interests: ${interests.filter((i: string) => 
          i.includes('bath') || i.includes('body') || i.includes('skincare') || 
          i.includes('spa') || i.includes('wellness')
        ).join(', ')}`;
      } else if (interests.some((interest: string) => 
        interest.includes('candle') || 
        interest.includes('vanilla') || 
        interest.includes('scent') || 
        interest.includes('aromatherapy') ||
        interest.includes('relaxation')
      )) {
        selectedVariantId = PRODUCT_VARIANTS.VANILLA_CANDLE;
        matchReason = `recipient interests: ${interests.filter((i: string) => 
          i.includes('candle') || i.includes('vanilla') || i.includes('scent') || 
          i.includes('aromatherapy') || i.includes('relaxation')
        ).join(', ')}`;
      }
    }

    console.log(`Selected variant ID: ${selectedVariantId} (${matchReason})`);

    // Get variant details from Shopify
    let variantPrice = "25.00"; // Default price
    let productName = selectedVariantId === PRODUCT_VARIANTS.COFFEE ? "Coffee" : 
                     selectedVariantId === PRODUCT_VARIANTS.THIRD_PRODUCT ? "Bath & Body" : 
                     "Vanilla Candle"; // Default names
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (shopifyStore && shopifyToken) {
      try {
        const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;
        
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
          
          console.log(`Retrieved product: ${productName}, price: $${variantPrice}`);
        }
      } catch (error) {
        console.log('Could not fetch product details, using defaults:', error.message);
      }
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
      console.log('TEST MODE: Skipping actual order creation');
    } else {
      if (!shopifyStore || !shopifyToken) {
        throw new Error("Shopify credentials not configured for live orders");
      }

      const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

      const orderData = {
        order: {
          line_items: [
            {
              variant_id: selectedVariantId,
              quantity: 1,
            }
          ],
          shipping_address: recipientAddress,
          billing_address: recipientAddress,
          email: giftData.recipients?.email || "gift@unwrapt.com",
          phone: recipientAddress.phone || giftData.recipients?.phone,
          note: `Gift from Unwrapt - Occasion: ${giftData.occasion}. Recipient interests: ${giftData.recipients?.interests?.join(', ') || 'none'}. Selected product: ${productName}. Match reason: ${matchReason}. ${giftData.gift_description || ''}`,
          tags: "unwrapt-gift",
          financial_status: "paid", // Since we already collected payment
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
        throw new Error(`Failed to create Shopify order: ${errorData}`);
      }

      const { order } = await orderResponse.json();
      orderResult = order;
    }

    // Update the scheduled gift with order information
    const { error: updateError } = await supabaseService
      .from('scheduled_gifts')
      .update({
        status: testMode ? 'test-ordered' : 'ordered',
        updated_at: new Date().toISOString(),
        gift_description: `${giftData.gift_description || ''} | Product: ${productName} | Variant ID: ${selectedVariantId} | Match: ${matchReason}${testMode ? ' | TEST MODE' : ''}`
      })
      .eq('id', scheduledGiftId);

    if (updateError) {
      console.error('Error updating gift status:', updateError);
    }

    console.log(`Successfully ${testMode ? 'tested' : 'created'} Shopify order ${orderResult.name} for gift ${scheduledGiftId}`);

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
    console.error('Error in Shopify order processing:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
