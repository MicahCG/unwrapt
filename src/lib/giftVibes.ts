/**
 * Gift Vibe System
 *
 * Three core vibes for effortless personalization:
 * - CALM_COMFORT: Cozy, soothing, relaxing, ambience
 * - ARTFUL_UNIQUE: Handmade, ritual, heritage, craft, story-driven
 * - REFINED_STYLISH: Elegant design, glassware, striking decor, barware
 *
 * Sourced from Goody's live catalog via the gift-catalog edge function's
 * `browse_by_vibe` action, which tags each product with a best-guess vibe
 * (Goody has no vibe taxonomy of its own, so this is a keyword-based
 * approximation — see VIBE_KEYWORDS in supabase/functions/gift-catalog).
 */

import { supabase } from '@/integrations/supabase/client';

export type GiftVibe = 'CALM_COMFORT' | 'ARTFUL_UNIQUE' | 'REFINED_STYLISH';

export interface GiftVibeOption {
  vibe: GiftVibe;
  label: string;
  description: string;
  examples: string;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  featured_image_url: string | null;
  product_type: string | null;
  gift_vibe: GiftVibe;
}

/**
 * Gift Vibe Options for UI Display
 */
export const GIFT_VIBE_OPTIONS: GiftVibeOption[] = [
  {
    vibe: 'CALM_COMFORT',
    label: 'Calm & Comfort',
    description: 'Soft lighting, soothing scents, cozy rituals.',
    examples: 'Candles, aromatherapy, relaxation'
  },
  {
    vibe: 'ARTFUL_UNIQUE',
    label: 'Artful & Cultural',
    description: 'Handmade pieces, heritage details, objects with a story.',
    examples: 'Pottery, incense, artisan crafts'
  },
  {
    vibe: 'REFINED_STYLISH',
    label: 'Refined & Stylish',
    description: 'Elegant glassware, sculpted decor, statement pieces.',
    examples: 'Kiriko glass, vases, barware'
  }
];

let cachedCatalog: { products: Product[]; fetchedAt: number } | null = null;
const CATALOG_CACHE_MS = 5 * 60 * 1000;

/**
 * Fetch the full Goody catalog, each item tagged with a best-guess vibe.
 * Cached in-memory for a few minutes since this is called from several
 * helpers below and the underlying catalog doesn't change second to second.
 */
async function fetchGoodyCatalog(): Promise<Product[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < CATALOG_CACHE_MS) {
    return cachedCatalog.products;
  }

  try {
    const { data, error } = await supabase.functions.invoke('gift-catalog', {
      body: { action: 'browse_by_vibe' },
    });

    if (error || !data?.success) {
      console.error('Error fetching Goody catalog:', error || data?.error);
      return cachedCatalog?.products || [];
    }

    const products: Product[] = (data.products || []).map((p: any) => ({
      id: p.id,
      title: p.name,
      description: p.description,
      price: p.price ?? 0,
      currency: p.currency || 'USD',
      featured_image_url: p.imageUrl,
      product_type: p.brand,
      gift_vibe: p.vibe,
    }));

    cachedCatalog = { products, fetchedAt: Date.now() };
    return products;
  } catch (error) {
    console.error('Error in fetchGoodyCatalog:', error);
    return cachedCatalog?.products || [];
  }
}

/**
 * Get products for a specific gift vibe within budget
 */
export async function getProductsByVibe(
  vibe: GiftVibe,
  maxPrice: number
): Promise<Product[]> {
  const catalog = await fetchGoodyCatalog();
  return catalog
    .filter((p) => p.gift_vibe === vibe && p.price <= maxPrice)
    .sort((a, b) => a.price - b.price);
}

/**
 * Get house essential products
 */
export async function getHouseEssentials(maxPrice: number = 100): Promise<Product[]> {
  return (await getProductsByVibe('CALM_COMFORT', maxPrice)).slice(0, 3);
}

/**
 * Get a single product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  const catalog = await fetchGoodyCatalog();
  return catalog.find((p) => p.id === productId) || null;
}

/**
 * Get multiple products by ID in one lookup (avoids N calls for previews
 * like the dashboard's upcoming-gift/default-gift cards).
 */
export async function getProductsByIds(productIds: string[]): Promise<Record<string, Product>> {
  if (productIds.length === 0) return {};
  const catalog = await fetchGoodyCatalog();
  const idSet = new Set(productIds);
  const map: Record<string, Product> = {};
  for (const product of catalog) {
    if (idSet.has(product.id)) map[product.id] = product;
  }
  return map;
}

/**
 * Main gift selection algorithm
 *
 * This is called when:
 * - Auto-scheduling a gift for a recipient
 * - Pre-suggesting gifts during VIP onboarding
 * - User enables automation for a recipient
 *
 * Logic:
 * 1. If recipient has a preferred_gift_vibe → filter by that vibe
 * 2. If no vibe set → use CALM_COMFORT (house essentials)
 * 3. Filter by budget (available balance / number of gifts to schedule)
 * 4. Pick the cheapest-fit gift within budget
 * 5. If no gifts fit → fall back to house essentials
 */
export async function selectGiftForRecipient(params: {
  recipientVibe?: GiftVibe | null;
  availableBalance: number;
  occasionType?: 'birthday' | 'anniversary' | 'custom';
}): Promise<Product | null> {
  const { recipientVibe, availableBalance } = params;

  try {
    const targetVibe = recipientVibe || 'CALM_COMFORT';
    const candidates = await getProductsByVibe(targetVibe, availableBalance);

    if (candidates.length > 0) {
      return candidates[0];
    }

    console.log(`No gifts found for vibe ${targetVibe} within budget $${availableBalance}, falling back to house essentials`);

    const essentials = await getHouseEssentials(availableBalance);
    if (essentials.length > 0) {
      return essentials[0];
    }

    // Last resort: cheapest CALM_COMFORT item regardless of budget, so the
    // user knows what they'd need to save for.
    const catalog = await fetchGoodyCatalog();
    const cheapest = catalog
      .filter((p) => p.gift_vibe === 'CALM_COMFORT')
      .sort((a, b) => a.price - b.price)[0];
    return cheapest || null;

  } catch (error) {
    console.error('Error in selectGiftForRecipient:', error);
    return null;
  }
}

/**
 * Estimate gift cost for a recipient (for budget planning)
 */
export async function estimateGiftCost(params: {
  recipientVibe?: GiftVibe | null;
  occasionType?: 'birthday' | 'anniversary' | 'custom';
}): Promise<number> {
  const { recipientVibe } = params;

  try {
    const targetVibe = recipientVibe || 'CALM_COMFORT';
    const catalog = await fetchGoodyCatalog();
    const cheapest = catalog
      .filter((p) => p.gift_vibe === targetVibe)
      .sort((a, b) => a.price - b.price)[0];

    return cheapest ? cheapest.price : 70; // fallback estimate
  } catch (error) {
    console.error('Error estimating gift cost:', error);
    return 70;
  }
}

/**
 * Check if recipient's vibe preference can be satisfied within budget
 */
export async function checkVibeBudgetMatch(params: {
  recipientVibe: GiftVibe;
  availableBalance: number;
}): Promise<{
  canAfford: boolean;
  matchedGift?: Product;
  cheapestOption?: Product;
  shortfall?: number;
}> {
  const { recipientVibe, availableBalance } = params;

  try {
    const candidates = await getProductsByVibe(recipientVibe, availableBalance);
    if (candidates.length > 0) {
      return { canAfford: true, matchedGift: candidates[0] };
    }

    const catalog = await fetchGoodyCatalog();
    const cheapest = catalog
      .filter((p) => p.gift_vibe === recipientVibe)
      .sort((a, b) => a.price - b.price)[0];

    if (!cheapest) return { canAfford: false };

    return {
      canAfford: false,
      cheapestOption: cheapest,
      shortfall: cheapest.price - availableBalance
    };

  } catch (error) {
    console.error('Error in checkVibeBudgetMatch:', error);
    return { canAfford: false };
  }
}

/**
 * Get all products for browsing/selection
 */
export async function getAllProducts(params?: {
  vibe?: GiftVibe;
  maxPrice?: number;
  minPrice?: number;
}): Promise<Product[]> {
  const catalog = await fetchGoodyCatalog();
  return catalog
    .filter((p) => !params?.vibe || p.gift_vibe === params.vibe)
    .filter((p) => params?.maxPrice === undefined || p.price <= params.maxPrice)
    .filter((p) => params?.minPrice === undefined || p.price >= params.minPrice)
    .sort((a, b) => a.gift_vibe.localeCompare(b.gift_vibe) || a.price - b.price);
}
