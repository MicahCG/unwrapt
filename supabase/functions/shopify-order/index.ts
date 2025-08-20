
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Remove legacy hardcoded variants - using fully dynamic selection now

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
    
    // Check environment variables
    const shopifyStoreUrl = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    const shopifyStorefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_API_TOKEN");
    
    console.log("🔍 Environment check:");
    console.log("SHOPIFY_STORE_URL:", !!shopifyStoreUrl);
    console.log("SHOPIFY_ADMIN_API_TOKEN:", !!shopifyToken);
    console.log("SHOPIFY_STOREFRONT_API_TOKEN:", !!shopifyStorefrontToken);
    
    if (!shopifyStoreUrl || !shopifyToken || !shopifyStorefrontToken) {
      throw new Error("Missing required Shopify environment variables");
    }

    // For test mode, create mock data if gift doesn't exist
    let giftData;
    if (testMode) {
      console.log('🧪 Test mode: Creating mock gift data...');
      giftData = {
        id: scheduledGiftId,
        user_id: 'test-user-id',
        occasion: 'Test Birthday',
        occasion_date: '2024-12-25',
        payment_status: 'paid',
        status: 'scheduled',
        gift_type: 'Test Gift',
        price_range: '$25-50',
        recipients: {
          name: 'Test Recipient',
          email: 'test@example.com',
          interests: ['coffee', 'chocolate'],
          street: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip_code: '12345',
          country: 'US'
        }
      };
    } else {
      // Get the scheduled gift details - for live mode, require payment confirmation
      const giftQuery = supabaseService
        .from('scheduled_gifts')
        .select(`
          *,
          recipients (name, email, phone, street, city, state, zip_code, country, interests)
        `)
        .eq('id', scheduledGiftId)
        .eq('payment_status', 'paid');

      const { data: giftQueryData, error: giftError } = await giftQuery.single();

      if (giftError || !giftQueryData) {
        console.error('❌ Gift query error:', giftError);
        throw new Error("Gift not found or payment not confirmed");
      }
      giftData = giftQueryData;
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

    console.log('🔍 Environment check:');
    console.log(`SHOPIFY_ADMIN_API_TOKEN: ${!!Deno.env.get("SHOPIFY_ADMIN_API_TOKEN")}`);
    console.log(`SHOPIFY_STOREFRONT_API_TOKEN: ${!!Deno.env.get("SHOPIFY_STOREFRONT_API_TOKEN")}`);
    console.log(`SHOPIFY_STORE_URL: ${!!Deno.env.get("SHOPIFY_STORE_URL")}`);

    console.log(`🎁 Gift data:`, JSON.stringify({
      id: giftData.id,
      recipient: giftData.recipients?.name,
      interests: giftData.recipients?.interests,
      price_range: giftData.price_range,
      gift_type: giftData.gift_type,
      payment_status: giftData.payment_status,
      testMode
    }, null, 2));

    // Product selection variables
    let selectedVariantId;
    let matchReason = 'default';
    let productName = 'Gift Item';

    // Try to get products dynamically from Shopify collections
    try {
      const dynamicProduct = await selectProductFromInterests(
        giftData.recipients?.interests || [],
        giftData.gift_type
      );
      
      if (dynamicProduct) {
        selectedVariantId = dynamicProduct.variantId;
        matchReason = dynamicProduct.matchReason;
        productName = dynamicProduct.title;
        console.log(`🎯 Selected dynamic product: ${productName} (${matchReason})`);
      } else {
        console.log('⚠️ No dynamic product found, trying gifts-all collection');
        // Try the default gifts-all collection as fallback
        const fallbackProduct = await selectProductFromInterests([], undefined);
        if (fallbackProduct) {
          selectedVariantId = fallbackProduct.variantId;
          matchReason = 'fallback - gifts-all collection';
          productName = fallbackProduct.title;
          console.log(`🎯 Selected fallback product: ${productName}`);
        } else {
          throw new Error('No products available in any collection');
        }
      }
    } catch (error) {
      console.error('❌ Error in product selection:', error);
      throw new Error(`Product selection failed: ${error.message}`);
    }

    if (!selectedVariantId) {
      throw new Error('No product variant selected - unable to create order');
    }

    // Default product price - will be updated if we can fetch from Shopify
    let variantPrice = "25.00";

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
  // Get Shopify configuration
  const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
  const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
  
  if (!shopifyStore || !shopifyToken) {
    throw new Error("Shopify credentials not configured for live orders");
  }

  const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;

  console.log(`🛒 Creating order via: ${shopifyApiUrl}/orders.json`);
  console.log(`🎯 Using variant ID: ${selectedVariantId}`);

  // First, validate the variant exists and get its price
  let variantPrice = "25.00"; // Default fallback
  
  try {
    console.log(`🔍 Validating variant ID: ${selectedVariantId}`);
    
    const variantResponse = await fetch(`${shopifyApiUrl}/variants/${selectedVariantId}.json`, {
      headers: {
        'X-Shopify-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
    });

    if (!variantResponse.ok) {
      const errorText = await variantResponse.text();
      console.error(`❌ Variant ${selectedVariantId} not found:`, errorText);
      
      if (variantResponse.status === 404) {
        throw new Error(`Product variant ${selectedVariantId} not found in Shopify store. Please check your product setup.`);
      }
      throw new Error(`Failed to validate variant ${selectedVariantId}: ${errorText}`);
    }

    const { variant } = await variantResponse.json();
    variantPrice = variant.price;
    
    console.log(`✅ Variant validated:`, {
      id: variant.id,
      title: variant.title,
      price: variant.price,
      available: variant.available,
      inventory_quantity: variant.inventory_quantity
    });

    // Check if variant is available
    if (!variant.available) {
      throw new Error(`Product variant ${selectedVariantId} is not available for sale`);
    }

  } catch (variantError) {
    console.error('❌ Error validating variant:', variantError);
    throw variantError;
  }

  // Create the order with proper price
  const orderData = {
    order: {
      line_items: [
        {
          variant_id: selectedVariantId,
          quantity: 1,
          price: variantPrice, // 🔥 This was missing and causing the error!
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
      financial_status: "paid",
      send_receipt: false, // Don't send Shopify receipt to customer
      send_fulfillment_receipt: false, // Don't send fulfillment receipt
    }
  };

  console.log(`🛒 Creating order with data:`, JSON.stringify(orderData, null, 2));

  const orderResponse = await fetch(`${shopifyApiUrl}/orders.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': shopifyToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  console.log(`🛒 Shopify API response status: ${orderResponse.status}`);

  if (!orderResponse.ok) {
    const errorData = await orderResponse.text();
    console.error('❌ Shopify order creation failed:');
    console.error('❌ Status:', orderResponse.status);
    console.error('❌ Response:', errorData);
    console.error('❌ Request data that failed:', JSON.stringify(orderData, null, 2));
    
    // Try to parse the error for more details
    try {
      const parsedError = JSON.parse(errorData);
      console.error('❌ Parsed Shopify error:', JSON.stringify(parsedError, null, 2));
      
      if (parsedError.errors) {
        throw new Error(`Shopify API error: ${JSON.stringify(parsedError.errors)}`);
      }
    } catch (parseError) {
      console.error('❌ Could not parse Shopify error response');
    }
    
    throw new Error(`Failed to create Shopify order: ${orderResponse.status} - ${errorData}`);
  }

  const { order } = await orderResponse.json();
  orderResult = order;
  console.log(`✅ Successfully created Shopify order: ${order.name} (ID: ${order.id})`);
}

    // Get product image URL based on selected variant
    let productImageUrl = null;
    
    // First try to get actual Shopify product images for live orders
    if (!testMode && orderResult && orderResult.line_items && orderResult.line_items.length > 0) {
      try {
        const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
        const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
        const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const shopifyApiUrl = `https://${cleanStoreUrl}/admin/api/2024-01`;
        
        // Get the product ID from the order line item
        const lineItem = orderResult.line_items[0];
        if (lineItem.product_id) {
          console.log(`🖼️ Fetching product image for product ID: ${lineItem.product_id}`);
          
          const productResponse = await fetch(`${shopifyApiUrl}/products/${lineItem.product_id}.json`, {
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
              'Content-Type': 'application/json',
            },
          });
          
          if (productResponse.ok) {
            const { product } = await productResponse.json();
            if (product.images && product.images.length > 0) {
              productImageUrl = product.images[0].src;
              console.log(`✅ Retrieved product image: ${productImageUrl}`);
            }
          }
        }
      } catch (imageError) {
        console.error('⚠️ Error fetching product image:', imageError);
      }
    }
    
     // Get product image URL from Shopify if possible
     if (!productImageUrl && !testMode) {
       productImageUrl = "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop";
       console.log(`📷 Using default fallback image: ${productImageUrl}`);
     }

    // Update the scheduled gift with order information (only if not test mode with mock data)
    if (!testMode || giftData.id !== scheduledGiftId) {
      const giftDescription = `${giftData.gift_description || ''} | Product: ${productName} | Variant ID: ${selectedVariantId} | Match: ${matchReason}${testMode ? ' | TEST MODE' : ''} | Shopify Order: ${orderResult.name}`;
      
      const updateData = {
        status: testMode ? 'test-ordered' : 'ordered',
        updated_at: new Date().toISOString(),
        gift_description: giftDescription.substring(0, 500),
        ...(productImageUrl && { gift_image_url: productImageUrl })
      };
      
      const { error: updateError } = await supabaseService
        .from('scheduled_gifts')
        .update(updateData)
        .eq('id', scheduledGiftId);

      if (updateError) {
        console.error('❌ Error updating gift status:', updateError);
      } else {
        console.log(`✅ Updated gift status to ${testMode ? 'test-ordered' : 'ordered'}${productImageUrl ? ' with product image' : ''}`);
      }
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
      trackingUrl: testMode ? null : `https://${Deno.env.get("SHOPIFY_STORE_URL")}/admin/orders/${orderResult.id}`
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

// Dynamic product selection function
async function selectProductFromInterests(interests: string[], giftType?: string) {
  const shopifyStore = Deno.env.get("SHOPIFY_STORE_URL");
  const shopifyToken = Deno.env.get("SHOPIFY_STOREFRONT_API_TOKEN");
  
  if (!shopifyStore || !shopifyToken) {
    console.log('⚠️ Shopify Storefront API not configured');
    return null;
  }

  const cleanStoreUrl = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const shopifyGraphQLUrl = `https://${cleanStoreUrl}/api/2024-01/graphql.json`;

  // Map interests to collection handles
  const interestCollectionMap: Record<string, string> = {
    'candles': 'gifts-candles',
    'chocolate': 'gifts-chocolate',
    'coffee': 'gifts-coffee'
  };

  // Determine which collection to query
  let collectionHandle = 'gifts-all'; // default
  let matchReason = 'default collection';

  // Check gift type first
  if (giftType) {
    const giftTypeLower = giftType.toLowerCase();
    for (const [interest, handle] of Object.entries(interestCollectionMap)) {
      if (giftTypeLower.includes(interest)) {
        collectionHandle = handle;
        matchReason = `gift type: ${giftType}`;
        break;
      }
    }
  }

  // If no gift type match, check interests
  if (collectionHandle === 'gifts-all' && interests.length > 0) {
    for (const interest of interests) {
      const interestLower = interest.toLowerCase();
      for (const [key, handle] of Object.entries(interestCollectionMap)) {
        if (interestLower.includes(key)) {
          collectionHandle = handle;
          matchReason = `recipient interest: ${interest}`;
          break;
        }
      }
      if (collectionHandle !== 'gifts-all') break;
    }
  }

  console.log(`🔍 Querying collection: ${collectionHandle} (${matchReason})`);

  try {
    const query = `
      query getCollectionProducts($handle: String!) {
        collectionByHandle(handle: $handle) {
          products(first: 10) {
            edges {
              node {
                id
                title
                handle
                variants(first: 10) {
                  edges {
                    node {
                      id
                      availableForSale
                      quantityAvailable
                      price {
                        amount
                      }
                    }
                  }
                }
                metafields(identifiers: [
                  {namespace: "unwrapt", key: "rank"}
                ]) {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(shopifyGraphQLUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': shopifyToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { handle: collectionHandle }
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const { data, errors } = await response.json();
    
    if (errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    }

    if (!data?.collectionByHandle?.products?.edges?.length) {
      console.log(`No products found in collection: ${collectionHandle}`);
      return null;
    }

    // Find the best available product
    const products = data.collectionByHandle.products.edges
      .map((edge: any) => edge.node)
      .filter((product: any) => {
        // Must have available variants
        const availableVariants = product.variants.edges
          .map((v: any) => v.node)
          .filter((variant: any) => variant.availableForSale && variant.quantityAvailable > 0);
        return availableVariants.length > 0;
      })
      .map((product: any) => {
        // Get first available variant
        const firstAvailableVariant = product.variants.edges
          .map((v: any) => v.node)
          .find((variant: any) => variant.availableForSale && variant.quantityAvailable > 0);

        // Get rank from metafields
        const rankMetafield = product.metafields.find((m: any) => m.key === 'rank');
        const rank = rankMetafield ? parseInt(rankMetafield.value) || 999 : 999;

        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          variantId: firstAvailableVariant.id,
          price: parseFloat(firstAvailableVariant.price.amount),
          rank,
          inventory: firstAvailableVariant.quantityAvailable
        };
      })
      .sort((a: any, b: any) => {
        // Sort by rank (ascending), then by inventory (descending)
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.inventory - a.inventory;
      });

    if (products.length === 0) {
      console.log(`No available products found in collection: ${collectionHandle}`);
      return null;
    }

    const selectedProduct = products[0];
    console.log(`✅ Selected product: ${selectedProduct.title} (rank: ${selectedProduct.rank}, inventory: ${selectedProduct.inventory})`);

    return {
      ...selectedProduct,
      matchReason
    };

  } catch (error) {
    console.error(`❌ Error fetching from collection ${collectionHandle}:`, error);
    return null;
  }
}

