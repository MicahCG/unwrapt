import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { getGiftRecommendations } from '@/lib/giftCatalog';
import { trackProductEvent } from '@/lib/productAnalytics';
import { U } from '@/components/unwrapt2/theme';

interface InlineGiftPreviewProps {
  recipientFirstName: string;
  interests: string[];
}

/** Soft, non-committal inspiration strip — not a picker. */
const InlineGiftPreview: React.FC<InlineGiftPreviewProps> = ({ recipientFirstName, interests }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-chat-goody-preview', [...interests].sort().join('|')],
    queryFn: () => getGiftRecommendations(interests, 4),
    enabled: interests.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!data?.products.length) return;
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    void trackProductEvent('onboarding_chat_catalog_previewed', {
      catalog_source: data.source,
      recommendation_count: data.products.length,
      interest_count: interests.length,
    });
  }, [data, interests.length]);

  if (!interests.length) return null;

  const caption =
    interests.length === 1
      ? `A few directions inspired by ${interests[0].toLowerCase()}…`
      : `Narrowing with ${interests.map((i) => i.toLowerCase()).join(' + ')} in mind…`;

  if (isLoading) {
    return (
      <div
        className="max-w-[92%] rounded-[20px] rounded-bl-md border px-3 py-3"
        style={{ background: U.surface, borderColor: U.border }}
        aria-label="Finding inspiration"
      >
        <p className="mb-2 text-[13px]" style={{ color: U.textSecondary }}>
          Looking at possibilities for {recipientFirstName}…
        </p>
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[88px] min-w-[88px] animate-pulse rounded-[14px]" style={{ background: U.chip }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.products.length) return null;

  return (
    <div
      ref={previewRef}
      className="max-w-full rounded-[20px] rounded-bl-md border px-3 py-3"
      style={{ background: U.surface, borderColor: U.border }}
    >
      <p className="mb-2.5 text-[13px] leading-5" style={{ color: U.textSecondary }}>
        {caption}
      </p>
      <div
        className="flex snap-x gap-2 overflow-x-auto pb-0.5"
        aria-label={`Inspiration for ${recipientFirstName}`}
      >
        {data.products.map((product) => (
          <article
            key={`${product.provider}-${product.id}`}
            className="pointer-events-none min-w-[96px] max-w-[96px] snap-start overflow-hidden rounded-[14px] border bg-white/80"
            style={{ borderColor: U.border, opacity: 0.88 }}
          >
            <div className="flex h-[84px] items-center justify-center overflow-hidden" style={{ background: U.chip }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <Gift className="h-5 w-5" style={{ color: U.accent }} aria-hidden="true" />
              )}
            </div>
            <div className="px-2 py-1.5">
              <p className="line-clamp-2 text-[10.5px] leading-[1.3]" style={{ color: U.muted }}>
                {product.name}
              </p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-4" style={{ color: U.muted }}>
        Just inspiration — Thea will pick the strong ones next.
      </p>
    </div>
  );
};

export default InlineGiftPreview;
