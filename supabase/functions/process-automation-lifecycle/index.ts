import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SERVICE_FEE = 0; // No service fee

serve(async (req) => {
  try {
    console.log("🤖 Starting automation lifecycle processing");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get all scheduled gifts with automation enabled (gift-level automation)
    const { data: automatedGifts, error: giftsError } = await supabaseClient
      .from("scheduled_gifts")
      .select("*, recipients!inner(*)")
      .eq("automation_enabled", true)
      .neq("status", "cancelled")
      .neq("status", "expired")
      .neq("status", "delivered")
      .gte("occasion_date", today.toISOString().split("T")[0]);

    if (giftsError) {
      console.error("Error fetching automated gifts:", giftsError);
      throw giftsError;
    }

    console.log(`📋 Found ${automatedGifts?.length || 0} gifts with automation enabled`);

    // Get unique user_ids for profile lookup
    const userIds = [...new Set(automatedGifts?.map((g: any) => g.user_id) || [])];
    
    // Fetch profile data
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, email, full_name, gift_wallet_balance, auto_reload_enabled, auto_reload_threshold, auto_reload_amount, stripe_payment_method_id")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Create a map of user_id to profile data
    const profileMap = new Map();
    profiles?.forEach((p: any) => profileMap.set(p.id, p));

    // Group gifts by recipient for processing
    const recipientGiftsMap = new Map();
    for (const gift of automatedGifts || []) {
      const recipientId = gift.recipient_id;
      if (!recipientGiftsMap.has(recipientId)) {
        recipientGiftsMap.set(recipientId, {
          recipient: {
            ...gift.recipients,
            profiles: profileMap.get(gift.user_id)
          },
          gifts: []
        });
      }
      recipientGiftsMap.get(recipientId).gifts.push(gift);
    }

    console.log(`📋 Processing ${recipientGiftsMap.size} recipients with automated gifts`);

    // Process each recipient's gifts
    for (const [recipientId, data] of recipientGiftsMap) {
      const { recipient, gifts } = data;
      if (!recipient.profiles) {
        console.log(`  ⚠️ Skipping recipient ${recipient.name}: no profile found`);
        continue;
      }
      
      console.log(`\n👤 Processing recipient: ${recipient.name} (${gifts.length} gifts)`);
      
      for (const gift of gifts) {
        await processGiftStage(supabaseClient, gift, recipient, today);
      }
    }

    console.log("✅ Automation lifecycle processing complete");

    return new Response(
      JSON.stringify({ success: true, processed: automatedGifts?.length || 0 }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("❌ Error in process-automation-lifecycle:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});


async function processGiftStage(supabaseClient: any, gift: any, recipient: any, today: Date) {
  const deliveryDate = new Date(gift.delivery_date);
  const daysUntilDelivery = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`  🎁 Gift: ${gift.occasion} - ${daysUntilDelivery} days until delivery`);

  // STAGE 6: Cleanup expired gifts
  if (new Date(gift.occasion_date) < today && gift.payment_status === "unpaid") {
    await handleExpiredGift(supabaseClient, gift, recipient);
    return;
  }

  // STAGE 1: Fund reservation (14 days before)
  if (daysUntilDelivery === 14 && !gift.wallet_reserved) {
    await handleFundReservation(supabaseClient, gift, recipient);
    return;
  }

  // STAGE 2: Auto-confirm gift (3 days after reservation if address exists)
  if (gift.wallet_reserved && gift.status !== 'confirmed' && isAddressComplete(recipient)) {
    const reservationDate = new Date(gift.wallet_reservation_date || gift.updated_at);
    const daysSinceReservation = Math.ceil((today.getTime() - reservationDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceReservation >= 3) {
      await handleGiftAutoConfirmation(supabaseClient, gift, recipient);
      return;
    }
  }

  // STAGE 3: Address request (10 days before, if gift not confirmed yet)
  if (daysUntilDelivery === 10 && gift.wallet_reserved && gift.status !== 'confirmed' && !gift.address_requested_at) {
    await handleAddressRequest(supabaseClient, gift, recipient);
    return;
  }

  // STAGE 3: Auto-confirm if address became complete after initial request
  if (gift.address_requested_at && !gift.address_confirmed_at && isAddressComplete(recipient)) {
    const daysSinceRequest = Math.ceil((today.getTime() - new Date(gift.address_requested_at).getTime()) / (1000 * 60 * 60 * 24));

    // Auto-confirm after 1 day if address is complete
    if (daysSinceRequest >= 1) {
      console.log("    ✅ Auto-confirming address (address became complete)");

      const { error: updateError } = await supabaseClient
        .from("scheduled_gifts")
        .update({ address_confirmed_at: new Date().toISOString() })
        .eq("id", gift.id);

      if (!updateError) {
        await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "address_auto_confirm", "success", {
          days_since_request: daysSinceRequest
        });

        // Get product details for email
        const productImage = await getProductImage(supabaseClient, gift.gift_variant_id);

        // Send gift confirmed email
        await supabaseClient.functions.invoke("send-notification-email", {
          body: {
            type: "gift_confirmed_with_address",
            recipientEmail: recipient.profiles.email,
            userName: recipient.profiles.full_name,
            data: {
              recipientName: recipient.name,
              occasion: gift.occasion,
              giftDescription: gift.gift_description || "Curated selection",
              giftImage: productImage,
              deliveryDate: gift.delivery_date,
              modifyLink: `${Deno.env.get("SUPABASE_URL")}/dashboard`
            }
          }
        });

        // Proceed to fulfillment immediately
        await handleOrderFulfillment(supabaseClient, gift, recipient);
        return;
      }
    }
  }

  // STAGE 3b: Address reminder (3 days after request, if still incomplete)
  if (gift.address_requested_at && !gift.address_confirmed_at && !isAddressComplete(recipient)) {
    const daysSinceRequest = Math.ceil((today.getTime() - new Date(gift.address_requested_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceRequest === 3 && daysUntilDelivery > 2 && (gift.address_reminder_sent || 0) === 0) {
      await handleAddressReminder(supabaseClient, gift, recipient);
      return;
    }
  }

  // STAGE 4: Order fulfillment (when gift is confirmed and address is confirmed)
  if (gift.wallet_reserved && gift.status === 'confirmed' && gift.address_confirmed_at && gift.payment_status === "unpaid" && daysUntilDelivery > 0) {
    await handleOrderFulfillment(supabaseClient, gift, recipient);
    return;
  }

  // STAGE 5: Escalation (24 hours before, no address)
  if (daysUntilDelivery === 1 && gift.address_requested_at && !isAddressComplete(recipient) && gift.wallet_reserved) {
    await handleEscalation(supabaseClient, gift, recipient);
    return;
  }
}

async function handleFundReservation(supabaseClient: any, gift: any, recipient: any) {
  console.log("    💰 STAGE 1: Fund Reservation");

  try {
    // Get default gift price from Shopify
    const variantId = recipient.default_gift_variant_id;
    if (!variantId) {
      await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fund_reservation", "failed", {
        error: "No default gift variant set"
      });
      return;
    }

    // Fetch product details from Shopify
    const shopifyResponse = await supabaseClient.functions.invoke("shopify-product", {
      body: { variantId }
    });

    if (shopifyResponse.error) {
      throw new Error(`Failed to fetch Shopify product: ${shopifyResponse.error.message}`);
    }

    const productPrice = parseFloat(shopifyResponse.data.price);
    const totalCost = productPrice + SERVICE_FEE;

    // Check available balance
    const { data: balanceData } = await supabaseClient.rpc("get_available_balance", {
      p_user_id: gift.user_id
    });

    const availableBalance = balanceData || 0;

    if (availableBalance < totalCost) {
      console.log(`    ⚠️ Insufficient funds: $${availableBalance} < $${totalCost}`);

      // Check auto-reload
      const { data: reloadCheck } = await supabaseClient.rpc("check_auto_reload", {
        p_user_id: gift.user_id
      });

      if (reloadCheck?.should_reload) {
        // Trigger auto-reload via separate function
        const reloadResponse = await supabaseClient.functions.invoke("trigger-auto-reload", {
          body: {
            userId: gift.user_id,
            amount: reloadCheck.reload_amount,
            paymentMethodId: reloadCheck.payment_method_id
          }
        });

        if (reloadResponse.error) {
          // Auto-reload failed, notify user
          await supabaseClient.functions.invoke("send-notification-email", {
            body: {
              type: "auto_reload_failed",
              recipientEmail: recipient.profiles.email,
              data: {
                recipientName: recipient.name,
                occasion: gift.occasion,
                amount: totalCost
              }
            }
          });

          await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fund_reservation", "auto_reload_failed", {
            error: reloadResponse.error.message
          });
          return;
        }

        // Auto-reload succeeded, retry reservation
        console.log("    ✅ Auto-reload succeeded, retrying reservation");
      } else {
        // No auto-reload, notify user
        await supabaseClient.functions.invoke("send-notification-email", {
          body: {
            type: "low_wallet_balance",
            recipientEmail: recipient.profiles.email,
            data: {
              recipientName: recipient.name,
              occasion: gift.occasion,
              currentBalance: availableBalance,
              requiredAmount: totalCost
            }
          }
        });

        await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fund_reservation", "insufficient_funds", {
          available: availableBalance,
          required: totalCost
        });
        return;
      }
    }

    // Create reservation transaction
    const { error: transactionError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: gift.user_id,
        amount: -totalCost,
        balance_after: availableBalance,
        transaction_type: "reservation",
        status: "pending",
        scheduled_gift_id: gift.id
      });

    if (transactionError) throw transactionError;

    // Update gift with reservation
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({
        wallet_reserved: true,
        wallet_reservation_amount: totalCost,
        wallet_reservation_date: new Date().toISOString(),
        default_gift_variant_id: variantId
      })
      .eq("id", gift.id);

    if (updateError) throw updateError;

    // Send confirmation email
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "funds_reserved",
        recipientEmail: recipient.profiles.email,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          amount: totalCost,
          deliveryDate: gift.delivery_date
        }
      }
    });

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fund_reservation", "success", {
      amount: totalCost
    });

    console.log(`    ✅ Funds reserved: $${totalCost}`);
  } catch (error) {
    console.error("    ❌ Fund reservation error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fund_reservation", "error", {
      error: errorMessage
    });
  }
}

async function handleAddressRequest(supabaseClient: any, gift: any, recipient: any) {
  console.log("    📍 STAGE 2: Address Request");

  if (isAddressComplete(recipient)) {
    console.log("    ✅ Address already complete, auto-confirming");

    // Auto-confirm the address since it's already complete
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({
        address_requested_at: new Date().toISOString(),
        address_confirmed_at: new Date().toISOString()
      })
      .eq("id", gift.id);

    if (updateError) {
      console.error("    ❌ Auto-confirm error:", updateError);
      return;
    }

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "address_request", "auto_confirmed", {
      reason: "address_already_complete"
    });

    // Get product details for email
    const productImage = await getProductImage(supabaseClient, gift.gift_variant_id);

    // Send gift confirmed email (address already exists)
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "gift_confirmed_with_address",
        recipientEmail: recipient.profiles.email,
        userName: recipient.profiles.full_name,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          giftDescription: gift.gift_description || "Curated selection",
          giftImage: productImage,
          deliveryDate: gift.delivery_date,
          modifyLink: `${Deno.env.get("SUPABASE_URL")}/dashboard`
        }
      }
    });

    // Proceed directly to fulfillment
    await handleOrderFulfillment(supabaseClient, gift, recipient);
    return;
  }

  try {
    // Update gift with address request timestamp
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({ address_requested_at: new Date().toISOString() })
      .eq("id", gift.id);

    if (updateError) throw updateError;

    // Get product details for email
    const productImage = await getProductImage(supabaseClient, gift.gift_variant_id);

    // Send gift confirmed but needs address email
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "gift_confirmed_need_address",
        recipientEmail: recipient.profiles.email,
        userName: recipient.profiles.full_name,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          giftDescription: gift.gift_description || "Curated selection",
          giftImage: productImage,
          deliveryDate: gift.delivery_date,
          confirmationLink: `${Deno.env.get("SUPABASE_URL")}/confirm-address/${gift.id}`,
          modifyLink: `${Deno.env.get("SUPABASE_URL")}/dashboard`
        }
      }
    });

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "address_request", "sent", {});

    console.log("    ✅ Address confirmation requested");
  } catch (error) {
    console.error("    ❌ Address request error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "address_request", "error", {
      error: errorMessage
    });
  }
}

async function handleAddressReminder(supabaseClient: any, gift: any, recipient: any) {
  console.log("    🔔 STAGE 3: Address Reminder");

  try {
    // Send reminder email
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "address_confirmation_reminder",
        recipientEmail: recipient.profiles.email,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          deliveryDate: gift.delivery_date,
          confirmationLink: `${Deno.env.get("SUPABASE_URL")}/confirm-address/${gift.id}`
        }
      }
    });

    // Mark reminder as sent
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({ address_reminder_sent: 1 })
      .eq("id", gift.id);

    if (updateError) throw updateError;

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "address_reminder", "sent", {});

    console.log("    ✅ Reminder sent");
  } catch (error) {
    console.error("    ❌ Reminder error:", error);
  }
}

async function handleOrderFulfillment(supabaseClient: any, gift: any, recipient: any) {
  console.log("    🚀 STAGE 4: Order Fulfillment");

  try {
    // Step 1: Charge wallet (convert reservation to charge)
    const chargeResponse = await supabaseClient.functions.invoke("wallet-charge-reserved", {
      body: { scheduledGiftId: gift.id },
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      }
    });

    if (chargeResponse.error) {
      throw new Error(`Wallet charge failed: ${chargeResponse.error.message}`);
    }

    console.log("    💳 Wallet charged successfully");

    // Step 2: Process gift fulfillment (create Shopify order)
    const fulfillmentResponse = await supabaseClient.functions.invoke("process-gift-fulfillment", {
      body: { scheduledGiftId: gift.id },
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      }
    });

    if (fulfillmentResponse.error) {
      // Fulfillment failed, refund wallet
      console.error("    ❌ Fulfillment failed, refunding wallet");
      await refundWallet(supabaseClient, gift);

      await supabaseClient.functions.invoke("send-notification-email", {
        body: {
          type: "automation_failed",
          recipientEmail: recipient.profiles.email,
          data: {
            recipientName: recipient.name,
            occasion: gift.occasion,
            error: fulfillmentResponse.error.message
          }
        }
      });

      await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fulfillment", "failed", {
        error: fulfillmentResponse.error.message
      });
      return;
    }

    // Success! Send confirmation
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "gift_sent",
        recipientEmail: recipient.profiles.email,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          trackingNumber: fulfillmentResponse.data?.trackingNumber
        }
      }
    });

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fulfillment", "success", {
      orderId: fulfillmentResponse.data?.orderId
    });

    // Check if auto-reload needed after charge
    await supabaseClient.rpc("check_auto_reload", { p_user_id: gift.user_id });

    console.log("    ✅ Gift fulfilled successfully");
  } catch (error) {
    console.error("    ❌ Fulfillment error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "fulfillment", "error", {
      error: errorMessage
    });
  }
}

async function handleEscalation(supabaseClient: any, gift: any, recipient: any) {
  console.log("    ⚠️ STAGE 5: Escalation");

  try {
    // Send urgent email
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "address_escalation",
        recipientEmail: recipient.profiles.email,
        userName: recipient.profiles.full_name,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          occasionDate: gift.occasion_date,
          deliveryDate: gift.delivery_date,
          confirmationLink: `https://app.unwrapt.io/confirm-address/${gift.id}`
        }
      }
    });

    // Disable automation for this gift
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({ automation_enabled: false })
      .eq("id", gift.id);

    if (updateError) throw updateError;

    // Unreserve funds
    await unreserveWalletFunds(supabaseClient, gift);

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "escalation", "address_missing", {});

    console.log("    ✅ Escalated - automation disabled");
  } catch (error) {
    console.error("    ❌ Escalation error:", error);
  }
}

async function handleGiftAutoConfirmation(supabaseClient: any, gift: any, recipient: any) {
  console.log("    ✅ STAGE 2: Auto-Confirm Gift");

  try {
    // Get product details for email
    const productImage = await getProductImage(supabaseClient, gift.gift_variant_id);

    // Mark gift as confirmed
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({
        status: 'confirmed'
      })
      .eq("id", gift.id);

    if (updateError) throw updateError;

    // Send gift confirmed email
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "gift_confirmed_with_address",
        recipientEmail: recipient.profiles.email,
        userName: recipient.profiles.full_name,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          giftDescription: gift.gift_description || "Curated selection",
          giftImage: productImage,
          deliveryDate: gift.delivery_date,
          modifyLink: `${Deno.env.get("SUPABASE_URL")}/dashboard`
        }
      }
    });

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "gift_confirmation", "auto_confirmed", {
      reason: "address_exists_3_days_after_reservation"
    });

    // Set address as confirmed if it exists
    if (!gift.address_confirmed_at) {
      await supabaseClient
        .from("scheduled_gifts")
        .update({ address_confirmed_at: new Date().toISOString() })
        .eq("id", gift.id);
    }

    console.log("    ✅ Gift auto-confirmed successfully");
  } catch (error) {
    console.error("    ❌ Auto-confirmation error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "gift_confirmation", "error", {
      error: errorMessage
    });
  }
}

async function handleExpiredGift(supabaseClient: any, gift: any, recipient: any) {
  console.log("    🗑️ STAGE 6: Cleanup Expired Gift");

  try {
    // Update status
    const { error: updateError } = await supabaseClient
      .from("scheduled_gifts")
      .update({ status: "expired" })
      .eq("id", gift.id);

    if (updateError) throw updateError;

    // Unreserve funds if reserved
    if (gift.wallet_reserved) {
      await unreserveWalletFunds(supabaseClient, gift);
    }

    // Notify user
    await supabaseClient.functions.invoke("send-notification-email", {
      body: {
        type: "gift_expired",
        recipientEmail: recipient.profiles.email,
        userName: recipient.profiles.full_name,
        data: {
          recipientName: recipient.name,
          occasion: gift.occasion,
          amount: gift.wallet_reservation_amount || 0
        }
      }
    });

    await logAutomation(supabaseClient, gift.user_id, recipient.id, gift.id, "cleanup", "expired", {});

    console.log("    ✅ Gift expired and cleaned up");
  } catch (error) {
    console.error("    ❌ Cleanup error:", error);
  }
}

function isAddressComplete(recipient: any): boolean {
  return !!(
    recipient.street &&
    recipient.city &&
    recipient.state &&
    recipient.zip_code &&
    recipient.country
  );
}

async function unreserveWalletFunds(supabaseClient: any, gift: any) {
  // Cancel pending reservation
  const { error } = await supabaseClient
    .from("wallet_transactions")
    .update({ status: "cancelled" })
    .eq("scheduled_gift_id", gift.id)
    .eq("transaction_type", "reservation")
    .eq("status", "pending");

  if (error) {
    console.error("Error unreserving funds:", error);
  }

  // Update gift
  await supabaseClient
    .from("scheduled_gifts")
    .update({ wallet_reserved: false })
    .eq("id", gift.id);
}

async function refundWallet(supabaseClient: any, gift: any) {
  // Find the completed charge transaction
  const { data: transaction } = await supabaseClient
    .from("wallet_transactions")
    .select("*")
    .eq("scheduled_gift_id", gift.id)
    .eq("transaction_type", "charge")
    .eq("status", "completed")
    .single();

  if (!transaction) return;

  // Create refund transaction
  await supabaseClient
    .from("wallet_transactions")
    .insert({
      user_id: gift.user_id,
      amount: Math.abs(transaction.amount),
      balance_after: transaction.balance_after + Math.abs(transaction.amount),
      transaction_type: "refund",
      status: "completed",
      scheduled_gift_id: gift.id
    });

  // Update user balance
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("gift_wallet_balance")
    .eq("id", gift.user_id)
    .single();

  await supabaseClient
    .from("profiles")
    .update({
      gift_wallet_balance: profile.gift_wallet_balance + Math.abs(transaction.amount)
    })
    .eq("id", gift.user_id);
}

async function logAutomation(
  supabaseClient: any,
  userId: string,
  recipientId: string,
  giftId: string,
  stage: string,
  action: string,
  details: any
) {
  await supabaseClient
    .from("automation_logs")
    .insert({
      user_id: userId,
      recipient_id: recipientId,
      scheduled_gift_id: giftId,
      stage,
      action,
      details
    });
}

async function getProductImage(supabaseClient: any, variantId: string | null): Promise<string | undefined> {
  if (!variantId) return undefined;

  try {
    const { data: product } = await supabaseClient
      .from("products")
      .select("featured_image_url")
      .eq("shopify_variant_id", variantId)
      .single();

    return product?.featured_image_url;
  } catch (error) {
    console.error("Error fetching product image:", error);
    return undefined;
  }
}
