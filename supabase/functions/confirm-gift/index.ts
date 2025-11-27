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

    if (gift.gift_confirmed_at) {
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
      gift_confirmed_at: new Date().toISOString(),
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
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to confirm gift",
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
