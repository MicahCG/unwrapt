import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Product interface to match what the frontend expects
interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  price: number;
  currency: string;
  featuredImage: string | null; // Fixed: Use featuredImage instead of image
  productType: string;
  variantId: string;
  inventory: number;
  metafields: {
    category: string;
    rank: number;
    badge: string;
  };
}

// Request interface
interface CollectionRequest {
  collectionHandle?: string;
  limit?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Shopify Collections Function Started ===');
    
    // Get environment variables
    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY STOREFRONT API TOKEN");
    
    console.log('Environment check:');
    console.log('SHOPIFY_STORE_URL:', shopifyStore ? 'SET' : 'NOT SET');
    console.log('SHOPIFY_STOREFRONT_API_TOKEN:', shopifyToken ? 'SET' : 'NOT SET');

    if (!shopifyStore || !shopifyToken) {
      console.log('Shopify credentials not configured, returning fallback products');
      
      // Return fallback products when credentials are not configured
      const fallbackProducts: ShopifyProduct[] = [
        {
          id: 'fallback-1',
          title: 'Premium Gift Box',
          handle: 'premium-gift-box',
          price: 49.99,
          currency: 'USD',
          featuredImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
          productType: 'Gift Box',
          variantId: 'variant-1',
          inventory: 10,
          metafields: {
            category: 'premium',
            rank: 1,
            badge: 'bestseller'
          }
        },
        {
          id: 'fallback-2',
          title: 'Artisan Coffee Bundle',
          handle: 'artisan-coffee-bundle',
          price: 34.99,
          currency: 'USD',
          featuredImage: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
          productType: 'Coffee',
          variantId: 'variant-2',
          inventory: 15,
          metafields: {
            category: 'beverage',
            rank: 2,
            badge: 'new'
          }
        }
      ];

      return new Response(JSON.stringify({
        success: true,
        products: fallbackProducts,
        total: fallbackProducts.length,
        note: 'Using fallback products - Shopify not configured'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Parse request
    const { collectionHandle = 'gifts-all', limit = 50 }: CollectionRequest = await req.json();

    // Clean the store URL
    const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopifyGraphQLUrl = `https://${cleanStoreUrl}/api/2024-01/graphql.json`;

    console.log(`Using Shopify GraphQL URL: ${shopifyGraphQLUrl}`);
    console.log(`Fetching products, limit: ${limit}`);

    // Simple, working GraphQL query
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              availableForSale
              productType
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
                altText
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    availableForSale
                    quantityAvailable
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('Making GraphQL request to Shopify...');

    const shopifyResponse = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': shopifyToken,
      },
      body: JSON.stringify({
        query: query,
        variables: { first: limit }
      }),
    });

    console.log(`Shopify response status: ${shopifyResponse.status}`);

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      throw new Error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
    }

    const shopifyData = await shopifyResponse.json();
    console.log('Shopify response received successfully');

    if (shopifyData.errors) {
      console.error('GraphQL errors:', JSON.stringify(shopifyData.errors));
      throw new Error(`GraphQL errors: ${JSON.stringify(shopifyData.errors)}`);
    }

    const products = shopifyData.data?.products?.edges || [];
    console.log(`Found ${products.length} products from Shopify`);

    // Transform products to our format
    const transformedProducts: ShopifyProduct[] = products.map((edge: any) => {
      const product = edge.node;
      const variant = product.variants?.edges[0]?.node;

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        price: parseFloat(product.priceRange?.minVariantPrice?.amount || '0'),
        currency: product.priceRange?.minVariantPrice?.currencyCode || 'USD',
        featuredImage: product.featuredImage?.url || null, // Fixed: Use featuredImage instead of image
        productType: product.productType || '',
        variantId: variant?.id || '',
        inventory: variant?.quantityAvailable || 0,
        metafields: {
          category: '',
          rank: 0,
          badge: ''
        }
      };
    });

    console.log(`Returning ${transformedProducts.length} transformed products`);

    return new Response(JSON.stringify({
      success: true,
      products: transformedProducts,
      total: transformedProducts.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Shopify collections function:', error);
    
    // Return fallback products instead of failing
    console.log('Returning fallback products due to error');
    const fallbackProducts: ShopifyProduct[] = [
      {
        id: 'fallback-1',
        title: 'Premium Gift Box',
        handle: 'premium-gift-box',
        price: 49.99,
        currency: 'USD',
        featuredImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
        productType: 'Gift Box',
        variantId: 'variant-1',
        inventory: 10,
        metafields: {
          category: 'premium',
          rank: 1,
          badge: 'bestseller'
        }
      },
      {
        id: 'fallback-2',
        title: 'Artisan Coffee Bundle',
        handle: 'artisan-coffee-bundle',
        price: 34.99,
        currency: 'USD',
        featuredImage: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
        productType: 'Coffee',
        variantId: 'variant-2',
        inventory: 15,
        metafields: {
          category: 'beverage',
          rank: 2,
          badge: 'new'
        }
      },
      {
        id: 'fallback-3',
        title: 'Luxury Candle Set',
        handle: 'luxury-candle-set',
        price: 39.99,
        currency: 'USD',
        featuredImage: 'https://images.unsplash.com/photo-1602874801007-62a0d9ab7c9b?w=400',
        productType: 'Candles',
        variantId: 'variant-3',
        inventory: 8,
        metafields: {
          category: 'home',
          rank: 3,
          badge: 'limited'
        }
      }
    ];

    return new Response(JSON.stringify({
      success: true,
      products: fallbackProducts,
      total: fallbackProducts.length,
      note: 'Using fallback products due to API error',
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
