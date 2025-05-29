
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { variantId } = await req.json();

    if (!variantId) {
      throw new Error("Variant ID is required");
    }

    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyStore || !shopifyToken) {
      throw new Error("Shopify credentials not configured");
    }

    // Clean the store URL
    const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

    console.log(`Fetching variant ${variantId} from Shopify`);

    // First get the variant to get the product ID
    const variantResponse = await fetch(`${shopifyApiUrl}/variants/${variantId}.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!variantResponse.ok) {
      throw new Error(`Failed to fetch variant: ${variantResponse.statusText}`);
    }

    const { variant } = await variantResponse.json();
    
    // Now get the product details
    const productResponse = await fetch(`${shopifyApiUrl}/products/${variant.product_id}.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product: ${productResponse.statusText}`);
    }

    const { product } = await productResponse.json();

    console.log(`Found product: ${product.title}`);

    return new Response(JSON.stringify({
      success: true,
      productName: product.title,
      variantTitle: variant.title,
      productId: product.id,
      variantId: variant.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching Shopify product:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
