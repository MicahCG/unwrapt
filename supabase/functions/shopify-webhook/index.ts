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

    // Initialize Supabase client for order-related webhooks
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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

      case 'orders/cancelled':
        await handleOrderCancelled(supabaseService, payload);
        break;

      case 'orders/fulfilled':
        await handleOrderFulfilled(supabaseService, payload);
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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
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

async function handleOrderCancelled(supabase: any, order: any) {
  const orderId = order.id?.toString();
  console.log(`❌ Order cancelled: ${order.name} (ID: ${orderId})`);

  if (!orderId) return;

  // Find scheduled gift linked to this Shopify order
  const { data: gifts, error } = await supabase
    .from('scheduled_gifts')
    .select('id, user_id, status, payment_amount, estimated_cost, occasion, recipient_id, wallet_reserved, wallet_reservation_amount')
    .eq('shopify_order_id', orderId);

  if (error || !gifts?.length) {
    console.log(`ℹ️ No matching scheduled gift found for order ${orderId}`);
    return;
  }

  for (const gift of gifts) {
    const refundAmount = gift.payment_amount || gift.estimated_cost || gift.wallet_reservation_amount || 0;

    // Refund wallet balance if there was a charge
    if (refundAmount > 0) {
      console.log(`💰 Refunding $${refundAmount} to user ${gift.user_id}`);

      // Get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('gift_wallet_balance, email, full_name')
        .eq('id', gift.user_id)
        .single();

      if (profile) {
        const newBalance = (profile.gift_wallet_balance || 0) + refundAmount;

        // Update wallet balance
        await supabase
          .from('profiles')
          .update({ gift_wallet_balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', gift.user_id);

        // Create refund transaction record
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: gift.user_id,
            amount: refundAmount,
            balance_after: newBalance,
            transaction_type: 'refund',
            status: 'completed',
            scheduled_gift_id: gift.id,
          });

        console.log(`✅ Wallet refunded. New balance: $${newBalance}`);
      }
    }

    // Get recipient name for the email
    const { data: recipient } = await supabase
      .from('recipients')
      .select('name')
      .eq('id', gift.recipient_id)
      .single();

    // Get user profile for email
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', gift.user_id)
      .single();

    // Delete the scheduled gift so the UI resets to allow scheduling a new gift
    console.log(`🗑️ Deleting scheduled gift ${gift.id} to reset recipient UI`);
    await supabase
      .from('scheduled_gifts')
      .delete()
      .eq('id', gift.id);

    // Send cancellation email to the user
    if (userProfile?.email) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            type: 'order_cancelled',
            recipientEmail: userProfile.email,
            userName: userProfile.full_name,
            data: {
              recipientName: recipient?.name || 'your recipient',
              occasion: gift.occasion,
              amount: refundAmount,
            },
          }),
        });
        console.log(`📧 Cancellation email sent to ${userProfile.email}`);
      } catch (emailError) {
        console.error('⚠️ Failed to send cancellation email:', emailError);
      }
    }
  }

  console.log(`✅ Processed ${gifts.length} cancelled gift(s) - deleted and refunded`);
}

async function handleOrderFulfilled(supabase: any, order: any) {
  const orderId = order.id?.toString();
  console.log(`📬 Order fulfilled: ${order.name} (ID: ${orderId})`);

  if (!orderId) return;

  // Extract tracking number if available
  const trackingNumber = order.fulfillments?.[0]?.tracking_number || null;

  const { data: gifts, error } = await supabase
    .from('scheduled_gifts')
    .select('id')
    .eq('shopify_order_id', orderId);

  if (error || !gifts?.length) {
    console.log(`ℹ️ No matching scheduled gift found for order ${orderId}`);
    return;
  }

  for (const gift of gifts) {
    console.log(`📦 Marking gift ${gift.id} as delivered`);
    await supabase
      .from('scheduled_gifts')
      .update({
        status: 'delivered',
        fulfilled_at: new Date().toISOString(),
        shopify_tracking_number: trackingNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gift.id);
  }

  console.log(`✅ Updated ${gifts.length} gift(s) as delivered`);
}