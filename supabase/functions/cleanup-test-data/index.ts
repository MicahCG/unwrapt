
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Cleanup-test-data: Function started');
    
    // Use service role to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json();
    console.log('🧹 Cleanup-test-data: Request body:', requestBody);

    const { testGiftId, testRecipientId } = requestBody;

    if (!testGiftId || !testRecipientId) {
      throw new Error("Missing test data IDs for cleanup");
    }

    console.log('🧹 Deleting test gift...');
    const { error: giftError } = await supabaseService
      .from('scheduled_gifts')
      .delete()
      .eq('id', testGiftId);

    if (giftError) {
      console.error('❌ Failed to delete test gift:', giftError);
    }

    console.log('🧹 Deleting test recipient...');
    const { error: recipientError } = await supabaseService
      .from('recipients')
      .delete()
      .eq('id', testRecipientId);

    if (recipientError) {
      console.error('❌ Failed to delete test recipient:', recipientError);
    }

    console.log('✅ Test data cleanup completed');

    return new Response(JSON.stringify({
      success: true,
      message: "Test data cleaned up successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred',
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
