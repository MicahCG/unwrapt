
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

    const { scheduledGiftId, recipientAddress }: ShopifyOrderRequest = await req.json();

    if (!scheduledGiftId) {
      throw new Error("Missing scheduledGiftId");
    }

    // Get the scheduled gift details
    const { data: giftData, error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .select(`
        *,
        recipients (name, email, phone, address)
      `)
      .eq('id', scheduledGiftId)
      .eq('payment_status', 'paid')
      .single();

    if (giftError || !giftData) {
      throw new Error("Gift not found or payment not confirmed");
    }

    // Shopify API configuration
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyStore || !shopifyToken) {
      throw new Error("Shopify credentials not configured");
    }

    const shopifyApiUrl = `https://${shopifyStore}/admin/api/2024-01`;

    // Find suitable products based on gift type and price range
    const productsResponse = await fetch(`${shopifyApiUrl}/products.json?limit=50`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!productsResponse.ok) {
      throw new Error(`Shopify API error: ${productsResponse.statusText}`);
    }

    const { products }: { products: ShopifyProduct[] } = await productsResponse.json();

    // Simple product matching logic based on gift type
    const matchingProducts = products.filter(product => {
      const title = product.title.toLowerCase();
      const giftType = giftData.gift_type?.toLowerCase() || '';
      
      // Basic matching logic - can be enhanced with AI/ML later
      if (giftType.includes('flower') && title.includes('flower')) return true;
      if (giftType.includes('chocolate') && (title.includes('chocolate') || title.includes('candy'))) return true;
      if (giftType.includes('jewelry') && title.includes('jewelry')) return true;
      if (giftType.includes('book') && title.includes('book')) return true;
      if (giftType.includes('tech') && (title.includes('tech') || title.includes('electronic'))) return true;
      if (giftType.includes('home') && (title.includes('home') || title.includes('decor'))) return true;
      
      return false;
    });

    // If no specific matches, get general gift items
    const selectedProducts = matchingProducts.length > 0 ? matchingProducts : products.slice(0, 5);

    // Filter products by price range
    const priceRange = giftData.price_range || '';
    let maxPrice = 50; // Default
    
    if (priceRange.includes('25-50')) maxPrice = 50;
    else if (priceRange.includes('50-100')) maxPrice = 100;
    else if (priceRange.includes('100-250')) maxPrice = 250;
    else if (priceRange.includes('250-500')) maxPrice = 500;
    else if (priceRange.includes('500+')) maxPrice = 1000;

    const affordableProducts = selectedProducts.filter(product => 
      product.variants.some(variant => 
        parseFloat(variant.price) <= maxPrice && variant.available
      )
    );

    if (affordableProducts.length === 0) {
      throw new Error("No suitable products found within price range");
    }

    // Select the first suitable product
    const selectedProduct = affordableProducts[0];
    const selectedVariant = selectedProduct.variants.find(v => 
      parseFloat(v.price) <= maxPrice && v.available
    );

    if (!selectedVariant) {
      throw new Error("No available variant found");
    }

    // Create Shopify order
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
        note: `Gift from Unwrapt - Occasion: ${giftData.occasion}. ${giftData.gift_description || ''}`,
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

    // Update the scheduled gift with order information
    const { error: updateError } = await supabaseService
      .from('scheduled_gifts')
      .update({
        status: 'ordered',
        updated_at: new Date().toISOString(),
        gift_description: `${giftData.gift_description || ''} | Shopify Order: ${order.name} | Product: ${selectedProduct.title}`
      })
      .eq('id', scheduledGiftId);

    if (updateError) {
      console.error('Error updating gift status:', updateError);
    }

    console.log(`Successfully created Shopify order ${order.name} for gift ${scheduledGiftId}`);

    return new Response(JSON.stringify({
      success: true,
      shopifyOrderId: order.id,
      shopifyOrderName: order.name,
      productTitle: selectedProduct.title,
      price: selectedVariant.price,
      trackingUrl: `https://${shopifyStore}/admin/orders/${order.id}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating Shopify order:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
