import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

// Weekly cron job (see migration 20261016_schedule_notification_emails.sql).
// For users with profiles.marketing_emails on, finds recipients with an
// occasion coming up but no active gift scheduled yet, and - if a real
// catalog item fits the user's default gift budget - emails one idea.
// Never fabricates a product; a recipient is silently skipped if nothing
// in the local catalog fits their budget. Dedups via notification_queue so
// the same recipient isn't tipped more than once every 14 days.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase query errors are plain {message, details, hint, code} objects,
// not real Error instances, so String(error) prints "[object Object]".
const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const LOOKAHEAD_DAYS = 45;
const RETIP_COOLDOWN_DAYS = 14;
const DEFAULT_BUDGET_MAX = 150;
const ACTIVE_GIFT_STATUSES = new Set(["cancelled", "expired"]);

function nextOccurrenceDays(dateString: string, today: Date): number {
  const [, month, day] = dateString.split("-").map(Number);
  const thisYear = new Date(today.getFullYear(), month - 1, day);
  thisYear.setHours(0, 0, 0, 0);
  const next = thisYear.getTime() < today.getTime()
    ? new Date(today.getFullYear() + 1, month - 1, day)
    : thisYear;
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cooldownCutoff = new Date(today.getTime() - RETIP_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const { data: recipients, error } = await supabaseClient
      .from("recipients")
      .select(`
        id, name, birthday, anniversary, interests,
        scheduled_gifts(status),
        profiles!inner(id, email, full_name, marketing_emails, default_gift_budget_max)
      `)
      .eq("profiles.marketing_emails", true);

    if (error) throw error;

    let sent = 0;
    let skippedNoIdea = 0;
    let skippedHasGift = 0;
    let skippedCooldown = 0;

    for (const recipient of recipients || []) {
      const profile = (recipient as any).profiles;
      if (!profile?.email) continue;

      const occasionDate: string | null = recipient.birthday || recipient.anniversary;
      if (!occasionDate) continue;
      const daysAway = nextOccurrenceDays(occasionDate, today);
      if (daysAway < 0 || daysAway > LOOKAHEAD_DAYS) continue;

      const gifts = ((recipient as any).scheduled_gifts || []) as Array<{ status: string | null }>;
      const hasActiveGift = gifts.some((g) => !ACTIVE_GIFT_STATUSES.has((g.status || "").toLowerCase()));
      if (hasActiveGift) {
        skippedHasGift++;
        continue;
      }

      const { data: recentTip } = await supabaseClient
        .from("notification_queue")
        .select("id")
        .eq("notification_type", "gift_tip")
        .eq("user_email", profile.email)
        .eq("recipient_name", recipient.name)
        .gte("created_at", cooldownCutoff.toISOString())
        .maybeSingle();

      if (recentTip) {
        skippedCooldown++;
        continue;
      }

      const budgetMax = profile.default_gift_budget_max ?? DEFAULT_BUDGET_MAX;
      const interests: string[] = (recipient.interests || []).map((i: string) => i.toLowerCase());

      const { data: candidates } = await supabaseClient
        .from("products")
        .select("title, description, featured_image_url, price, currency, product_type")
        .eq("active", true)
        .eq("available_for_sale", true)
        .lte("price", budgetMax)
        .order("rank", { ascending: true })
        .limit(25);
      if (!candidates || candidates.length === 0) {
        skippedNoIdea++;
        continue;
      }

      let pick = candidates[0];
      if (interests.length > 0) {
        const scored = candidates
          .map((p) => {
            const hay = `${p.title} ${p.description || ""} ${p.product_type || ""}`.toLowerCase();
            const score = interests.reduce((s, i) => s + (hay.includes(i) ? 1 : 0), 0);
            return { p, score };
          })
          .sort((a, b) => b.score - a.score);
        if (scored[0].score > 0) pick = scored[0].p;
      }

      try {
        const { error: sendError } = await supabaseClient.functions.invoke("send-notification-email", {
          body: {
            type: "gift_tip",
            recipientEmail: profile.email,
            userName: profile.full_name,
            data: {
              recipientName: recipient.name,
              occasion: recipient.birthday === occasionDate ? "birthday" : "anniversary",
              giftDescription: pick.title,
              giftImage: pick.featured_image_url,
              priceRange: typeof pick.price === "number" ? `$${pick.price.toFixed(2)}` : undefined,
              modifyLink: "https://app.unwrapt.io/",
            },
          },
        });
        if (sendError) throw sendError;

        await supabaseClient.from("notification_queue").insert({
          notification_type: "gift_tip",
          user_email: profile.email,
          user_name: profile.full_name,
          recipient_name: recipient.name,
          occasion_date: occasionDate,
          status: "sent",
          processed_at: new Date().toISOString(),
        });
        sent++;
      } catch (sendError) {
        console.error(`Failed to send gift tip for ${recipient.name}:`, sendError);
        await supabaseClient.from("notification_queue").insert({
          notification_type: "gift_tip",
          user_email: profile.email,
          user_name: profile.full_name,
          recipient_name: recipient.name,
          occasion_date: occasionDate,
          status: "failed",
          error_message: errorMessage(sendError),
          processed_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, skippedNoIdea, skippedHasGift, skippedCooldown }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error sending gift tips:", error);
    return new Response(
      JSON.stringify({ error: errorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
