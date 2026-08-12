import { supabase } from '@/integrations/supabase/client';

export type GiftCatalogItem = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  provider: 'goody' | 'unwrapt';
  providerProductId: string | null;
};

type GiftCatalogResponse = {
  success: boolean;
  products?: GiftCatalogItem[];
  source?: 'goody' | 'unwrapt';
  error?: string;
};

const functionErrorMessage = async (error: unknown) => {
  if (error && typeof error === 'object' && 'context' in error) {
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      try {
        const payload = await response.json() as { error?: string };
        if (payload.error) return payload.error;
      } catch {
        // Fall through to the SDK message if the function returned no JSON body.
      }
    }
  }

  return error instanceof Error ? error.message : 'Unable to load gift recommendations';
};

export const getGiftRecommendations = async (
  interests: string[],
  limit = 3,
): Promise<{ products: GiftCatalogItem[]; source: 'goody' | 'unwrapt' }> => {
  const { data, error } = await supabase.functions.invoke<GiftCatalogResponse>('gift-catalog', {
    body: {
      action: 'recommend',
      interests: interests.slice(0, 3),
      limit: Math.min(Math.max(limit, 1), 6),
    },
  });

  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.success || !data.products || !data.source) {
    throw new Error(data?.error || 'Unable to load gift recommendations');
  }

  return { products: data.products, source: data.source };
};
