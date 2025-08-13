import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage: string | null;
  price: number;
  compareAtPrice: number | null;
  availableForSale: boolean;
  totalInventory: number;
  variantId: string;
  tags: string[];
  metafields: {
    category?: string;
    rank?: number;
    badge?: string;
  };
}

interface CollectionRequest {
  collectionHandle: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Debug endpoint - check if request is for debugging
    if (req.url.includes('debug=true')) {
      const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
      const shopifyToken = Deno.env.get("SHOPIFY_STOREFRONT_API_TOKEN");
      
      return new Response(JSON.stringify({
        debug: true,
        secrets: {
          SHOPIFY_STORE_URL: shopifyStore ? 'SET' : 'NOT SET',
          'SHOPIFY_STOREFRONT_API_TOKEN': shopifyToken ? 'SET' : 'NOT SET'
        },
        allEnvKeys: Object.keys(Deno.env.toObject()).filter(key => key.includes('SHOPIFY'))
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { collectionHandle, limit = 20 }: CollectionRequest = await req.json();

    const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY STOREFRONT API TOKEN");
    
    console.log('Environment check:');
    console.log('SHOPIFY_STORE_URL:', shopifyStore ? 'SET' : 'NOT SET');
    console.log('SHOPIFY_STOREFRONT_API_TOKEN:', shopifyToken ? 'SET' : 'NOT SET');
    
    if (!shopifyStore || !shopifyToken) {
      console.log("Shopify credentials not configured, returning empty collection");
      return new Response(JSON.stringify({
        success: false,
        products: [],
        message: "Shopify not configured",
        debug: {
          store: shopifyStore ? 'SET' : 'NOT SET',
          token: shopifyToken ? 'SET' : 'NOT SET'
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopifyGraphQLUrl = `https://${cleanStoreUrl}/api/2024-01/graphql.json`;

    console.log(`Using Shopify GraphQL URL: ${shopifyGraphQLUrl}`);
    console.log(`Fetching products from collection: ${collectionHandle}`);
    console.log(`Shopify token length: ${shopifyToken ? shopifyToken.length : 'undefined'}`);

    console.log(`Attempting to fetch from Shopify with handle: ${collectionHandle}`);
    
    // Test what publications/channels are available
    const channelQuery = `
      query {
        publications(first: 10) {
          edges {
            node {
              id
              name
            }
          }
        }
        products(first: 5) {
          edges {
            node {
              id
              title
              status
              publishedAt
              publications(first: 10) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    
    console.log('Testing basic Shopify connection...');
    try {
      const testResponse = await fetch(shopifyGraphQLUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Storefront-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `query { shop { name } }`
        }),
      });
      
      console.log('Test response status:', testResponse.status);
      console.log('Test response headers:', JSON.stringify(Object.fromEntries(testResponse.headers.entries())));
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('Shopify test connection failed:', errorText);
        throw new Error(`Shopify connection test failed: ${testResponse.status} - ${errorText}`);
      }
      
      const testResult = await testResponse.json();
      console.log('Test connection result:', JSON.stringify(testResult));
    } catch (testError) {
      console.error('Connection test error:', testError);
      throw testError;
    }
    
    // GraphQL query to fetch all products first, then try specific collection
    let query;
    let variables;

    if (collectionHandle === 'gifts-all' || !collectionHandle) {
      // Get all products from the store - simplified query
      query = `
        query getAllProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                status
                availableForSale
                featuredImage {
                  url
                }
                tags
                variants(first: 10) {
                  edges {
                    node {
                      id
                      availableForSale
                      quantityAvailable
                      price {
                        amount
                      }
                      compareAtPrice {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      variables = { first: limit };
    } else {
      // Try to get products from specific collection
      query = `
        query getCollectionProducts($handle: String!, $first: Int!) {
          collectionByHandle(handle: $handle) {
            id
            title
            products(first: $first) {
              edges {
                node {
                  id
                  title
                  handle
                  featuredImage {
                    url
                  }
                  tags
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        availableForSale
                        quantityAvailable
                        price {
                          amount
                        }
                        compareAtPrice {
                          amount
                        }
                      }
                    }
                  }
                  metafields(identifiers: [
                    {namespace: "unwrapt", key: "category"},
                    {namespace: "unwrapt", key: "rank"},
                    {namespace: "unwrapt", key: "badge"}
                  ]) {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
        }
      `;
      variables = { handle: collectionHandle, first: limit };
    }

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    if (!response.ok) {
      console.error(`Failed to fetch from Shopify: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch collection: ${response.statusText}`);
    }

    const responseText = await response.text();
    console.log('Raw Shopify response:', responseText);
    
    let data, errors;
    try {
      const parsed = JSON.parse(responseText);
      data = parsed.data;
      errors = parsed.errors;
    } catch (parseError) {
      console.error('Failed to parse Shopify response:', parseError);
      throw new Error('Invalid JSON response from Shopify');
    }
    
    if (errors) {
      console.error('GraphQL errors:', errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    }

    console.log('Parsed data:', JSON.stringify(data, null, 2));

    let collection;
    let productsData;

    if (data?.collectionByHandle) {
      // We got a specific collection
      console.log('Using collection data');
      collection = data.collectionByHandle;
      productsData = collection.products;
    } else if (data?.products) {
      // We got all products
      console.log('Using all products data');
      collection = { title: 'All Products' };
      productsData = data.products;
    } else {
      console.log('No products found in response. Available keys:', Object.keys(data || {}));
      return new Response(JSON.stringify({
        success: false,
        products: [],
        message: `No products found`,
        debug: data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Processing ${productsData.edges.length} product edges`);
    const products: ShopifyProduct[] = [];

    for (const edge of productsData.edges) {
      const product = edge.node;
      
      // Get all variants (not just available ones)
      const allVariants = product.variants.edges.map((v: any) => v.node);

      console.log(`Product ${product.title}: ${allVariants.length} total variants`);

      if (allVariants.length === 0) {
        console.log(`Skipping ${product.title} - no variants`);
        continue;
      }

      // Get the first variant (regardless of availability)
      const firstVariant = allVariants[0];
      
      // Calculate total inventory (can be 0)
      const totalInventory = product.variants.edges
        .map((v: any) => v.node.quantityAvailable || 0)
        .reduce((sum: number, qty: number) => sum + qty, 0);

      // Process metafields
      const metafields: any = {};
      if (product.metafields) {
        for (const metafield of product.metafields) {
          if (metafield.namespace === 'unwrapt') {
            if (metafield.key === 'rank') {
              metafields.rank = parseInt(metafield.value) || 999;
            } else {
              metafields[metafield.key] = metafield.value;
            }
          }
        }
      }

      products.push({
        id: product.id,
        title: product.title,
        handle: product.handle,
        featuredImage: product.featuredImage?.url || null,
        price: parseFloat(firstVariant.price.amount),
        compareAtPrice: firstVariant.compareAtPrice ? parseFloat(firstVariant.compareAtPrice.amount) : null,
        availableForSale: firstVariant.availableForSale || false,
        totalInventory,
        variantId: firstVariant.id,
        tags: product.tags,
        metafields
      });
    }

    // Sort products by rank (ascending), then by inventory (descending), then by newest
    products.sort((a, b) => {
      const rankA = a.metafields.rank || 999;
      const rankB = b.metafields.rank || 999;
      
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      
      if (a.totalInventory !== b.totalInventory) {
        return b.totalInventory - a.totalInventory;
      }
      
      return 0; // Keep original order for same rank and inventory
    });

    console.log(`Found ${products.length} available products from query`);

    return new Response(JSON.stringify({
      success: true,
      products,
      collectionHandle: collectionHandle || 'all',
      collectionTitle: collection.title
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching Shopify collection:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      products: [],
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});