
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface ProductMatch {
  product: ShopifyProduct;
  score: number;
  reason: string;
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

    // Shopify API configuration
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyStore || !shopifyToken) {
      throw new Error("Shopify credentials not configured");
    }

    const shopifyApiUrl = `https://${shopifyStore}/admin/api/2024-01`;

    // Fetch products from Shopify
    const productsResponse = await fetch(`${shopifyApiUrl}/products.json?limit=100`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!productsResponse.ok) {
      throw new Error(`Shopify API error: ${productsResponse.statusText}`);
    }

    const { products }: { products: ShopifyProduct[] } = await productsResponse.json();
    console.log(`Found ${products.length} products in Shopify store`);

    // Enhanced product matching logic
    const matchProducts = (interests: string[], giftType?: string): ProductMatch[] => {
      const matches: ProductMatch[] = [];
      
      products.forEach(product => {
        let score = 0;
        let reasons: string[] = [];
        
        const title = product.title.toLowerCase();
        const tags = product.tags.toLowerCase();
        const productType = product.product_type.toLowerCase();
        
        // Check interests (coffee/tea)
        if (interests) {
          interests.forEach(interest => {
            const interestLower = interest.toLowerCase();
            
            if (interestLower === 'coffee') {
              if (title.includes('coffee') || tags.includes('coffee') || productType.includes('coffee')) {
                score += 10;
                reasons.push('matches coffee interest');
              }
              if (title.includes('espresso') || title.includes('latte') || title.includes('cappuccino')) {
                score += 8;
                reasons.push('matches coffee variety');
              }
              if (title.includes('bean') || title.includes('roast')) {
                score += 6;
                reasons.push('coffee related');
              }
            }
            
            if (interestLower === 'tea') {
              if (title.includes('tea') || tags.includes('tea') || productType.includes('tea')) {
                score += 10;
                reasons.push('matches tea interest');
              }
              if (title.includes('green tea') || title.includes('black tea') || title.includes('herbal')) {
                score += 8;
                reasons.push('matches tea variety');
              }
              if (title.includes('chai') || title.includes('matcha') || title.includes('oolong')) {
                score += 7;
                reasons.push('specialty tea');
              }
            }
            
            // Custom interests that include coffee/tea
            if (interestLower.includes('coffee') || interestLower.includes('tea')) {
              if (title.includes(interestLower)) {
                score += 12;
                reasons.push(`matches custom interest: ${interest}`);
              }
            }
          });
        }
        
        // Check gift type
        if (giftType) {
          const giftTypeLower = giftType.toLowerCase();
          if (title.includes(giftTypeLower) || tags.includes(giftTypeLower) || productType.includes(giftTypeLower)) {
            score += 5;
            reasons.push('matches gift type');
          }
        }
        
        // Bonus points for gift-related terms
        if (title.includes('gift') || title.includes('set') || title.includes('collection')) {
          score += 3;
          reasons.push('gift-friendly product');
        }
        
        if (score > 0) {
          matches.push({
            product,
            score,
            reason: reasons.join(', ')
          });
        }
      });
      
      return matches.sort((a, b) => b.score - a.score);
    };

    // Get product matches
    const interests = giftData.recipients?.interests || [];
    const productMatches = matchProducts(interests, giftData.gift_type);
    
    console.log(`Found ${productMatches.length} product matches:`, 
      productMatches.slice(0, 3).map(m => ({ 
        title: m.product.title, 
        score: m.score, 
        reason: m.reason 
      }))
    );

    if (productMatches.length === 0) {
      throw new Error("No suitable products found matching recipient interests");
    }

    // Filter by price range
    const priceRange = giftData.price_range || '';
    let maxPrice = 50; // Default
    
    if (priceRange.includes('25-50')) maxPrice = 50;
    else if (priceRange.includes('50-100')) maxPrice = 100;
    else if (priceRange.includes('100-250')) maxPrice = 250;
    else if (priceRange.includes('250-500')) maxPrice = 500;
    else if (priceRange.includes('500+')) maxPrice = 1000;

    console.log(`Filtering by price range: $${maxPrice}`);

    const affordableMatches = productMatches.filter(match => 
      match.product.variants.some(variant => 
        parseFloat(variant.price) <= maxPrice && variant.available
      )
    );

    if (affordableMatches.length === 0) {
      throw new Error(`No products found within price range $${maxPrice} that match interests`);
    }

    // Select the best match
    const selectedMatch = affordableMatches[0];
    const selectedProduct = selectedMatch.product;
    const selectedVariant = selectedProduct.variants.find(v => 
      parseFloat(v.price) <= maxPrice && v.available
    );

    if (!selectedVariant) {
      throw new Error("No available variant found for selected product");
    }

    console.log(`Selected product: ${selectedProduct.title} (Score: ${selectedMatch.score}, Price: $${selectedVariant.price})`);
    console.log(`Matching reason: ${selectedMatch.reason}`);

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
      const orderData = {
        order: {
          line_items: [
            {
              variant_id: parseInt(selectedVariant.id),
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
        gift_description: `${giftData.gift_description || ''} | Product: ${selectedProduct.title} | Match Score: ${selectedMatch.score} | Reason: ${selectedMatch.reason}${testMode ? ' | TEST MODE' : ''}`
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
        title: selectedProduct.title,
        id: selectedProduct.id,
        matchScore: selectedMatch.score,
        matchReason: selectedMatch.reason
      },
      variant: {
        id: selectedVariant.id,
        price: selectedVariant.price
      },
      interests: interests,
      totalMatches: productMatches.length,
      affordableMatches: affordableMatches.length,
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
