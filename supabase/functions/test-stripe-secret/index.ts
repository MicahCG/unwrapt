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
    console.log("🧪 Testing Stripe secret access...");
    
    // Get all environment variables
    const allEnv = Deno.env.toObject();
    console.log("🔍 All environment variable keys:", Object.keys(allEnv));
    
    // Test different ways to access the secret
    const method1 = Deno.env.get("STRIPE_SECRET_KEY");
    const method2 = allEnv["STRIPE_SECRET_KEY"];
    const method3 = allEnv["STRIPE_SECRET_KEY "];  // with trailing space
    
    console.log("Method 1 (Deno.env.get):", method1 ? "Found" : "Not found");
    console.log("Method 2 (allEnv object):", method2 ? "Found" : "Not found");
    console.log("Method 3 (with space):", method3 ? "Found" : "Not found");
    
    // Check if any environment variables contain "STRIPE"
    const stripeRelated = Object.keys(allEnv).filter(key => 
      key.toLowerCase().includes('stripe')
    );
    console.log("🔍 Stripe-related env vars:", stripeRelated);
    
    // Return detailed diagnostic info
    return new Response(JSON.stringify({
      success: true,
      diagnostics: {
        totalEnvVars: Object.keys(allEnv).length,
        stripeSecretFound: !!method1,
        stripeRelatedKeys: stripeRelated,
        hasAnyStripeKey: stripeRelated.length > 0
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("🚨 Test error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});