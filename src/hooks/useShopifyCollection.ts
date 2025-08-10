import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  featuredImage: string | null;
  price: number;
  compareAtPrice: number | null;
  availableForSale: boolean;
  totalInventory: number;
  variantId: string;
  tags: string[];
  metafields: {
    category?: string;
    rank?: number;
    badge?: string;
  };
}

interface CollectionResponse {
  success: boolean;
  products: ShopifyProduct[];
  collectionHandle: string;
  collectionTitle?: string;
  message?: string;
  error?: string;
}

// Interest to collection mapping
const INTEREST_COLLECTION_MAP: Record<string, string> = {
  'candles': 'gifts-candles',
  'chocolate': 'gifts-chocolate', 
  'coffee': 'gifts-coffee',
  'default': 'gifts-all'
};

export const useShopifyCollection = (interest: string | null, limit: number = 20) => {
  return useQuery({
    queryKey: ['shopify-collection', interest, limit],
    queryFn: async (): Promise<ShopifyProduct[]> => {
      if (!interest) return [];
      
      // Map interest to collection handle
      const collectionHandle = INTEREST_COLLECTION_MAP[interest.toLowerCase()] || INTEREST_COLLECTION_MAP.default;
      
      try {
        console.log(`Fetching collection: ${collectionHandle} for interest: ${interest}`);
        
        const { data, error } = await supabase.functions.invoke('shopify-collections', {
          body: { 
            collectionHandle,
            limit 
          }
        });

        if (error) {
          console.error('Error fetching Shopify collection:', error);
          return [];
        }

        console.log('Raw response data:', data);

        const response: CollectionResponse = data;
        
        if (!response.success) {
          console.warn(`Collection fetch unsuccessful: ${response.message || response.error}`);
          
          // Fallback to gifts-all if the specific collection fails
          if (collectionHandle !== 'gifts-all') {
            console.log('Falling back to gifts-all collection');
            const fallbackResponse = await supabase.functions.invoke('shopify-collections', {
              body: { 
                collectionHandle: 'gifts-all',
                limit 
              }
            });
            
            if (fallbackResponse.data?.success) {
              return fallbackResponse.data.products;
            }
          }
          
          // Temporary fallback for testing - remove once collections are set up
          console.warn('Collection empty or not found, using fallback for testing');
          return [];
        }

        console.log(`Retrieved ${response.products.length} products from ${collectionHandle}`);
        return response.products;
        
      } catch (error) {
        console.error('Error in useShopifyCollection:', error);
        return [];
      }
    },
    enabled: !!interest,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};

// Hook to get products for specific interests with fallback logic
export const useProductsForInterests = (interests: string[], limit: number = 20) => {
  return useQuery({
    queryKey: ['products-for-interests', interests, limit],
    queryFn: async (): Promise<ShopifyProduct[]> => {
      if (!interests.length) {
        // No interests specified, get from default collection
        const { data, error } = await supabase.functions.invoke('shopify-collections', {
          body: { 
            collectionHandle: 'gifts-all',
            limit 
          }
        });
        
        if (error || !data?.success) {
          return [];
        }
        
        return data.products;
      }
      
      // Try each interest in order until we find products
      for (const interest of interests) {
        const collectionHandle = INTEREST_COLLECTION_MAP[interest.toLowerCase()];
        
        if (collectionHandle) {
          const { data, error } = await supabase.functions.invoke('shopify-collections', {
            body: { 
              collectionHandle,
              limit 
            }
          });
          
          if (!error && data?.success && data.products.length > 0) {
            console.log(`Found ${data.products.length} products for interest: ${interest}`);
            return data.products;
          }
        }
      }
      
      // Fallback to gifts-all if no interest-specific products found
      console.log('No products found for specific interests, falling back to gifts-all');
      const { data, error } = await supabase.functions.invoke('shopify-collections', {
        body: { 
          collectionHandle: 'gifts-all',
          limit 
        }
      });
      
      if (error || !data?.success) {
        return [];
      }
      
      return data.products;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};