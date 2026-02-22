import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_email } = await req.json();
    if (!user_email) {
      return new Response(
        JSON.stringify({ error: "user_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const targetUser = users.find((u) => u.email === user_email);
    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: `User not found: ${user_email}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUid = targetUser.id;
    const steps: string[] = [];

    // Step 1: Cancel Stripe subscription if VIP
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", targetUid)
      .single();

    if (profile?.subscription_tier === "vip") {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          // Find Stripe customer by email
          const custRes = await fetch(
            `https://api.stripe.com/v1/customers?email=${encodeURIComponent(user_email)}&limit=1`,
            { headers: { Authorization: `Bearer ${stripeKey}` } }
          );
          const custData = await custRes.json();

          if (custData.data?.length > 0) {
            const customerId = custData.data[0].id;

            // List active subscriptions
            const subRes = await fetch(
              `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=10`,
              { headers: { Authorization: `Bearer ${stripeKey}` } }
            );
            const subData = await subRes.json();

            // Cancel each subscription immediately
            for (const sub of subData.data || []) {
              const cancelRes = await fetch(
                `https://api.stripe.com/v1/subscriptions/${sub.id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${stripeKey}` },
                }
              );
              const cancelData = await cancelRes.json();
              steps.push(`Cancelled Stripe subscription ${sub.id} (status: ${cancelData.status})`);
            }

            if (!subData.data?.length) {
              steps.push("No active Stripe subscriptions found");
            }
          } else {
            steps.push("No Stripe customer found for this email");
          }
        } catch (stripeErr) {
          steps.push(`Stripe error (non-blocking): ${stripeErr.message}`);
        }
      } else {
        steps.push("STRIPE_SECRET_KEY not set, skipping Stripe cancellation");
      }
    } else {
      steps.push(`User is on ${profile?.subscription_tier || "free"} tier, no Stripe cancellation needed`);
    }

    // Step 2: Delete all related database rows
    const tables = [
      { table: "automation_logs", col: "user_id" },
      { table: "wallet_transactions", col: "user_id" },
      { table: "payments", col: "user_id" },
      { table: "scheduled_gifts", col: "user_id" },
      { table: "recipients", col: "user_id" },
      { table: "user_metrics", col: "user_id" },
      { table: "user_roles", col: "user_id" },
      { table: "calendar_integrations", col: "user_id" },
    ];

    for (const { table, col } of tables) {
      const { error, count } = await supabaseAdmin
        .from(table)
        .delete({ count: "exact" })
        .eq(col, targetUid);

      if (error) {
        steps.push(`⚠️ ${table}: ${error.message}`);
      } else {
        steps.push(`✓ ${table}: deleted ${count ?? 0} rows`);
      }
    }

    // Delete notification_queue by email
    const { error: nqErr, count: nqCount } = await supabaseAdmin
      .from("notification_queue")
      .delete({ count: "exact" })
      .eq("user_email", user_email);

    steps.push(
      nqErr
        ? `⚠️ notification_queue: ${nqErr.message}`
        : `✓ notification_queue: deleted ${nqCount ?? 0} rows`
    );

    // Step 3: Delete auth user (this also deletes the profiles row)
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(targetUid);
    if (deleteErr) {
      steps.push(`⚠️ Auth user deletion failed: ${deleteErr.message}`);
    } else {
      steps.push(`✓ Auth user deleted: ${targetUid}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_email,
        user_id: targetUid,
        steps,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
