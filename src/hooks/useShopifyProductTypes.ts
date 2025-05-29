
import { useQuery } from '@tanstack/react-query';

// Predefined gift types that match your actual products
const PREDEFINED_GIFT_TYPES = [
  'Candles',
  'Coffee & Tea',
  'Books',
  'Skincare',
  'Wellness',
  'Technology',
  'Cooking',
  'Pet Supplies',
  'Travel',
  'Fitness',
  'Art Supplies',
  'Music',
  'Gaming',
  'Fashion',
  'Home Decor',
  'Jewelry',
  'Outdoor',
  'Sports'
];

export const useShopifyProductTypes = () => {
  return useQuery({
    queryKey: ['shopify-product-types'],
    queryFn: async () => {
      // Return predefined types immediately for better UX
      return {
        success: true,
        productTypes: PREDEFINED_GIFT_TYPES
      };
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
  });
};
