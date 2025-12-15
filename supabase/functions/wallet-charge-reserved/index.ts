import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("💳 Starting wallet-charge-reserved function");

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

    console.log(`💳 Charging reserved funds for gift: ${scheduledGiftId}`);

    // Find the pending reservation
    const { data: reservation, error: reservationError } = await supabaseClient
      .from("wallet_transactions")
      .select("*")
      .eq("scheduled_gift_id", scheduledGiftId)
      .eq("transaction_type", "reservation")
      .eq("status", "pending")
      .single();

    if (reservationError || !reservation) {
      throw new Error("No pending reservation found for this gift");
    }

    const chargeAmount = Math.abs(reservation.amount);

    console.log(`💳 Charging amount: $${chargeAmount}`);

    // Get current balance
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("gift_wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const currentBalance = profile?.gift_wallet_balance || 0;
    const newBalance = currentBalance - chargeAmount;

    if (newBalance < 0) {
      throw new Error("Insufficient balance to complete charge");
    }

    // Update the transaction to completed charge
    const { error: updateTransactionError } = await supabaseClient
      .from("wallet_transactions")
      .update({
        transaction_type: "charge",
        status: "completed",
        balance_after: newBalance,
      })
      .eq("id", reservation.id);

    if (updateTransactionError) throw updateTransactionError;

    // Update user's wallet balance
    const { error: updateBalanceError } = await supabaseClient
      .from("profiles")
      .update({ gift_wallet_balance: newBalance })
      .eq("id", user.id);

    if (updateBalanceError) throw updateBalanceError;

    // Update gift payment status
    const { error: updateGiftError } = await supabaseClient
      .from("scheduled_gifts")
      .update({
        payment_status: "paid",
        payment_amount: chargeAmount,
      })
      .eq("id", scheduledGiftId);

    if (updateGiftError) throw updateGiftError;

    console.log(`✅ Charge completed: $${chargeAmount}, new balance: $${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        newBalance,
        chargedAmount: chargeAmount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("💳 Error in wallet-charge-reserved:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to charge reserved funds";
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
