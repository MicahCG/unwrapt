
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ShopifyProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  productType: string;
  variantId: string;
}

export const useShopifyProduct = (productType: string) => {
  return useQuery({
    queryKey: ['shopify-product', productType],
    queryFn: async (): Promise<ShopifyProduct | null> => {
      if (!productType) return null;
      
      try {
        const { data, error } = await supabase.functions.invoke('shopify-product', {
          body: { productType }
        });

        if (error) {
          console.error('Error fetching Shopify product:', error);
          // Return fallback pricing if Shopify is unavailable
          return {
            id: 'fallback',
            title: productType,
            price: 25.00, // Default fallback price
            image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
            productType,
            variantId: 'fallback'
          };
        }

        return data?.product || {
          id: 'fallback',
          title: productType,
          price: 25.00,
          image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
          productType,
          variantId: 'fallback'
        };
      } catch (error) {
        console.error('Error in useShopifyProduct:', error);
        // Return fallback pricing
        return {
          id: 'fallback',
          title: productType,
          price: 25.00,
          image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
          productType,
          variantId: 'fallback'
        };
      }
    },
    enabled: !!productType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
