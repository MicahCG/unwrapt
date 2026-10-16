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

type CatalogItem = {
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  provider: "goody" | "unwrapt";
};

const goodyEnvironment = () =>
  Deno.env.get("GOODY_API_ENV") === "production" ? "production" : "sandbox";

const goodyApiKey = () =>
  goodyEnvironment() === "production"
    ? Deno.env.get("GOODY_PRODUCTION_COMMERCE_API_KEY")
    : Deno.env.get("GOODY_SANDBOX_COMMERCE_API_KEY") || Deno.env.get("GOODY_API_KEY");

const goodyBaseUrl = () =>
  goodyEnvironment() === "production"
    ? "https://api.ongoody.com"
    : "https://api.sandbox.ongoody.com";

/** Fetch the live Goody catalog once per invocation (same products for every user). */
async function fetchGoodyCatalog(): Promise<CatalogItem[]> {
  const token = goodyApiKey();
  if (!token) return [];

  const response = await fetch(`${goodyBaseUrl()}/v1/products?page=1&per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const products = (payload?.data || payload?.products || []) as Array<Record<string, unknown>>;

  return products
    .map((p): CatalogItem => {
      const priceCents = typeof p.price === "number" ? p.price : null;
      const images = p.images as Array<{ image_large?: { url?: string } }> | undefined;
      const image =
        images?.[0]?.image_large?.url ||
        ((p.variants as Array<{ image_large?: { url?: string } }>)?.[0]?.image_large?.url) ||
        null;
      return {
        title: String(p.name || "Gift"),
        description: String(p.recipient_description || p.subtitle || "") || null,
        image_url: image,
        price: priceCents != null ? priceCents / 100 : null,
        provider: "goody",
      };
    })
    .filter((p) => p.price != null);
}

/** Fallback only - the pre-Goody local catalog, kept in case Goody is unreachable/unconfigured. */
async function fetchLocalCatalog(supabaseClient: ReturnType<typeof createClient>): Promise<CatalogItem[]> {
  const { data } = await supabaseClient
    .from("products")
    .select("title, description, featured_image_url, price")
    .eq("active", true)
    .eq("available_for_sale", true)
    .order("rank", { ascending: true })
    .limit(100);

  return (data || []).map((p) => ({
    title: p.title,
    description: p.description,
    image_url: p.featured_image_url,
    price: p.price,
    provider: "unwrapt" as const,
  }));
}

function pickBestMatch(catalog: CatalogItem[], budgetMax: number, interests: string[]): CatalogItem | null {
  const inBudget = catalog.filter((p) => p.price != null && p.price <= budgetMax);
  if (inBudget.length === 0) return null;

  if (interests.length === 0) return inBudget[0];

  const scored = inBudget
    .map((p) => {
      const hay = `${p.title} ${p.description || ""}`.toLowerCase();
      const score = interests.reduce((s, i) => s + (hay.includes(i) ? 1 : 0), 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0].score > 0 ? scored[0].p : inBudget[0];
}

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

    // recipients has no formal FK to profiles for PostgREST to auto-embed,
    // so fetch the two separately and join in code.
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("id, email, full_name, default_gift_budget_max")
      .eq("marketing_emails", true);

    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));
    const userIds = [...profileById.keys()];

    let sent = 0;
    let skippedNoIdea = 0;
    let skippedHasGift = 0;
    let skippedCooldown = 0;

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent, skippedNoIdea, skippedHasGift, skippedCooldown }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: recipients, error } = await supabaseClient
      .from("recipients")
      .select("id, name, birthday, anniversary, interests, user_id, scheduled_gifts(status)")
      .in("user_id", userIds);

    if (error) throw error;

    let catalog = await fetchGoodyCatalog();
    if (catalog.length === 0) catalog = await fetchLocalCatalog(supabaseClient);

    for (const recipient of recipients || []) {
      const profile = profileById.get((recipient as any).user_id);
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

      const pick = pickBestMatch(catalog, budgetMax, interests);
      if (!pick) {
        skippedNoIdea++;
        continue;
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
              giftImage: pick.image_url,
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
