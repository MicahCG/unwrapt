import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ success: false, error: "Server misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return new Response(JSON.stringify({ success: false, error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Prefer profiles.email; fall back to auth user id lookup.
    let { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({
        subscription_tier: "vip",
        subscription_status: "active",
      })
      .eq("email", email)
      .select("id, email, subscription_tier, subscription_status")
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile) {
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const user = (listed?.users || []).find((u) => (u.email || "").toLowerCase() === email);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: `No user found for ${email}` }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updated = await admin
        .from("profiles")
        .update({
          subscription_tier: "vip",
          subscription_status: "active",
          email,
        })
        .eq("id", user.id)
        .select("id, email, subscription_tier, subscription_status")
        .maybeSingle();
      if (updated.error) throw updated.error;
      profile = updated.data;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `VIP granted to ${email}`,
        profile,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("grant-vip failed", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to grant VIP",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
