
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
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyStore || !shopifyToken) {
      throw new Error("Shopify credentials not configured");
    }

    // Clean the store URL - remove any extra slashes or protocols
    const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

    console.log('Making request to:', `${shopifyApiUrl}/products.json?limit=250&fields=product_type`);

    // Fetch products to get unique product types
    const productsResponse = await fetch(`${shopifyApiUrl}/products.json?limit=250&fields=product_type`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!productsResponse.ok) {
      throw new Error(`Shopify API error: ${productsResponse.statusText}`);
    }

    const { products } = await productsResponse.json();
    
    // Extract unique product types and filter out empty ones
    const productTypes = [...new Set(
      products
        .map((product: any) => product.product_type)
        .filter((type: string) => type && type.trim().length > 0)
    )].sort();

    console.log(`Found ${productTypes.length} unique product types:`, productTypes);

    return new Response(JSON.stringify({
      success: true,
      productTypes: productTypes
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching Shopify product types:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
