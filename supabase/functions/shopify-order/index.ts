
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded interest to variant ID mapping
const INTEREST_TO_PRODUCT_MAPPING: Record<string, number> = {
  candle: 44718901371329,
  coffee: 44718901371329,
  books: 44718901371329,
  skincare: 44718901371329,
  wellness: 44718901371329,
  technology: 44718901371329,
  cooking: 44718901371329,
  pets: 44718901371329,
  travel: 44718901371329,
  fitness: 44718901371329,
  art: 44718901371329,
  tea: 44718901371329,
  music: 44718901371329,
  gaming: 44718901371329,
  fashion: 44718901371329,
  'home decor': 44718901371329,
  jewelry: 44718901371329,
  'outdoor activities': 44718901371329,
  sports: 44718901371329,
};

// Predefined gift types that match your products
const AVAILABLE_GIFT_TYPES = [
  'Candles',
  'Coffee & Tea',
  'Books',
  'Skincare',
  'Wellness',
  'Technology',
  'Cooking',
  'Pet Supplies',
  'Travel',
  'Fitness',
  'Art Supplies',
  'Music',
  'Gaming',
  'Fashion',
  'Home Decor',
  'Jewelry',
  'Outdoor',
  'Sports'
];

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  product_type: string;
  tags: string;
  variants: Array<{
    id: string;
    price: string;
    available: boolean;
  }>;
}

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

    // Get the scheduled gift details with recipient interests
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
      price_range: giftData.price_range
    });

    // Find the best variant ID based on interests
    const interests = giftData.recipients?.interests || [];
    let selectedVariantId = INTEREST_TO_PRODUCT_MAPPING['candle']; // Default fallback
    let matchReason = 'default candle product';
    
    // Try to find a better match based on interests
    for (const interest of interests) {
      const interestLower = interest.toLowerCase();
      if (INTEREST_TO_PRODUCT_MAPPING[interestLower]) {
        selectedVariantId = INTEREST_TO_PRODUCT_MAPPING[interestLower];
        matchReason = `matched interest: ${interest}`;
        break;
      }
    }

    console.log(`Selected variant ID: ${selectedVariantId} (${matchReason})`);

    // Get variant price from Shopify (optional, for logging)
    let variantPrice = "25.00"; // Default price
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
          console.log(`Retrieved variant price: $${variantPrice}`);
        }
      } catch (error) {
        console.log('Could not fetch variant price, using default:', error.message);
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
          note: `Gift from Unwrapt - Occasion: ${giftData.occasion}. Recipient interests: ${interests.join(', ')}. ${giftData.gift_description || ''}`,
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
        gift_description: `${giftData.gift_description || ''} | Variant ID: ${selectedVariantId} | Match: ${matchReason}${testMode ? ' | TEST MODE' : ''}`
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
        matchReason: matchReason
      },
      variant: {
        id: selectedVariantId,
        price: variantPrice
      },
      interests: interests,
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
