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
  why?: string | null;
  fit?: "exact" | "adjacent";
};

type AskUserOffer = {
  interest: string;
  alternative: string;
  question: string;
};

type GiftVibe = "CALM_COMFORT" | "ARTFUL_UNIQUE" | "REFINED_STYLISH";

const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const GOODY_MAX_PAGES = 10;

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
    .slice(0, 5);
};

const goodyImage = (product: GoodyProduct) =>
  product.images?.[0]?.image_large?.url || product.variants?.[0]?.image_large?.url || null;

/** Pull as much of the live Goody catalog as we can, not just page 1. */
const fetchGoodyProducts = async (): Promise<GoodyProduct[]> => {
  const environment = Deno.env.get("GOODY_API_ENV") === "production" ? "production" : "sandbox";
  const apiKey = environment === "production"
    ? Deno.env.get("GOODY_PRODUCTION_COMMERCE_API_KEY")
    : Deno.env.get("GOODY_SANDBOX_COMMERCE_API_KEY");
  if (!apiKey) return [];

  const baseUrl = environment === "production"
    ? "https://api.ongoody.com"
    : "https://api.sandbox.ongoody.com";

  const seen = new Set<string>();
  const products: GoodyProduct[] = [];

  for (let page = 1; page <= GOODY_MAX_PAGES; page++) {
    const response = await fetch(`${baseUrl}/v1/products?page=${page}&per_page=100`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) break;
    const payload = await response.json() as { data?: GoodyProduct[] };
    const batch = (payload.data || []).filter((product) => product.id && product.name);
    if (!batch.length) break;
    for (const product of batch) {
      if (seen.has(product.id!)) continue;
      seen.add(product.id!);
      products.push(product);
    }
    if (batch.length < 100) break;
  }

  return products;
};

const productText = (product: GoodyProduct) =>
  [product.name, product.brand?.name, product.subtitle, product.subtitle_short, product.recipient_description]
    .filter(Boolean).join(" ").toLowerCase();

const toCatalogItem = (
  product: GoodyProduct,
  why: string | null = null,
  fit: "exact" | "adjacent" | null = null,
): CatalogItem => ({
  id: product.id!,
  name: product.name!,
  brand: product.brand?.name || null,
  description: product.subtitle_short || product.subtitle || product.recipient_description || null,
  imageUrl: goodyImage(product),
  price: typeof product.price === "number" ? product.price / 100 : null,
  currency: "USD",
  provider: "goody" as const,
  providerProductId: product.id!,
  why,
  fit: fit || undefined,
});

const fallbackSearchTerms = (interests: string[]) => {
  const terms = new Set<string>();
  for (const interest of interests) {
    terms.add(interest);
    for (const token of interest.split(/[^a-z0-9]+/i)) {
      const t = token.trim().toLowerCase();
      if (t.length >= 3) terms.add(t);
      const singular = t.replace(/ies$/, "y").replace(/s$/, "");
      if (singular.length >= 3) terms.add(singular);
    }
  }
  return [...terms];
};

type SearchPlan = {
  searchTerms: string[];
  adjacentInterests: string[];
};

/** Agent step 1: decide how to scan the full catalog, including close family / substitutes. */
const planCatalogSearch = async (interests: string[]): Promise<SearchPlan> => {
  const fallback = {
    searchTerms: fallbackSearchTerms(interests),
    adjacentInterests: [] as string[],
  };
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_tokens: 350,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You plan gift catalog search for Unwrapt. Given recipient interests, return JSON:
{
  "search_terms": string[],
  "adjacent_interests": string[]
}

Rules:
- search_terms: concrete words/phrases likely to appear in product titles or descriptions. Be generous so we do not miss stock across a large catalog.
- Include the exact interest and close family terms (example: succulents → plant, planter, botanical, houseplant, cactus, terrarium, garden).
- For substitutes that need a human OK if exact stock is missing, put them in adjacent_interests (example: red wine → white wine, rose, sparkling wine).
- Do not invent unrelated categories (plants should not become beauty or kitchen tools).
- 8 to 20 search_terms. 0 to 5 adjacent_interests.`,
          },
          { role: "user", content: JSON.stringify({ interests }) },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return fallback;
    const result = await response.json();
    const content = JSON.parse(result.choices?.[0]?.message?.content || "{}");
    const searchTerms = Array.isArray(content.search_terms)
      ? content.search_terms
        .filter((v: unknown): v is string => typeof v === "string" && v.trim().length >= 2)
        .map((v: string) => v.trim().toLowerCase())
        .slice(0, 24)
      : [];
    const adjacentInterests = Array.isArray(content.adjacent_interests)
      ? content.adjacent_interests
        .filter((v: unknown): v is string => typeof v === "string" && v.trim().length >= 2)
        .map((v: string) => v.trim().toLowerCase())
        .slice(0, 6)
      : [];
    return {
      searchTerms: [...new Set([...searchTerms, ...fallback.searchTerms])],
      adjacentInterests,
    };
  } catch {
    return fallback;
  }
};

const shortlistByTerms = (
  products: GoodyProduct[],
  terms: string[],
): Array<{ product: GoodyProduct; score: number; hits: string[] }> => {
  const usable = terms.map((t) => t.toLowerCase()).filter((t) => t.length >= 2);
  return products
    .map((product) => {
      const text = productText(product);
      const hits = usable.filter((term) => text.includes(term));
      const score = hits.reduce((sum, term) => sum + (term.length >= 6 ? 4 : 2), 0);
      return { product, score, hits };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      Number(a.product.price || 0) - Number(b.product.price || 0)
    );
};

type CurateResult = {
  picks: Array<{ id: string; why: string; fit: "exact" | "adjacent" }>;
  askUser: AskUserOffer[];
};

/** Agent step 2: choose gifts from shortlist, or ask about a live adjacent option. */
const curateFromShortlist = async (
  interests: string[],
  adjacentInterests: string[],
  shortlist: Array<{ product: GoodyProduct; score: number; hits: string[] }>,
  limit: number,
): Promise<CurateResult> => {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    return {
      picks: shortlist.slice(0, limit).map((row) => ({
        id: row.product.id!,
        why: `Matched on ${row.hits.slice(0, 2).join(", ")}`,
        fit: "exact" as const,
      })),
      askUser: [],
    };
  }

  const candidates = shortlist.slice(0, 40).map((row) => ({
    id: row.product.id,
    name: row.product.name,
    brand: row.product.brand?.name || null,
    description: (row.product.subtitle_short || row.product.subtitle || row.product.recipient_description || "")
      .toString()
      .slice(0, 160),
    hits: row.hits.slice(0, 6),
    score: row.score,
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.25,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are Unwrapt's gift matching agent. You choose live catalog gifts for a recipient based on stated interests.

Return JSON:
{
  "picks": [{ "id": string, "why": string, "fit": "exact" | "adjacent" }],
  "ask_user": [{ "interest": string, "alternative": string, "question": string }]
}

Decision rules:
1. Prefer exact interest matches.
2. If exact stock is missing, pick the closest family gift that still belongs to the same interest world.
   Example: no succulents → another plant, planter, or botanical gift is good (fit: "adjacent"). Be honest in why.
3. If the best live option is a substitute that needs permission, do NOT force it as a pick. Put it in ask_user.
   Example: they want red wine, catalog only has white wine → ask_user question like
   "I don't see red wine gifts live right now. Would white wine also work for them?"
4. Never pick unrelated filler. Nail polish, random kitchen tools, or beauty products are not plant gifts.
5. At most ${limit} picks. Use only candidate ids. Empty picks is OK when nothing is reasonable.
6. ask_user only when an alternative is actually represented in the candidate list (or clearly available via hits). Max 2 questions.
7. No em dashes. Keep why and question short and human.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              interests,
              adjacent_interests_hint: adjacentInterests,
              candidates,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        picks: shortlist.slice(0, limit).map((row) => ({
          id: row.product.id!,
          why: `Matched on ${row.hits.slice(0, 2).join(", ")}`,
          fit: "exact" as const,
        })),
        askUser: [],
      };
    }

    const result = await response.json();
    const content = JSON.parse(result.choices?.[0]?.message?.content || "{}");
    const allowed = new Set(shortlist.map((row) => row.product.id!));
    const picks: CurateResult["picks"] = [];
    for (const pick of Array.isArray(content.picks) ? content.picks : []) {
      const id = typeof pick?.id === "string" ? pick.id : "";
      if (!id || !allowed.has(id) || picks.some((p) => p.id === id)) continue;
      const fit = pick?.fit === "adjacent" ? "adjacent" : "exact";
      const why = typeof pick?.why === "string"
        ? pick.why.replace(/\s*[\u2014\u2013]\s*/g, ", ").trim().slice(0, 140)
        : fit === "adjacent"
          ? "Close match from what is live in stock"
          : "Matches what you shared";
      picks.push({ id, why, fit });
      if (picks.length >= limit) break;
    }

    const askUser: AskUserOffer[] = [];
    for (const offer of Array.isArray(content.ask_user) ? content.ask_user : []) {
      if (typeof offer?.interest !== "string" || typeof offer?.alternative !== "string" || typeof offer?.question !== "string") {
        continue;
      }
      askUser.push({
        interest: offer.interest.trim().slice(0, 60),
        alternative: offer.alternative.trim().slice(0, 60),
        question: offer.question.replace(/\s*[\u2014\u2013]\s*/g, ", ").trim().slice(0, 200),
      });
      if (askUser.length >= 2) break;
    }

    return { picks, askUser };
  } catch {
    return {
      picks: shortlist.slice(0, limit).map((row) => ({
        id: row.product.id!,
        why: `Matched on ${row.hits.slice(0, 2).join(", ")}`,
        fit: "exact" as const,
      })),
      askUser: [],
    };
  }
};

const getGoodyCatalog = async (
  interests: string[],
  limit: number,
): Promise<{
  products: CatalogItem[];
  matchedInterests: string[];
  unmatchedInterests: string[];
  askUser: AskUserOffer[];
}> => {
  const products = await fetchGoodyProducts();

  if (!interests.length) {
    return {
      products: products.slice(0, limit).map((product) => toCatalogItem(product)),
      matchedInterests: [],
      unmatchedInterests: [],
      askUser: [],
    };
  }

  const plan = await planCatalogSearch(interests);
  const scanTerms = [...new Set([...plan.searchTerms, ...plan.adjacentInterests])];
  const shortlist = shortlistByTerms(products, scanTerms);

  // If term scan found nothing, give the agent a wider name-only window from the full catalog.
  const agentPool = shortlist.length
    ? shortlist
    : products.slice(0, 80).map((product) => ({ product, score: 0, hits: [] as string[] }));

  const curated = await curateFromShortlist(
    interests,
    plan.adjacentInterests,
    agentPool,
    limit,
  );

  // If we had no term hits and the agent still couldn't find relevance, return empty + ask.
  if (!shortlist.length && curated.picks.length === 0) {
    return {
      products: [],
      matchedInterests: [],
      unmatchedInterests: interests,
      askUser: curated.askUser.length
        ? curated.askUser
        : interests.slice(0, 1).map((interest) => ({
          interest,
          alternative: plan.adjacentInterests[0] || "a close alternative",
          question: plan.adjacentInterests[0]
            ? `I couldn't find a live match for ${interest} yet. Would ${plan.adjacentInterests[0]} work instead?`
            : `I couldn't find a live match for ${interest} yet. Want me to try a close alternative?`,
        })),
    };
  }

  const byId = new Map(products.map((product) => [product.id!, product]));
  const chosen = curated.picks
    .map((pick) => {
      const product = byId.get(pick.id);
      return product ? toCatalogItem(product, pick.why, pick.fit) : null;
    })
    .filter((item): item is CatalogItem => Boolean(item));

  // Honest match labels: if we only showed adjacent fits, keep original interest unmatched.
  const exactIds = new Set(curated.picks.filter((p) => p.fit === "exact").map((p) => p.id));
  const matchedInterests = interests.filter((interest) =>
    chosen.some((product) => {
      if (!exactIds.has(product.id)) return false;
      const text = `${product.name} ${product.description || ""}`.toLowerCase();
      return text.includes(interest) || interest.split(/\s+/).some((t) => t.length >= 4 && text.includes(t));
    })
  );
  // If we have any exact picks, treat interests as matched when the agent said exact.
  const matched = curated.picks.some((p) => p.fit === "exact")
    ? (matchedInterests.length ? matchedInterests : interests)
    : matchedInterests;
  const unmatchedInterests = interests.filter((interest) => !matched.includes(interest));

  return {
    products: chosen,
    matchedInterests: matched,
    unmatchedInterests,
    askUser: curated.askUser,
  };
};

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

    const { products, matchedInterests, unmatchedInterests, askUser } = await getGoodyCatalog(interests, limit);
    return json({
      success: true,
      source: "goody",
      products,
      matchedInterests,
      unmatchedInterests,
      askUser,
    });
  } catch (error) {
    console.error("gift-catalog failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unable to load the gift catalog",
    }, 500);
  }
});
