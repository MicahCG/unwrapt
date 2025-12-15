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
    const method4 = allEnv["STRIPE SECRET KEY"];   // with spaces instead of underscores
    
    console.log("Method 1 (Deno.env.get):", method1 ? `Found: ${method1.substring(0, 7)}...` : "Not found");
    console.log("Method 2 (allEnv object):", method2 ? `Found: ${method2.substring(0, 7)}...` : "Not found");
    console.log("Method 3 (with trailing space):", method3 ? `Found: ${method3.substring(0, 7)}...` : "Not found");
    console.log("Method 4 (with spaces):", method4 ? `Found: ${method4.substring(0, 7)}...` : "Not found");
    
    // Log the actual values (safely)
    console.log("Raw values check:");
    console.log("- method1 type:", typeof method1, "value:", method1 === null ? "null" : method1 === undefined ? "undefined" : method1 === "" ? "empty string" : "has value");
    console.log("- method2 type:", typeof method2, "value:", method2 === null ? "null" : method2 === undefined ? "undefined" : method2 === "" ? "empty string" : "has value");
    
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
        hasAnyStripeKey: stripeRelated.length > 0,
        secretDetails: {
          method1Found: !!method1,
          method2Found: !!method2,
          method3Found: !!method3,
          method4Found: !!method4,
          method1Type: typeof method1,
          method1IsEmpty: method1 === "",
          method1IsNull: method1 === null,
          method1IsUndefined: method1 === undefined
        }
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("🚨 Test error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: errorStack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});