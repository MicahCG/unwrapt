
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRODUCT_VARIANTS = {
  OCEAN_DRIFTWOOD_COCONUT_CANDLE: 51056282272063,
  LAVENDER_FIELDS_COFFEE: 51056282075455,
  TRUFFLE_CHOCOLATE: 51056285221183
};

export const useShopifyProductTypes = () => {
  return useQuery({
    queryKey: ['shopify-product-types'],
    queryFn: async () => {
      try {
        // Fetch all three products from Shopify
        const productRequests = await Promise.allSettled([
          supabase.functions.invoke('shopify-product', {
            body: { variantId: PRODUCT_VARIANTS.OCEAN_DRIFTWOOD_COCONUT_CANDLE }
          }),
          supabase.functions.invoke('shopify-product', {
            body: { variantId: PRODUCT_VARIANTS.LAVENDER_FIELDS_COFFEE }
          }),
          supabase.functions.invoke('shopify-product', {
            body: { variantId: PRODUCT_VARIANTS.TRUFFLE_CHOCOLATE }
          })
        ]);

        const productTypes = [];
        
        // Process Ocean Driftwood Coconut Candle
        if (productRequests[0].status === 'fulfilled' && productRequests[0].value.data?.success) {
          productTypes.push(productRequests[0].value.data.productName);
        } else {
          productTypes.push('Ocean Driftwood Coconut Candle'); // Fallback
        }

        // Process Lavender Fields Coffee
        if (productRequests[1].status === 'fulfilled' && productRequests[1].value.data?.success) {
          productTypes.push(productRequests[1].value.data.productName);
        } else {
          productTypes.push('Lavender Fields Coffee'); // Fallback
        }

        // Process Truffle Chocolate
        if (productRequests[2].status === 'fulfilled' && productRequests[2].value.data?.success) {
          productTypes.push(productRequests[2].value.data.productName);
        } else {
          productTypes.push('Truffle Chocolate'); // Fallback
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
          productTypes: ['Ocean Driftwood Coconut Candle', 'Lavender Fields Coffee', 'Truffle Chocolate']
        };
      }
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60 * 2, // Keep in cache for 2 hours
  });
};
