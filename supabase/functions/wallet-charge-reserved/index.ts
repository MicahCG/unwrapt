import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";
import { executeReservedCharge } from "../_shared/executeReservedCharge.ts";
import { resolveChargeActor } from "../_shared/reservedFunds.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

if (import.meta.main) {
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
    const actorKind = resolveChargeActor(token, serviceKey);
    if (actorKind === "missing") return json({ success: false, error: "No authorization header provided" }, 401);

    // The lifecycle job calls this with the service role key. auth.getUser(serviceKey)
    // is not a user session and used to 500 every automatic order.
    let actorUserId: string | null = null;
    if (actorKind === "user") {
      const anon = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      });
      const { data: { user }, error: userError } = await anon.auth.getUser();
      if (userError || !user) return json({ success: false, error: "User not authenticated" }, 401);
      actorUserId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const scheduledGiftId = body?.scheduledGiftId;
    if (!scheduledGiftId || typeof scheduledGiftId !== "string") {
      return json({ success: false, error: "Scheduled gift ID is required" }, 400);
    }

    const result = await executeReservedCharge(supabase, {
      scheduledGiftId,
      actorUserId,
      recipientName: typeof body?.recipientName === "string" ? body.recipientName : undefined,
    });

    if (!result.ok) {
      return json({
        success: false,
        error: result.error,
        code: result.code,
        shortfall: result.shortfall,
        reserved: result.reserved,
        cost: result.cost,
        confirmationCopy: result.confirmationCopy,
      }, result.status);
    }

    return json({
      success: true,
      newBalance: result.newBalance,
      chargedAmount: result.chargedAmount,
      alreadyCharged: Boolean(result.alreadyCharged),
      userId: result.userId,
      fromReservation: result.fromReservation,
      confirmationCopy: result.confirmationCopy,
    });
  } catch (error) {
    console.error("wallet-charge-reserved failed", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to charge reserved funds";
    return json({ success: false, error: errorMessage }, 500);
  }
});
}
