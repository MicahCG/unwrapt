
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useShopifyProductTypes = () => {
  return useQuery({
    queryKey: ['shopify-product-types'],
    queryFn: async () => {
      try {
        // Fetch the actual product name from Shopify using our edge function
        const { data, error } = await supabase.functions.invoke('shopify-product', {
          body: {
            variantId: 44718901371329
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        return {
          success: true,
          productTypes: [data.productName || 'Vanilla Candle']
        };
      } catch (error) {
        console.log('Failed to fetch product name from Shopify, using fallback:', error);
        // Fallback to a single default option
        return {
          success: true,
          productTypes: ['Vanilla Candle']
        };
      }
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
  });
};
