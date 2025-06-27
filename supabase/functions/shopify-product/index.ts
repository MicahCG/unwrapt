
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
    const { productType } = await req.json();

    if (!productType) {
      throw new Error("Product type is required");
    }

    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    if (!shopifyStore || !shopifyToken) {
      console.log("Shopify credentials not configured, returning fallback");
      // Return fallback pricing if Shopify is unavailable
      return new Response(JSON.stringify({
        success: false,
        product: {
          id: 'fallback',
          title: productType,
          price: 25.00,
          image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
          productType,
          variantId: 'fallback'
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Clean the store URL
    const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

    console.log(`Fetching products for type: ${productType}`);

    // Get all products and find one matching the product type
    const productsResponse = await fetch(`${shopifyApiUrl}/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!productsResponse.ok) {
      throw new Error(`Failed to fetch products: ${productsResponse.statusText}`);
    }

    const { products } = await productsResponse.json();
    
    // Find product that matches the product type
    const matchingProduct = products.find((product: any) => 
      product.product_type?.toLowerCase() === productType.toLowerCase() ||
      product.title?.toLowerCase().includes(productType.toLowerCase())
    );

    if (!matchingProduct || !matchingProduct.variants || matchingProduct.variants.length === 0) {
      console.log(`No matching product found for type: ${productType}`);
      // Return fallback if no matching product found
      return new Response(JSON.stringify({
        success: false,
        product: {
          id: 'fallback',
          title: productType,
          price: 25.00,
          image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
          productType,
          variantId: 'fallback'
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const firstVariant = matchingProduct.variants[0];
    const productImage = matchingProduct.images && matchingProduct.images.length > 0 
      ? matchingProduct.images[0].src 
      : 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop';

    console.log(`Found product: ${matchingProduct.title} with price: ${firstVariant.price}`);

    return new Response(JSON.stringify({
      success: true,
      product: {
        id: matchingProduct.id.toString(),
        title: matchingProduct.title,
        price: parseFloat(firstVariant.price),
        image: productImage,
        productType: matchingProduct.product_type || productType,
        variantId: firstVariant.id.toString()
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching Shopify product:', error);
    
    // Return fallback pricing on error
    const { productType } = await req.json().catch(() => ({ productType: 'Unknown' }));
    
    return new Response(JSON.stringify({ 
      success: false,
      product: {
        id: 'fallback',
        title: productType || 'Gift Item',
        price: 25.00,
        image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
        productType: productType || 'Unknown',
        variantId: 'fallback'
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
