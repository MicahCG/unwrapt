/**
 * Gift Vibe System
 *
 * Three core vibes for effortless personalization:
 * - CALM_COMFORT: Cozy, soothing, relaxing, ambience
 * - ARTFUL_UNIQUE: Handmade, ritual, heritage, craft, story-driven
 * - REFINED_STYLISH: Elegant design, glassware, striking decor, barware
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
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  handle: string;
  description: string | null;
  price: number;
  currency: string;
  featured_image_url: string | null;
  product_type: string | null;
  gift_vibe: GiftVibe;
  inventory: number;
  available_for_sale: boolean;
  rank: number;
  active: boolean;
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

/**
 * House Essentials (Universal Defaults)
 * These are our go-to gifts when no preference is set or budget is tight.
 * All are CALM_COMFORT vibe.
 */
export const HOUSE_ESSENTIALS = {
  premium: 'serene-mist-aromatherapy', // $78
  standard: 'ashen-mountain-candle',   // $89
  budget: 'eclipse-pine-candle'         // $45
} as const;

/**
 * Select a house essential gift based on available budget
 */
export function selectHouseEssential(availableBalance: number): string {
  if (availableBalance >= 78) {
    return HOUSE_ESSENTIALS.premium;
  } else if (availableBalance >= 45) {
    return HOUSE_ESSENTIALS.budget;
  } else {
    // Even if they can't afford it, return the cheapest option
    // so they know what to save for
    return HOUSE_ESSENTIALS.budget;
  }
}

/**
 * Get products for a specific gift vibe within budget
 */
export async function getProductsByVibe(
  vibe: GiftVibe,
  maxPrice: number
): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('gift_vibe', vibe)
      .eq('active', true)
      .eq('available_for_sale', true)
      .lte('price', maxPrice)
      .order('rank', { ascending: true })
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching products by vibe:', error);
      return [];
    }

    return (data || []) as Product[];
  } catch (error) {
    console.error('Error in getProductsByVibe:', error);
    return [];
  }
}

/**
 * Get house essential products
 */
export async function getHouseEssentials(maxPrice: number = 100): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('gift_vibe', 'CALM_COMFORT')
      .eq('active', true)
      .eq('available_for_sale', true)
      .lte('price', maxPrice)
      .order('rank', { ascending: true })
      .order('price', { ascending: true })
      .limit(3);

    if (error) {
      console.error('Error fetching house essentials:', error);
      return [];
    }

    return (data || []) as Product[];
  } catch (error) {
    console.error('Error in getHouseEssentials:', error);
    return [];
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      return null;
    }

    return data as Product;
  } catch (error) {
    console.error('Error in getProductById:', error);
    return null;
  }
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
 * 4. Pick the highest-ranked gift within budget
 * 5. If no gifts fit → fall back to house essentials
 */
export async function selectGiftForRecipient(params: {
  recipientVibe?: GiftVibe | null;
  availableBalance: number;
  occasionType?: 'birthday' | 'anniversary' | 'custom';
}): Promise<Product | null> {
  const { recipientVibe, availableBalance } = params;

  try {
    // Determine target vibe
    const targetVibe = recipientVibe || 'CALM_COMFORT';

    // Get candidate gifts for that vibe
    const candidates = await getProductsByVibe(targetVibe, availableBalance);

    if (candidates.length > 0) {
      // Pick the highest-ranked (first) gift within budget
      return candidates[0];
    }

    // Fallback: Try house essentials if vibe-specific search failed
    console.log(`No gifts found for vibe ${targetVibe} within budget $${availableBalance}, falling back to house essentials`);

    const essentials = await getHouseEssentials(availableBalance);

    if (essentials.length > 0) {
      return essentials[0];
    }

    // Last resort: Return the cheapest house essential even if over budget
    // This helps the user know what they need to save for
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', HOUSE_ESSENTIALS.budget)
      .single();

    if (error) {
      console.error('Error fetching fallback product:', error);
      return null;
    }

    return data as Product;

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

    // Get the cheapest gift in this vibe
    const { data, error } = await supabase
      .from('products')
      .select('price')
      .eq('gift_vibe', targetVibe)
      .eq('active', true)
      .eq('available_for_sale', true)
      .order('price', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      // Return average house essential price as fallback
      return 70;
    }

    return data.price;
  } catch (error) {
    console.error('Error estimating gift cost:', error);
    return 70; // Default estimate
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
    // Try to find a gift within budget
    const candidates = await getProductsByVibe(recipientVibe, availableBalance);

    if (candidates.length > 0) {
      return {
        canAfford: true,
        matchedGift: candidates[0]
      };
    }

    // Get the cheapest option in this vibe (even if over budget)
    const { data: cheapest, error } = await supabase
      .from('products')
      .select('*')
      .eq('gift_vibe', recipientVibe)
      .eq('active', true)
      .eq('available_for_sale', true)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !cheapest) {
      return { canAfford: false };
    }

    return {
      canAfford: false,
      cheapestOption: cheapest as Product,
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
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('available_for_sale', true);

    if (params?.vibe) {
      query = query.eq('gift_vibe', params.vibe);
    }

    if (params?.maxPrice) {
      query = query.lte('price', params.maxPrice);
    }

    if (params?.minPrice) {
      query = query.gte('price', params.minPrice);
    }

    query = query.order('gift_vibe', { ascending: true })
                 .order('rank', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all products:', error);
      return [];
    }

    return (data || []) as Product[];
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    return [];
  }
}
