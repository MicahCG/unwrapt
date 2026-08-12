import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

type CatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  provider: "goody" | "unwrapt";
  providerProductId: string | null;
};

type GoodyProduct = {
  id?: string;
  name?: string;
  subtitle?: string | null;
  subtitle_short?: string | null;
  recipient_description?: string | null;
  price?: number | null;
  brand?: { name?: string | null } | null;
  images?: Array<{ image_large?: { url?: string | null } | null }>;
  variants?: Array<{ image_large?: { url?: string | null } | null }>;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanInterests = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((interest): interest is string => typeof interest === "string")
    .map((interest) => interest.trim().toLowerCase().slice(0, 40))
    .filter(Boolean)
    .slice(0, 3);
};

const scoreText = (text: string, interests: string[]) =>
  interests.reduce((score, interest) => score + (text.includes(interest) ? 1 : 0), 0);

const goodyImage = (product: GoodyProduct) =>
  product.images?.[0]?.image_large?.url || product.variants?.[0]?.image_large?.url || null;

const getGoodyCatalog = async (interests: string[], limit: number): Promise<CatalogItem[]> => {
  const apiKey = Deno.env.get("GOODY_COMMERCE_API_KEY");
  if (!apiKey) return [];

  const environment = Deno.env.get("GOODY_API_ENV") === "production" ? "production" : "sandbox";
  const baseUrl = environment === "production"
    ? "https://api.ongoody.com"
    : "https://api.sandbox.ongoody.com";
  const response = await fetch(`${baseUrl}/v1/products?page=1&per_page=100`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Goody catalog request failed with ${response.status}`);
  const payload = await response.json() as { data?: GoodyProduct[] };

  return (payload.data || [])
    .filter((product) => product.id && product.name)
    .map((product) => ({
      product,
      score: scoreText([
        product.name,
        product.brand?.name,
        product.subtitle,
        product.subtitle_short,
        product.recipient_description,
      ].filter(Boolean).join(" ").toLowerCase(), interests),
    }))
    .sort((a, b) => b.score - a.score || Number(a.product.price || 0) - Number(b.product.price || 0))
    .slice(0, limit)
    .map(({ product }) => ({
      id: product.id!,
      name: product.name!,
      brand: product.brand?.name || null,
      description: product.subtitle_short || product.subtitle || product.recipient_description || null,
      imageUrl: goodyImage(product),
      price: typeof product.price === "number" ? product.price / 100 : null,
      currency: "USD",
      provider: "goody" as const,
      providerProductId: product.id!,
    }));
};

const getUnwraptCatalog = async (limit: number): Promise<CatalogItem[]> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return [];

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin
    .from("products")
    .select("id, title, description, price, currency, featured_image_url")
    .eq("active", true)
    .eq("available_for_sale", true)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((product) => ({
    id: String(product.id),
    name: String(product.title),
    brand: "Unwrapt collection",
    description: product.description ? String(product.description) : null,
    imageUrl: product.featured_image_url ? String(product.featured_image_url) : null,
    price: product.price === null ? null : Number(product.price),
    currency: String(product.currency || "USD"),
    provider: "unwrapt" as const,
    providerProductId: null,
  }));
};

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return json({ success: false, error: "Server configuration unavailable" }, 503);
    }

    const accessToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!accessToken) return json({ success: false, error: "Unauthorized" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
    if (userError || !user) return json({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();
    if (body?.action !== "recommend") {
      return json({ success: false, error: "Unknown action" }, 400);
    }

    const interests = cleanInterests(body.interests);
    const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 6);

    try {
      const products = await getGoodyCatalog(interests, limit);
      if (products.length > 0) return json({ success: true, source: "goody", products });
    } catch (error) {
      console.error("Goody catalog unavailable; using Unwrapt fallback", error);
    }

    const products = await getUnwraptCatalog(limit);
    return json({ success: true, source: "unwrapt", products });
  } catch (error) {
    console.error("gift-catalog failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to load the gift catalog",
    }, 500);
  }
});
