
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useShopifyProductTypes = () => {
  return useQuery({
    queryKey: ['shopify-product-types'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-shopify-product-types');
      
      if (error) {
        console.error('Error fetching product types:', error);
        // Return fallback options if Shopify is unavailable
        return {
          success: false,
          productTypes: [
            'Electronics',
            'Clothing',
            'Books',
            'Home & Garden',
            'Sports & Outdoors',
            'Beauty & Personal Care',
            'Jewelry',
            'Experience',
            'Food & Beverages',
            'Custom'
          ]
        };
      }
      
      return data;
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour (renamed from cacheTime)
    retry: 1,
    meta: {
      onError: (error: Error) => {
        console.error('Failed to fetch Shopify product types:', error);
      }
    }
  });
};
