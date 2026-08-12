import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles } from 'lucide-react';
import { getGiftRecommendations } from '@/lib/giftCatalog';
import { trackProductEvent } from '@/lib/productAnalytics';
import { Eyebrow } from '@/components/unwrapt2/MobileShell';
import { U } from '@/components/unwrapt2/theme';

interface GiftRecommendationPreviewProps {
  recipientFirstName: string;
  interests: string[];
}

const formatPrice = (price: number | null, currency: string) => {
  if (price === null) return 'Price shown before approval';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
};

const GiftRecommendationPreview: React.FC<GiftRecommendationPreviewProps> = ({
  recipientFirstName,
  interests,
}) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['onboarding-gift-recommendations', [...interests].sort().join('|')],
    queryFn: () => getGiftRecommendations(interests),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!data) return;
    void trackProductEvent('onboarding_catalog_previewed', {
      catalog_source: data.source,
      recommendation_count: data.products.length,
      interest_count: interests.length,
    });
  }, [data, interests.length]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading gift recommendations">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="animate-pulse"
            style={{ height: 104, borderRadius: 18, background: U.chip }}
          />
        ))}
      </div>
    );
  }

  if (isError || !data?.products.length) {
    return (
      <div style={{ padding: 20, borderRadius: 20, background: U.surface, border: `1px solid ${U.border}` }}>
        <Gift size={24} color={U.accent} aria-hidden="true" />
        <p className="mt-3 text-[15px] leading-6" style={{ color: U.textSecondary }}>
          Margot saved {recipientFirstName}'s taste profile. Gift options will appear on the dashboard as the catalog refreshes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.products.map((product, index) => (
        <article
          key={`${product.provider}-${product.id}`}
          className="flex items-center gap-3.5"
          style={{ padding: 12, borderRadius: 18, background: U.surface, border: `1px solid ${U.border}` }}
        >
          <div
            className="flex h-[78px] w-[78px] shrink-0 items-center justify-center overflow-hidden"
            style={{ borderRadius: 14, background: U.chip }}
          >
            {product.imageUrl ? (
              <img className="h-full w-full object-cover" src={product.imageUrl} alt="" />
            ) : (
              <Gift size={24} color={U.accent} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <Sparkles size={12} color={U.accent} aria-hidden="true" />
              <Eyebrow color={U.accent}>Match {index + 1}</Eyebrow>
            </div>
            <h3 className="truncate text-[15px] font-semibold">{product.name}</h3>
            <p className="truncate text-[12.5px]" style={{ color: U.muted }}>
              {product.brand || 'Curated by Unwrapt'}
            </p>
            <p className="mt-1 text-[12.5px] font-medium" style={{ color: U.textSecondary }}>
              {formatPrice(product.price, product.currency)}
            </p>
          </div>
        </article>
      ))}
      <p className="px-1 text-[11.5px] leading-5" style={{ color: U.muted }}>
        Preview only. Margot will explain the final match and ask before any purchase.
      </p>
    </div>
  );
};

export default GiftRecommendationPreview;
