import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_FEE = 7; // $7 service fee

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("💰 Starting wallet-reserve-funds function");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("User not authenticated");

    const body = await req.json();
    const { scheduledGiftId } = body;

    if (!scheduledGiftId) {
      throw new Error("Scheduled gift ID is required");
    }

    console.log(`💰 Reserving funds for gift: ${scheduledGiftId}`);

    // Get gift details
    const { data: gift, error: giftError } = await supabaseClient
      .from("scheduled_gifts")
      .select("*, recipients(*)")
      .eq("id", scheduledGiftId)
      .single();

    if (giftError || !gift) throw new Error("Gift not found");

    // Calculate cost (get price from gift_type variant or use default)
    const giftPrice = gift.payment_amount || 35; // Default to $35 if not set
    const totalCost = giftPrice + SERVICE_FEE;

    console.log(`💰 Total cost: $${totalCost} (gift: $${giftPrice} + service: $${SERVICE_FEE})`);

    // Get user's current balance
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("gift_wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const currentBalance = profile?.gift_wallet_balance || 0;

    // Get pending reservations
    const { data: pendingReservations } = await supabaseClient
      .from("wallet_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("transaction_type", "reservation")
      .eq("status", "pending");

    const totalReserved = pendingReservations?.reduce(
      (sum, t) => sum + Math.abs(t.amount),
      0
    ) || 0;

    const availableBalance = currentBalance - totalReserved;

    console.log(`💰 Balance check: current=$${currentBalance}, reserved=$${totalReserved}, available=$${availableBalance}`);

    // Check if sufficient funds
    if (availableBalance < totalCost) {
      console.log("❌ Insufficient funds");
      return new Response(
        JSON.stringify({
          success: false,
          error: "insufficient_funds",
          currentBalance,
          requiredAmount: totalCost,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create reservation transaction
    const { error: transactionError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        scheduled_gift_id: scheduledGiftId,
        amount: -totalCost, // Negative for reservation
        balance_after: currentBalance, // Don't deduct yet
        transaction_type: "reservation",
        status: "pending",
      });

    if (transactionError) throw transactionError;

    // Update scheduled gift
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({
        wallet_reserved: true,
        wallet_reservation_amount: totalCost,
      })
      .eq("id", scheduledGiftId);

    if (updateError) throw updateError;

    console.log(`✅ Funds reserved successfully: $${totalCost}`);

    return new Response(
      JSON.stringify({
        success: true,
        reservedAmount: totalCost,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("💰 Error in wallet-reserve-funds:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to reserve funds";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
