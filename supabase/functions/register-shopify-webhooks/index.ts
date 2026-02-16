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
    const shopifyStoreUrl = Deno.env.get("SHOPIFY_STORE_URL");
    const shopifyToken = Deno.env.get("SHOPIFY_ADMIN_API_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!shopifyStoreUrl || !shopifyToken || !supabaseUrl) {
      throw new Error("Missing required environment variables");
    }

    const webhookEndpoint = `${supabaseUrl}/functions/v1/shopify-webhook`;

    // All webhook topics we need
    const requiredWebhooks = [
      { topic: "orders/cancelled", address: webhookEndpoint },
      { topic: "orders/fulfilled", address: webhookEndpoint },
      { topic: "products/create", address: webhookEndpoint },
      { topic: "products/update", address: webhookEndpoint },
      { topic: "products/delete", address: webhookEndpoint },
      { topic: "inventory_levels/update", address: webhookEndpoint },
      { topic: "collections/update", address: webhookEndpoint },
    ];

    // Clean the store URL and ensure https://
    let storeUrl = shopifyStoreUrl.replace(/\/+$/, "");
    if (!storeUrl.startsWith("http")) {
      storeUrl = `https://${storeUrl}`;
    }
    const apiBase = `${storeUrl}/admin/api/2024-01/webhooks.json`;
    const apiList = `${storeUrl}/admin/api/2024-01/webhooks.json`;

    // Get existing webhooks
    const existingRes = await fetch(apiList, {
      headers: {
        "X-Shopify-Access-Token": shopifyToken,
        "Content-Type": "application/json",
      },
    });

    if (!existingRes.ok) {
      const errText = await existingRes.text();
      throw new Error(`Failed to list webhooks: ${existingRes.status} - ${errText}`);
    }

    const existingData = await existingRes.json();
    const existingWebhooks = existingData.webhooks || [];

    console.log(`📋 Found ${existingWebhooks.length} existing webhooks`);

    const results: any[] = [];

    for (const wh of requiredWebhooks) {
      // Check if already registered
      const existing = existingWebhooks.find(
        (e: any) => e.topic === wh.topic && e.address === wh.address
      );

      if (existing) {
        console.log(`✅ Already registered: ${wh.topic}`);
        results.push({ topic: wh.topic, status: "already_exists", id: existing.id });
        continue;
      }

      // Register new webhook
      console.log(`📝 Registering: ${wh.topic}`);
      const createRes = await fetch(apiBase, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": shopifyToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            topic: wh.topic,
            address: wh.address,
            format: "json",
          },
        }),
      });

      const createBody = await createRes.text();

      if (createRes.ok) {
        const created = JSON.parse(createBody);
        console.log(`✅ Registered: ${wh.topic} (ID: ${created.webhook?.id})`);
        results.push({ topic: wh.topic, status: "created", id: created.webhook?.id });
      } else {
        console.error(`❌ Failed to register ${wh.topic}: ${createBody}`);
        results.push({ topic: wh.topic, status: "error", error: createBody });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      endpoint: webhookEndpoint,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Webhook registration error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
