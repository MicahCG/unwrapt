
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopifyCollection, ShopifyProduct } from './useShopifyCollection';

// Legacy interface for backwards compatibility
interface LegacyShopifyProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  productType: string;
  variantId: string;
}

// Feature flag for new dynamic system
const USE_DYNAMIC_PRODUCTS = true;

export const useShopifyProduct = (productType: string) => {
  // New dynamic product system
  const { data: dynamicProducts = [], isLoading: dynamicLoading, error: dynamicError } = useShopifyCollection(
    productType, 
    1
  );

  // Legacy system query (kept for fallback)
  const legacyQuery = useQuery({
    queryKey: ['shopify-product-legacy', productType],
    queryFn: async (): Promise<LegacyShopifyProduct | null> => {
      if (!productType) return null;
      
      try {
        const { data, error } = await supabase.functions.invoke('shopify-product', {
          body: { productType }
        });

        if (error) {
          console.error('Error fetching legacy Shopify product:', error);
          return {
            id: 'fallback',
            title: productType,
            price: 25.00,
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
        console.error('Error in legacy useShopifyProduct:', error);
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
    enabled: !!productType && !USE_DYNAMIC_PRODUCTS,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Return dynamic or legacy data based on feature flag
  if (USE_DYNAMIC_PRODUCTS) {
    const dynamicProduct = dynamicProducts[0];
    
    return {
      data: dynamicProduct ? {
        id: dynamicProduct.id,
        title: dynamicProduct.title,
        price: dynamicProduct.price,
        image: dynamicProduct.featuredImage || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
        productType: dynamicProduct.metafields.category || productType,
        variantId: dynamicProduct.variantId
      } : null,
      isLoading: dynamicLoading,
      error: dynamicError
    };
  } else {
    return {
      data: legacyQuery.data,
      isLoading: legacyQuery.isLoading,
      error: legacyQuery.error
    };
  }
};
