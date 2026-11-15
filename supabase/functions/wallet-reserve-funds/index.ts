import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";
import { planReserveFunds, roundMoney } from "../_shared/reservedFunds.ts";
import { quoteGoodyOrderPrice } from "../_shared/goodyPricing.ts";

const goodyApiKey = () =>
  (Deno.env.get("GOODY_API_ENV") === "production" ? Deno.env.get("GOODY_PRODUCTION_COMMERCE_API_KEY") : Deno.env.get("GOODY_SANDBOX_COMMERCE_API_KEY")) ?? null;
const goodyEnvironment = () => (Deno.env.get("GOODY_API_ENV") === "production" ? "production" : "sandbox") as "production" | "sandbox";

/**
 * Adds Goody's real shipping + tax for this gift on top of its catalog price, so what's held
 * (and later charged) isn't just a guess - the $7 Unwrapt service fee still applies on top of
 * that via planReserveFunds below. Falls back to the catalog price alone (unchanged, prior
 * behavior) whenever a real quote isn't available: no product/address yet, a non-US address
 * (Goody's price endpoint is US-only today), or the Goody call itself fails.
 */
const priceWithRealShippingAndTax = async (
  basePrice: number,
  gift: { gift_variant_id?: string | null },
  recipient: { name?: string | null; street?: string | null; apartment?: string | null; city?: string | null; state?: string | null; zip_code?: string | null; country?: string | null } | null,
): Promise<{ price: number; shippingCost: number; taxCost: number }> => {
  const apiKey = goodyApiKey();
  if (!apiKey || !gift.gift_variant_id || !recipient?.street || !recipient?.city || !recipient?.state || !recipient?.zip_code) {
    return { price: basePrice, shippingCost: 0, taxCost: 0 };
  }
  const [firstName, ...rest] = (recipient.name || "").trim().split(/\s+/);
  const quote = await quoteGoodyOrderPrice({
    apiKey,
    environment: goodyEnvironment(),
    productId: gift.gift_variant_id,
    recipient: {
      firstName,
      lastName: rest.join(" "),
      street: recipient.street,
      apartment: recipient.apartment,
      city: recipient.city,
      state: recipient.state,
      zipCode: recipient.zip_code,
      country: recipient.country,
    },
  });
  if (!quote) return { price: basePrice, shippingCost: 0, taxCost: 0 };
  console.log(`💰 Real Goody quote: shipping=$${quote.shippingCost}, tax=$${quote.taxCost}, processingFee=$${quote.processingFeeCost} (not passed on to the customer)`);
  return {
    price: roundMoney(basePrice + quote.shippingCost + quote.taxCost),
    shippingCost: quote.shippingCost,
    taxCost: quote.taxCost,
  };
};

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
    // `approve`: the user approved this gift (e.g. in Thea's chat), so once funds are held the
    // automation lifecycle may charge and order it in its window.
    const { scheduledGiftId, approve = false } = body;

    if (!scheduledGiftId) {
      throw new Error("Scheduled gift ID is required");
    }

    console.log(`💰 Reserving funds for gift: ${scheduledGiftId}`);

    const { data: gift, error: giftError } = await supabaseClient
      .from("scheduled_gifts")
      .select("*, recipients(*)")
      .eq("id", scheduledGiftId)
      .eq("user_id", user.id)
      .single();

    if (giftError || !gift) throw new Error("Gift not found");

    const catalogPrice = Number(gift.payment_amount ?? gift.estimated_cost) || 35;
    const recipientRow = Array.isArray(gift.recipients) ? gift.recipients[0] : gift.recipients;
    const { price: giftPrice, shippingCost, taxCost } = await priceWithRealShippingAndTax(catalogPrice, gift, recipientRow ?? null);
    if (shippingCost || taxCost) {
      console.log(`💰 Gift price with real shipping+tax: catalog=$${catalogPrice} shipping=$${shippingCost} tax=$${taxCost} -> $${giftPrice}`);
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("gift_wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    const currentBalance = Number(profile?.gift_wallet_balance) || 0;

    const { data: pendingReservations } = await supabaseClient
      .from("wallet_transactions")
      .select("id, amount, scheduled_gift_id")
      .eq("user_id", user.id)
      .eq("transaction_type", "reservation")
      .eq("status", "pending");

    const rows = (pendingReservations || []) as Array<{
      id: string;
      amount: number;
      scheduled_gift_id: string | null;
    }>;

    const existing = rows.find((row) => row.scheduled_gift_id === scheduledGiftId) || null;
    const existingAmount = existing ? Math.abs(Number(existing.amount) || 0) : 0;
    const otherReserved = rows
      .filter((row) => !existing || row.id !== existing.id)
      .reduce((sum, row) => sum + Math.abs(Number(row.amount) || 0), 0);

    const plan = planReserveFunds({
      grossBalance: currentBalance,
      otherReserved,
      existingReserved: existingAmount,
      giftPrice,
    });

    console.log(
      `💰 Balance check: current=$${currentBalance}, otherReserved=$${otherReserved}, transferable=$${existingAmount}, cost=$${plan.cost}, shortfall=$${plan.shortfall}`,
    );

    // Exact hold already in place — nothing to move.
    if (
      gift.wallet_reserved &&
      existing &&
      Math.abs(existingAmount - plan.cost) <= 0.009
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          reservedAmount: existingAmount,
          alreadyReserved: true,
          transferredFromReserved: existingAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    if (!plan.covered) {
      console.log("❌ Insufficient funds (after transferable reserved)");
      return new Response(
        JSON.stringify({
          success: false,
          error: "insufficient_funds",
          currentBalance,
          requiredAmount: plan.cost,
          available: plan.available,
          transferableReserved: plan.existingReserved,
          shortfall: plan.shortfall,
          priceBreakdown: { catalogPrice, shippingCost, taxCost },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    if (existing) {
      const { error: updateTxnError } = await supabaseClient
        .from("wallet_transactions")
        .update({
          amount: -plan.cost,
          balance_after: currentBalance,
        })
        .eq("id", existing.id)
        .eq("status", "pending");
      if (updateTxnError) throw updateTxnError;
    } else {
      const { error: transactionError } = await supabaseClient
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          scheduled_gift_id: scheduledGiftId,
          amount: -plan.cost,
          balance_after: currentBalance,
          transaction_type: "reservation",
          status: "pending",
        });
      if (transactionError) throw transactionError;
    }

    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({
        wallet_reserved: true,
        wallet_reservation_amount: plan.cost,
        ...(approve
          ? { automation_enabled: true, status: gift.status === "scheduled" ? "approved" : gift.status }
          : {}),
      })
      .eq("id", scheduledGiftId);

    if (updateError) throw updateError;

    console.log(
      `✅ Funds reserved: $${plan.cost}` +
        (existingAmount > 0.009 ? ` (reallocated $${existingAmount})` : ""),
    );

    return new Response(
      JSON.stringify({
        success: true,
        reservedAmount: plan.cost,
        transferredFromReserved: existingAmount > 0.009 ? roundMoney(existingAmount) : 0,
        reallocated: Boolean(existing),
        // Breakdown for callers that want to show it - gift + real shipping + real tax + the
        // flat service fee all add up to reservedAmount above.
        priceBreakdown: { catalogPrice, shippingCost, taxCost },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
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
      },
    );
  }
});
