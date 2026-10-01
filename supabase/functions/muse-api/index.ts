import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/**
 * Muse Connector API  -  public surface for Meta Muse review + directory listing.
 * Auth:
 *   - Required: X-Unwrapt-Api-Key (or Authorization: Bearer <MUSE_CONNECTOR_KEY>)
 *   - Optional user scope: Authorization: Bearer <supabase_user_jwt>
 *     OR X-Unwrapt-Review-User: 1 (uses MUSE_REVIEW_USER_ID for Meta sandbox)
 *
 * All purchases require explicit user approval  -  this API never auto-charges.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-unwrapt-api-key, x-unwrapt-review-user",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type CatalogItem = {
  id: string;
  title: string;
  brand: string | null;
  description: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  provider: string;
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

async function searchCatalog(args: {
  max_price?: number;
  interests?: string[];
  limit?: number;
}): Promise<CatalogItem[]> {
  const token = goodyApiKey();
  if (!token) {
    return [];
  }

  const response = await fetch(`${goodyBaseUrl()}/v1/products?page=1&per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const payload = await response.json();
  const products = (payload?.data || payload?.products || []) as Array<Record<string, unknown>>;

  const interests = (args.interests || []).map((i) => i.toLowerCase());
  const max = args.max_price ?? 150;
  const limit = args.limit ?? 3;

  const mapped: CatalogItem[] = products
    .map((p) => {
      const priceCents = typeof p.price === "number" ? p.price : null;
      const price = priceCents != null ? priceCents / 100 : null;
      const brand = (p.brand as { name?: string } | null)?.name || null;
      const images = p.images as Array<{ image_large?: { url?: string } }> | undefined;
      const image =
        images?.[0]?.image_large?.url ||
        ((p.variants as Array<{ image_large?: { url?: string } }>)?.[0]?.image_large?.url) ||
        null;
      return {
        id: String(p.id || ""),
        title: String(p.name || "Gift"),
        brand,
        description: String(p.recipient_description || p.subtitle || "") || null,
        image_url: image,
        price,
        currency: "USD",
        provider: "goody",
      };
    })
    .filter((p) => p.id && p.price != null && p.price <= max);

  const scored = mapped
    .map((p) => {
      const hay = `${p.title} ${p.description || ""} ${p.brand || ""}`.toLowerCase();
      const score = interests.reduce((s, i) => s + (hay.includes(i) ? 2 : 0), 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || (a.p.price || 0) - (b.p.price || 0));

  return scored.slice(0, limit).map((s) => s.p);
}

async function searchLocalProducts(
  admin: ReturnType<typeof createClient>,
  args: { max_price?: number; limit?: number },
): Promise<CatalogItem[]> {
  let query = admin
    .from("products")
    .select("id, title, description, price, currency, featured_image_url")
    .eq("active", true)
    .eq("available_for_sale", true)
    .order("rank", { ascending: true })
    .limit(args.limit ?? 3);

  if (typeof args.max_price === "number") query = query.lte("price", args.max_price);

  const { data } = await query;
  return (data || []).map((p) => ({
    id: p.id,
    title: p.title,
    brand: null,
    description: p.description,
    image_url: p.featured_image_url,
    price: p.price,
    currency: p.currency || "USD",
    provider: "unwrapt",
  }));
}

function pathOf(req: Request) {
  const url = new URL(req.url);
  // Supabase may pass /functions/v1/muse-api/... or /muse-api/...
  let path = url.pathname
    .replace(/^\/functions\/v1\/muse-api/, "")
    .replace(/^\/muse-api/, "");
  path = path.replace(/\/$/, "") || "/";
  return path;
}

function checkConnectorKey(req: Request): boolean {
  const expected = Deno.env.get("MUSE_CONNECTOR_KEY") || "";
  if (!expected) return false;
  const headerKey = req.headers.get("x-unwrapt-api-key") || "";
  const auth = req.headers.get("Authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  return headerKey === expected || bearer === expected;
}

async function resolveUserId(
  req: Request,
  admin: ReturnType<typeof createClient>,
): Promise<{ userId: string | null; mode: "user_jwt" | "review" | "none"; error?: string }> {
  const reviewFlag = req.headers.get("x-unwrapt-review-user");
  if (reviewFlag === "1" || reviewFlag === "true") {
    const reviewUser = Deno.env.get("MUSE_REVIEW_USER_ID");
    if (!reviewUser) return { userId: null, mode: "none", error: "MUSE_REVIEW_USER_ID not configured" };
    return { userId: reviewUser, mode: "review" };
  }

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const connectorKey = Deno.env.get("MUSE_CONNECTOR_KEY") || "";
  if (!token || token === connectorKey) return { userId: null, mode: "none" };

  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  const authClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return { userId: null, mode: "none", error: "Invalid user token" };
  return { userId: data.user.id, mode: "user_jwt" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  const path = pathOf(req);

  // Public health + openapi (no connector key required for discovery)
  if (req.method === "GET" && (path === "/" || path === "/health" || path === "/v1/health")) {
    return json({
      ok: true,
      service: "unwrapt-muse-api",
      version: "0.1.0",
      approval_required_for_purchases: true,
      docs: "https://app.unwrapt.io/muse/",
      openapi: "https://app.unwrapt.io/muse/openapi.json",
    });
  }

  if (req.method === "GET" && path === "/v1/openapi.json") {
    // Redirect hint  -  canonical OpenAPI is hosted on the app
    return json({
      openapi: "https://app.unwrapt.io/muse/openapi.json",
    });
  }

  if (!checkConnectorKey(req)) {
    return json(
      {
        error: "unauthorized",
        message: "Provide X-Unwrapt-Api-Key with a valid Muse connector key.",
      },
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ── Recommendations (works with or without a linked user) ───────────────
    if (req.method === "POST" && path === "/v1/recommendations") {
      const body = await req.json().catch(() => ({}));
      const recipientName = String(body.recipient_name || body.recipientName || "them");
      const budgetMax = Number(body.budget_max ?? body.budgetMax ?? 100);
      const interests = Array.isArray(body.interests) ? body.interests.map(String) : [];
      const occasion = body.occasion ? String(body.occasion) : null;

      let products = await searchCatalog({
        max_price: budgetMax,
        interests,
        limit: 3,
      });
      if (products.length === 0) {
        products = await searchLocalProducts(admin, { max_price: budgetMax, limit: 3 });
      }

      return json({
        success: true,
        recipient_name: recipientName,
        occasion,
        budget_max: budgetMax,
        message:
          products.length > 0
            ? `Here are ${products.length} gift ideas for ${recipientName.split(" ")[0]}. Nothing will be purchased until you approve.`
            : `I couldn't find in-budget picks yet for ${recipientName.split(" ")[0]}. Try a higher budget or different interests.`,
        products,
        purchase_requires_approval: true,
      });
    }

    // User-scoped routes
    const { userId, mode, error: userErr } = await resolveUserId(req, admin);
    if (!userId) {
      return json(
        {
          error: "user_required",
          message:
            userErr ||
            "Link a user JWT (Authorization: Bearer <supabase_access_token>) or set X-Unwrapt-Review-User: 1 for Meta sandbox.",
          mode,
        },
        401,
      );
    }

    if (req.method === "GET" && path === "/v1/me") {
      const { data: profile } = await admin
        .from("profiles")
        .select("id, email, full_name, subscription_tier")
        .eq("id", userId)
        .maybeSingle();
      return json({
        success: true,
        user: {
          id: userId,
          email: profile?.email || null,
          name: profile?.full_name || null,
          plan: profile?.subscription_tier || "free",
        },
        auth_mode: mode,
      });
    }

    if (req.method === "GET" && path === "/v1/recipients") {
      const { data, error } = await admin
        .from("recipients")
        .select("id, name, relationship, birthday, anniversary, interests, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json({ success: true, recipients: data || [] });
    }

    if (req.method === "POST" && path === "/v1/recipients") {
      const body = await req.json().catch(() => ({}));
      const name = String(body.name || "").trim();
      if (!name) return json({ error: "name_required" }, 400);

      const { data, error } = await admin
        .from("recipients")
        .insert({
          user_id: userId,
          name,
          relationship: body.relationship || null,
          birthday: body.birthday || null,
          anniversary: body.anniversary || null,
          interests: Array.isArray(body.interests) ? body.interests : [],
          notes: "Added via Muse connector",
        })
        .select("id, name, relationship, birthday, anniversary, interests")
        .single();
      if (error) throw error;
      return json({ success: true, recipient: data }, 201);
    }

    if (req.method === "GET" && path === "/v1/occasions/upcoming") {
      const { data, error } = await admin
        .from("recipients")
        .select("id, name, relationship, birthday, anniversary")
        .eq("user_id", userId);
      if (error) throw error;

      const now = new Date();
      const upcoming = (data || [])
        .flatMap((r) => {
          const items: Array<Record<string, unknown>> = [];
          for (const [type, raw] of [
            ["birthday", r.birthday],
            ["anniversary", r.anniversary],
          ] as const) {
            if (!raw) continue;
            const d = new Date(raw);
            let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
            if (next < now) next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
            const days = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            items.push({
              recipient_id: r.id,
              recipient_name: r.name,
              relationship: r.relationship,
              occasion_type: type,
              next_date: next.toISOString().slice(0, 10),
              days_until: days,
            });
          }
          return items;
        })
        .sort((a, b) => Number(a.days_until) - Number(b.days_until))
        .slice(0, 20);

      return json({ success: true, occasions: upcoming });
    }

    if (req.method === "POST" && path === "/v1/gifts/proposals") {
      const body = await req.json().catch(() => ({}));
      const recipientId = body.recipient_id || body.recipientId;
      const productId = body.product_id || body.productId;
      const productTitle = body.product_title || body.productTitle || "Curated gift";
      const estimatedCost = Number(body.estimated_cost ?? body.estimatedCost ?? 0);
      const occasion = body.occasion || "Gift";
      const occasionDate = body.occasion_date || body.occasionDate || new Date().toISOString().slice(0, 10);

      if (!recipientId) return json({ error: "recipient_id_required" }, 400);

      const { data: recipient } = await admin
        .from("recipients")
        .select("id, name")
        .eq("id", recipientId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!recipient) return json({ error: "recipient_not_found" }, 404);

      // Create a scheduled gift in a non-purchased state  -  requires approval before charge.
      const { data: gift, error } = await admin
        .from("scheduled_gifts")
        .insert({
          user_id: userId,
          recipient_id: recipientId,
          occasion,
          occasion_date: occasionDate,
          gift_description: productTitle,
          gift_type: productId || null,
          estimated_cost: estimatedCost || null,
          status: "pending_approval",
          payment_status: "requires_approval",
          automation_enabled: false,
        })
        .select("id, status, payment_status, gift_description, estimated_cost, occasion, occasion_date")
        .single();

      if (error) throw error;

      return json({
        success: true,
        proposal: gift,
        message: `Proposal saved for ${recipient.name}. Unwrapt will not charge or place an order until the user explicitly approves.`,
        purchase_requires_approval: true,
        approve_url: `https://app.unwrapt.io/?action=review&gift=${gift.id}`,
      }, 201);
    }

    return json({ error: "not_found", path }, 404);
  } catch (err) {
    console.error("muse-api error", err);
    return json(
      {
        error: "server_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
