/**
 * Default Gift Selection Logic
 *
 * Universal defaults for when no recipient interests are set,
 * or when we need a fallback option.
 */

export interface GiftOption {
  variantId: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  category: 'universal' | 'interest-based';
  interests?: string[];
}

/**
 * Universal Default Gifts (No interests required)
 * These are high-quality, universally appreciated gifts
 */
export const UNIVERSAL_DEFAULTS: GiftOption[] = [
  {
    variantId: 'gid://shopify/ProductVariant/ashen-mountain-black',
    productId: 'gid://shopify/Product/ashen-mountain-candle',
    name: 'AromaSphere Candle',
    description: 'Premium black luxury candle with rich, sophisticated scent',
    price: 45.00,
    category: 'universal'
  },
  {
    variantId: 'gid://shopify/ProductVariant/amberwood-brown',
    productId: 'gid://shopify/Product/amberwood-candle',
    name: 'Amberwood Scented Candle',
    description: 'Artisan-style brown candle with warm, inviting amber notes',
    price: 45.00,
    category: 'universal'
  },
  {
    variantId: 'gid://shopify/ProductVariant/serene-mist-diffuser',
    productId: 'gid://shopify/Product/serene-mist-set',
    name: 'Serene Mist Aromatherapy Set',
    description: 'Premium flameless aromatherapy diffuser set',
    price: 48.00,
    category: 'universal'
  }
];

/**
 * Interest-Based Gift Mapping
 * Maps recipient interests to curated gift options
 */
export const INTEREST_GIFT_MAP: Record<string, GiftOption[]> = {
  wellness: [
    {
      variantId: 'gid://shopify/ProductVariant/serene-mist-diffuser',
      productId: 'gid://shopify/Product/serene-mist-set',
      name: 'Serene Mist Aromatherapy Set',
      description: 'Premium flameless aromatherapy diffuser set',
      price: 48.00,
      category: 'interest-based',
      interests: ['wellness']
    },
    {
      variantId: 'gid://shopify/ProductVariant/yoga-essentials',
      productId: 'gid://shopify/Product/yoga-set',
      name: 'Yoga Essentials Kit',
      description: 'Complete yoga and meditation set',
      price: 55.00,
      category: 'interest-based',
      interests: ['wellness']
    }
  ],

  cooking: [
    {
      variantId: 'gid://shopify/ProductVariant/cast-iron-teapot',
      productId: 'gid://shopify/Product/cast-iron-teapot',
      name: 'Cast Iron Teapot',
      description: 'Artisan cast iron teapot with beautiful patina',
      price: 52.00,
      category: 'interest-based',
      interests: ['cooking', 'coffee_tea']
    },
    {
      variantId: 'gid://shopify/ProductVariant/gourmet-spice-set',
      productId: 'gid://shopify/Product/spice-collection',
      name: 'Gourmet Spice Collection',
      description: 'Premium artisan spice set',
      price: 45.00,
      category: 'interest-based',
      interests: ['cooking']
    }
  ],

  reading: [
    {
      variantId: 'gid://shopify/ProductVariant/book-light-set',
      productId: 'gid://shopify/Product/reading-essentials',
      name: 'Reading Essentials Set',
      description: 'Book light, bookmark, and reading accessories',
      price: 42.00,
      category: 'interest-based',
      interests: ['reading']
    }
  ],

  coffee_tea: [
    {
      variantId: 'gid://shopify/ProductVariant/cast-iron-teapot',
      productId: 'gid://shopify/Product/cast-iron-teapot',
      name: 'Cast Iron Teapot',
      description: 'Artisan cast iron teapot',
      price: 52.00,
      category: 'interest-based',
      interests: ['coffee_tea', 'cooking']
    },
    {
      variantId: 'gid://shopify/ProductVariant/tea-sampler',
      productId: 'gid://shopify/Product/artisan-tea-set',
      name: 'Artisan Tea Collection',
      description: 'Curated selection of premium teas',
      price: 48.00,
      category: 'interest-based',
      interests: ['coffee_tea']
    }
  ],

  outdoors: [
    {
      variantId: 'gid://shopify/ProductVariant/adventure-journal',
      productId: 'gid://shopify/Product/outdoor-essentials',
      name: 'Adventure Journal Set',
      description: 'Waterproof journal and outdoor accessories',
      price: 45.00,
      category: 'interest-based',
      interests: ['outdoors']
    }
  ],

  art_decor: [
    {
      variantId: 'gid://shopify/ProductVariant/ceramic-collection',
      productId: 'gid://shopify/Product/artisan-ceramics',
      name: 'Artisan Ceramic Collection',
      description: 'Handcrafted ceramic pieces',
      price: 58.00,
      category: 'interest-based',
      interests: ['art_decor']
    },
    UNIVERSAL_DEFAULTS[0], // AromaSphere Candle also good for art/decor
  ],

  tech: [
    {
      variantId: 'gid://shopify/ProductVariant/tech-organizer',
      productId: 'gid://shopify/Product/tech-accessories',
      name: 'Premium Tech Organizer',
      description: 'Leather tech organizer with wireless charging',
      price: 62.00,
      category: 'interest-based',
      interests: ['tech']
    }
  ],

  fashion: [
    {
      variantId: 'gid://shopify/ProductVariant/luxury-scarf',
      productId: 'gid://shopify/Product/fashion-accessories',
      name: 'Luxury Silk Scarf',
      description: 'Premium silk scarf with elegant design',
      price: 68.00,
      category: 'interest-based',
      interests: ['fashion']
    }
  ]
};

/**
 * Get the best gift for a recipient based on interests and budget
 */
export function selectGiftForRecipient(params: {
  interests?: string[];
  availableBalance: number;
  occasionType?: 'birthday' | 'anniversary' | 'custom';
}): GiftOption | null {
  const { interests, availableBalance } = params;

  // If recipient has interests, try to match them
  if (interests && interests.length > 0) {
    for (const interest of interests) {
      const giftOptions = INTEREST_GIFT_MAP[interest] || [];

      // Find first gift within budget
      for (const gift of giftOptions) {
        if (gift.price <= availableBalance) {
          return gift;
        }
      }
    }
  }

  // Fallback to universal defaults
  return selectUniversalDefault(availableBalance);
}

/**
 * Select a universal default gift that fits the budget
 */
export function selectUniversalDefault(availableBalance: number): GiftOption | null {
  for (const gift of UNIVERSAL_DEFAULTS) {
    if (gift.price <= availableBalance) {
      return gift;
    }
  }

  // If balance can't cover even the cheapest default
  return null;
}

/**
 * Check if recipient's interests can be satisfied within budget
 */
export function checkInterestBudgetMatch(params: {
  interests: string[];
  availableBalance: number;
}): {
  canAfford: boolean;
  matchedGift?: GiftOption;
  cheapestOption?: GiftOption;
  shortfall?: number;
} {
  const { interests, availableBalance } = params;

  let cheapestOption: GiftOption | null = null;

  for (const interest of interests) {
    const giftOptions = INTEREST_GIFT_MAP[interest] || [];

    for (const gift of giftOptions) {
      // Track cheapest option for this interest
      if (!cheapestOption || gift.price < cheapestOption.price) {
        cheapestOption = gift;
      }

      // Check if we can afford this gift
      if (gift.price <= availableBalance) {
        return {
          canAfford: true,
          matchedGift: gift
        };
      }
    }
  }

  // Can't afford any interest-based gift
  if (cheapestOption) {
    return {
      canAfford: false,
      cheapestOption,
      shortfall: cheapestOption.price - availableBalance
    };
  }

  // No gifts found for these interests, use universal default
  const universalGift = selectUniversalDefault(availableBalance);

  if (universalGift) {
    return {
      canAfford: true,
      matchedGift: universalGift
    };
  }

  // Can't afford even universal defaults
  return {
    canAfford: false,
    cheapestOption: UNIVERSAL_DEFAULTS[0],
    shortfall: UNIVERSAL_DEFAULTS[0].price - availableBalance
  };
}

/**
 * Get estimated cost for a recipient based on their profile
 */
export function estimateGiftCost(params: {
  interests?: string[];
  occasionType?: 'birthday' | 'anniversary' | 'custom';
}): number {
  const { interests } = params;

  // Base cost
  let baseCost = 45;

  // If they have specific interests, average the costs of those options
  if (interests && interests.length > 0) {
    let totalCost = 0;
    let count = 0;

    for (const interest of interests) {
      const options = INTEREST_GIFT_MAP[interest] || [];
      if (options.length > 0) {
        totalCost += options[0].price; // Use first/best option
        count++;
      }
    }

    if (count > 0) {
      baseCost = totalCost / count;
    }
  }

  return Math.round(baseCost);
}
