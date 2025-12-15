import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔐 Starting assign-admin-role function");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { userEmail } = body;

    if (!userEmail) {
      throw new Error("User email is required");
    }

    console.log(`🔐 Assigning admin role to: ${userEmail}`);

    // Get user ID from email
    const { data: { users }, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const targetUser = users.find(u => u.email === userEmail);
    if (!targetUser) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    // Check if admin role already exists
    const { data: existingRole } = await supabaseClient
      .from("user_roles")
      .select("id")
      .eq("user_id", targetUser.id)
      .eq("role", "admin")
      .single();

    if (!existingRole) {
      // Insert admin role
      const { error: insertError } = await supabaseClient
        .from("user_roles")
        .insert({
          user_id: targetUser.id,
          role: "admin"
        });

      if (insertError) throw insertError;
      console.log(`✅ Admin role created for ${userEmail}`);
    } else {
      console.log(`ℹ️ Admin role already exists for ${userEmail}`);
    }

    console.log(`✅ Admin role processed for ${userEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Admin role assigned to ${userEmail}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("🔐 Error in assign-admin-role:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to assign admin role";
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
