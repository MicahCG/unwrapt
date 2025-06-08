
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRODUCT_VARIANTS = {
  VANILLA_CANDLE: 50924986532159,
  COFFEE: 50924986663231
};

export const useShopifyProductTypes = () => {
  return useQuery({
    queryKey: ['shopify-product-types'],
    queryFn: async () => {
      try {
        // Fetch both products from Shopify
        const productRequests = await Promise.allSettled([
          supabase.functions.invoke('shopify-product', {
            body: { variantId: PRODUCT_VARIANTS.VANILLA_CANDLE }
          }),
          supabase.functions.invoke('shopify-product', {
            body: { variantId: PRODUCT_VARIANTS.COFFEE }
          })
        ]);

        const productTypes = [];
        
        // Process vanilla candle
        if (productRequests[0].status === 'fulfilled' && productRequests[0].value.data?.success) {
          productTypes.push(productRequests[0].value.data.productName);
        } else {
          productTypes.push('Vanilla Candle'); // Fallback
        }

        // Process coffee
        if (productRequests[1].status === 'fulfilled' && productRequests[1].value.data?.success) {
          productTypes.push(productRequests[1].value.data.productName);
        } else {
          productTypes.push('Coffee'); // Fallback
        }

        return {
          success: true,
          productTypes: productTypes
        };
      } catch (error) {
        console.log('Failed to fetch product names from Shopify, using fallbacks:', error);
        // Fallback to default options
        return {
          success: true,
          productTypes: ['Vanilla Candle', 'Coffee']
        };
      }
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
  });
};
