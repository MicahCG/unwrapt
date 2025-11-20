import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic",
};

// Simple in-memory cache invalidation
// In production, you'd use Redis or similar
const invalidateCache = async (cacheKey: string) => {
  console.log(`🗑️ Invalidating cache for: ${cacheKey}`);
  // This is a placeholder - in a real implementation you'd
  // invalidate specific React Query cache keys
};

// Verify Shopify webhook HMAC signature
async function verifyShopifyWebhook(
  body: string, 
  hmacHeader: string, 
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    // Timing-safe comparison
    return computedHmac === hmacHeader;
  } catch (error) {
    console.error('❌ HMAC verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const topic = req.headers.get('x-shopify-topic');
    const hmac = req.headers.get('x-shopify-hmac-sha256');
    
    if (!topic) {
      throw new Error('Missing webhook topic');
    }

    console.log(`📦 Received Shopify webhook: ${topic}`);

    // Verify webhook HMAC signature
    const webhookSecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ SHOPIFY_WEBHOOK_SECRET not configured');
      return new Response(JSON.stringify({ 
        error: 'Webhook not configured' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!hmac) {
      console.error('❌ Missing HMAC signature');
      return new Response(JSON.stringify({ 
        error: 'Invalid request' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get raw body for verification
    const body = await req.text();
    const isValid = await verifyShopifyWebhook(body, hmac, webhookSecret);
    
    if (!isValid) {
      console.error('❌ Invalid HMAC signature');
      return new Response(JSON.stringify({ 
        error: 'Invalid signature' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log('✅ Webhook signature verified');
    const payload = JSON.parse(body);

    // Handle different webhook types
    switch (topic) {
      case 'products/create':
      case 'products/update':
      case 'products/delete':
        await handleProductChange(payload, topic);
        break;
      
      case 'inventory_levels/update':
        await handleInventoryChange(payload);
        break;
      
      case 'collections/update':
        await handleCollectionChange(payload);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook topic: ${topic}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      topic,
      processed: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleProductChange(product: any, action: string) {
  console.log(`🏷️ Product ${action}: ${product.title} (ID: ${product.id})`);
  
  // Invalidate collection caches that might contain this product
  const tags = product.tags ? product.tags.split(', ') : [];
  
  if (tags.includes('unwrapt')) {
    await invalidateCache('shopify-collection:gifts-all');
    
    // Invalidate specific collections based on tags
    if (tags.includes('candle')) {
      await invalidateCache('shopify-collection:gifts-candles');
    }
    if (tags.includes('chocolate')) {
      await invalidateCache('shopify-collection:gifts-chocolate');
    }
    if (tags.includes('coffee')) {
      await invalidateCache('shopify-collection:gifts-coffee');
    }
  }
}

async function handleInventoryChange(inventoryLevel: any) {
  console.log(`📦 Inventory updated for variant ${inventoryLevel.variant_id}: ${inventoryLevel.available}`);
  
  // Invalidate all collection caches since inventory affects availability
  await invalidateCache('shopify-collection:gifts-all');
  await invalidateCache('shopify-collection:gifts-candles');
  await invalidateCache('shopify-collection:gifts-chocolate');
  await invalidateCache('shopify-collection:gifts-coffee');
}

async function handleCollectionChange(collection: any) {
  console.log(`📁 Collection updated: ${collection.title} (Handle: ${collection.handle})`);
  
  // Invalidate specific collection cache
  await invalidateCache(`shopify-collection:${collection.handle}`);
}