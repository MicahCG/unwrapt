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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { giftId } = await req.json();

    if (!giftId) {
      throw new Error("Gift ID is required");
    }

    // Get the gift and verify ownership
    const { data: gift, error: giftError } = await supabaseClient
      .from("scheduled_gifts")
      .select(`
        *,
        recipients!inner(
          name,
          street,
          city,
          state,
          zip_code,
          country
        ),
        profiles:user_id(email, full_name)
      `)
      .eq("id", giftId)
      .eq("user_id", user.id)
      .single();

    if (giftError || !gift) {
      throw new Error("Gift not found or access denied");
    }

    if (gift.fulfilled_at) {
      throw new Error("Gift already confirmed");
    }

    if (!gift.wallet_reserved) {
      throw new Error("Funds must be reserved before confirming");
    }

    // Check if address is complete
    const recipient = gift.recipients as any;
    const isAddressComplete = !!(
      recipient?.street &&
      recipient?.city &&
      recipient?.state &&
      recipient?.zip_code &&
      recipient?.country
    );

    // Update gift as confirmed
    const updateData: any = {
      status: 'confirmed',
    };

    // If address is complete, mark it as confirmed too
    if (isAddressComplete && !gift.address_confirmed_at) {
      updateData.address_confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update(updateData)
      .eq("id", giftId);

    if (updateError) {
      throw updateError;
    }

    // If both gift and address are confirmed, trigger fulfillment immediately
    const shouldFulfillNow = isAddressComplete && gift.wallet_reserved && gift.payment_status === 'unpaid';
    
    if (shouldFulfillNow) {
      console.log('🚀 Triggering immediate fulfillment after manual confirmation');
      
      try {
        // Step 1: Charge wallet (convert reservation to charge)
        const chargeResponse = await supabaseClient.functions.invoke("wallet-charge-reserved", {
          body: { scheduledGiftId: giftId },
          headers: {
            Authorization: req.headers.get("Authorization")!
          }
        });

        if (chargeResponse.error) {
          console.error('❌ Wallet charge failed:', chargeResponse.error);
          throw new Error(`Wallet charge failed: ${chargeResponse.error.message}`);
        }

        console.log('💳 Wallet charged successfully');

        // Step 2: Process gift fulfillment (create Shopify order)
        const fulfillmentResponse = await supabaseClient.functions.invoke("process-gift-fulfillment", {
          body: { scheduledGiftId: giftId },
          headers: {
            Authorization: req.headers.get("Authorization")!
          }
        });

        if (fulfillmentResponse.error) {
          console.error('❌ Fulfillment failed:', fulfillmentResponse.error);
          // Note: wallet charge reversal would need to be handled here
          throw new Error(`Fulfillment failed: ${fulfillmentResponse.error.message}`);
        }

        console.log('✅ Gift fulfilled successfully');
      } catch (fulfillmentError) {
        console.error('❌ Error during fulfillment:', fulfillmentError);
        // Don't fail the confirmation, but log the error
        // The automation lifecycle will retry fulfillment
      }
    }

    // Log the confirmation
    await supabaseClient
      .from("automation_logs")
      .insert({
        user_id: user.id,
        recipient_id: gift.recipient_id,
        scheduled_gift_id: giftId,
        stage: "gift_confirmation",
        action: "manual_confirmed",
        details: {
          address_complete: isAddressComplete,
        },
      });

    // Get product image for email
    let productImage: string | undefined;
    if (gift.gift_variant_id) {
      const { data: product } = await supabaseClient
        .from("products")
        .select("featured_image_url")
        .eq("shopify_variant_id", gift.gift_variant_id)
        .single();

      productImage = product?.featured_image_url;
    }

    // Send confirmation email
    const profile = gift.profiles as any;
    const emailType = isAddressComplete
      ? "gift_confirmed_with_address"
      : "gift_confirmed_need_address";

    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: emailType,
        recipientEmail: profile?.email,
        userName: profile?.full_name,
        data: {
          recipientName: recipient?.name,
          occasion: gift.occasion,
          giftDescription: gift.gift_description || "Curated selection",
          giftImage: productImage,
          deliveryDate: gift.delivery_date,
          confirmationLink: `${Deno.env.get("SUPABASE_URL")}/dashboard`,
          modifyLink: `${Deno.env.get("SUPABASE_URL")}/dashboard`,
        },
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gift confirmed successfully",
        addressComplete: isAddressComplete,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error confirming gift:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to confirm gift";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
