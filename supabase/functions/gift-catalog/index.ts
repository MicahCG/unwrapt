import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

// Inlined rather than imported from ../_shared/cors.ts so this function is a
// single self-contained file, pastable directly into the Supabase Dashboard
// function editor (which only sees this one file, not sibling folders).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }
};

type CatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  provider: "goody";
  providerProductId: string | null;
  vibe?: GiftVibe;
};

type GiftVibe = "CALM_COMFORT" | "ARTFUL_UNIQUE" | "REFINED_STYLISH";

const VIBE_KEYWORDS: Record<GiftVibe, string[]> = {
  CALM_COMFORT: [
    "candle", "aroma", "cozy", "relax", "soothing", "spa", "bath", "tea", "blanket",
    "comfort", "self-care", "self care", "calm", "sleep", "wellness", "massage",
  ],
  ARTFUL_UNIQUE: [
    "handmade", "artisan", "heritage", "craft", "ceramic", "pottery", "incense",
    "story", "hand-carved", "hand carved", "ritual", "culture", "traditional", "art",
  ],
  REFINED_STYLISH: [
    "glass", "crystal", "barware", "decor", "elegant", "vase", "sculpt", "design",
    "leather", "marble", "brass", "sophisticated", "modern", "statement",
  ],
};

const scoreVibe = (text: string, vibe: GiftVibe) =>
  VIBE_KEYWORDS[vibe].reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);

const bestVibe = (text: string): GiftVibe => {
  const vibes = Object.keys(VIBE_KEYWORDS) as GiftVibe[];
  let best = vibes[0];
  let bestScore = -1;
  for (const vibe of vibes) {
    const score = scoreVibe(text, vibe);
    if (score > bestScore) {
      best = vibe;
      bestScore = score;
    }
  }
  // No keyword matched anything: default to the safest, broadly-applicable vibe.
  return bestScore > 0 ? best : "CALM_COMFORT";
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

const INTEREST_KEYWORDS: Record<string, string[]> = {
  golf: ["golf", "golfer", "course", "putting"],
  travel: ["travel", "luggage", "passport", "carry-on", "weekender", "trip"],
  coffee: ["coffee", "espresso", "latte", "roast", "mug", "brew"],
  fitness: ["fitness", "workout", "gym", "yoga", "recovery", "active"],
  cooking: ["cooking", "cookware", "cookbook", "kitchen", "chef", "recipe", "culinary", "pantry", "sauce", "spice", "olive oil", "baking", "bake"],
  wine: ["wine", "sommelier", "vineyard", "bottle", "barware", "tumbler"],
  reading: ["book", "reading", "literary", "journal", "bookstore"],
  music: ["music", "audio", "speaker", "vinyl", "concert", "headphone"],
  fashion: ["fashion", "style", "jewelry", "scarf", "bag", "leather", "accessory"],
  gaming: ["game", "gaming", "puzzle", "cards", "board game"],
  art: ["art", "artist", "paint", "design", "museum", "craft"],
  pets: ["pet", "dog", "cat", "leash"],
  tech: ["tech", "charger", "wireless", "bluetooth", "gadget"],
  outdoors: ["outdoor", "camping", "hiking", "picnic", "adventure"],
  whiskey: ["whiskey", "whisky", "bourbon", "scotch", "barware"],
  "premium experiences": ["experience", "tasting", "class", "tour", "membership"],
};

const scoreText = (text: string, interests: string[]) =>
  interests.reduce((score, interest) => {
    const keywords = INTEREST_KEYWORDS[interest] || [interest];
    return score + keywords.reduce((interestScore, keyword) => (
      interestScore + (text.includes(keyword) ? (keyword === interest ? 4 : 1) : 0)
    ), 0);
  }, 0);

const goodyImage = (product: GoodyProduct) =>
  product.images?.[0]?.image_large?.url || product.variants?.[0]?.image_large?.url || null;

const fetchGoodyProducts = async (): Promise<GoodyProduct[]> => {
  const environment = Deno.env.get("GOODY_API_ENV") === "production" ? "production" : "sandbox";
  const apiKey = environment === "production"
    ? Deno.env.get("GOODY_PRODUCTION_COMMERCE_API_KEY")
    : Deno.env.get("GOODY_SANDBOX_COMMERCE_API_KEY");
  if (!apiKey) return [];

  const baseUrl = environment === "production"
    ? "https://api.ongoody.com"
    : "https://api.sandbox.ongoody.com";
  const response = await fetch(`${baseUrl}/v1/products?page=1&per_page=100`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Goody catalog request failed with ${response.status}`);
  const payload = await response.json() as { data?: GoodyProduct[] };
  return (payload.data || []).filter((product) => product.id && product.name);
};

const productText = (product: GoodyProduct) =>
  [product.name, product.brand?.name, product.subtitle, product.subtitle_short, product.recipient_description]
    .filter(Boolean).join(" ").toLowerCase();

const productLabelText = (product: GoodyProduct) =>
  [product.name, product.brand?.name]
    .filter(Boolean).join(" ").toLowerCase();

const toCatalogItem = (product: GoodyProduct): CatalogItem => ({
  id: product.id!,
  name: product.name!,
  brand: product.brand?.name || null,
  description: product.subtitle_short || product.subtitle || product.recipient_description || null,
  imageUrl: goodyImage(product),
  price: typeof product.price === "number" ? product.price / 100 : null,
  currency: "USD",
  provider: "goody" as const,
  providerProductId: product.id!,
});

const getGoodyCatalog = async (interests: string[], limit: number): Promise<CatalogItem[]> => {
  const products = await fetchGoodyProducts();
  const scoredProducts = products
    .map((product) => ({
      product,
      score: scoreText(productText(product), interests),
      labelScore: scoreText(productLabelText(product), interests),
    }));
  const relevantProducts = interests.length
    ? scoredProducts.filter(({ labelScore }) => labelScore > 0)
    : scoredProducts;
  return relevantProducts
    .sort((a, b) => b.score - a.score || Number(a.product.price || 0) - Number(b.product.price || 0))
    .slice(0, limit)
    .map(({ product }) => toCatalogItem(product));
};

// Tags every product with its best-guess vibe so callers (the gift-vibe
// selection system in src/lib/giftVibes.ts) can filter/sort client-side, the
// same way they used to filter the old products table by its gift_vibe column.
const getGoodyCatalogByVibe = async (): Promise<Array<CatalogItem & { vibe: GiftVibe }>> => {
  const products = await fetchGoodyProducts();
  return products
    .map((product) => ({ ...toCatalogItem(product), vibe: bestVibe(productText(product)) }))
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
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

    if (body?.action === "browse_by_vibe") {
      const products = await getGoodyCatalogByVibe();
      return json({ success: true, source: "goody", products });
    }

    if (body?.action !== "recommend") {
      return json({ success: false, error: "Unknown action" }, 400);
    }

    const interests = cleanInterests(body.interests);
    const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 6);

    const products = await getGoodyCatalog(interests, limit);
    return json({ success: true, source: "goody", products });
  } catch (error) {
    console.error("gift-catalog failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to load the gift catalog",
    }, 500);
  }
});
