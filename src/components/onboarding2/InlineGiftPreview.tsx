import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles } from 'lucide-react';
import { getGiftRecommendations } from '@/lib/giftCatalog';
import { trackProductEvent } from '@/lib/productAnalytics';
import { U } from '@/components/unwrapt2/theme';

interface InlineGiftPreviewProps {
  recipientFirstName: string;
  interests: string[];
}

const formatPrice = (price: number | null, currency: string) => {
  if (price === null) return 'Price pending';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
};

const InlineGiftPreview: React.FC<InlineGiftPreviewProps> = ({ recipientFirstName, interests }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-chat-goody-preview', [...interests].sort().join('|')],
    queryFn: () => getGiftRecommendations(interests, 3),
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

  if (isLoading) {
    return (
      <div className="max-w-[92%] rounded-[20px] rounded-bl-md border p-3" style={{ background: U.surface, borderColor: U.border }} aria-label="Thea is finding live Goody gifts">
        <p className="mb-2 text-[13px]" style={{ color: U.textSecondary }}>I’m checking Goody for live matches…</p>
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2].map((index) => <div key={index} className="h-[116px] min-w-[108px] animate-pulse rounded-[14px]" style={{ background: U.chip }} />)}
        </div>
      </div>
    );
  }

  if (!data?.products.length) return null;

  const interestLabel = interests.length === 1
    ? interests[0].toLowerCase()
    : interests.slice(0, 3).join(', ').toLowerCase();

  return (
    <div ref={previewRef} className="max-w-full rounded-[20px] rounded-bl-md border px-3 py-3.5" style={{ background: U.surface, borderColor: U.border }}>
      <div className="mb-3 flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: U.accent }} aria-hidden="true" />
        <p className="text-[13.5px] leading-5" style={{ color: U.textSecondary }}>
          Here are a few live {interestLabel} matches I found for {recipientFirstName}.
        </p>
      </div>
      <div className="flex snap-x gap-2.5 overflow-x-auto pb-1" aria-label={`Live Goody gift ideas for ${recipientFirstName}`}>
        {data.products.map((product) => (
          <article key={`${product.provider}-${product.id}`} className="min-w-[132px] max-w-[132px] snap-start overflow-hidden rounded-[15px] border bg-white" style={{ borderColor: U.border }}>
            <div className="relative flex h-[104px] items-center justify-center overflow-hidden" style={{ background: U.chip }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <Gift className="h-6 w-6" style={{ color: U.accent }} aria-hidden="true" />
              )}
              {product.provider === 'goody' && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-1 text-[8px] font-bold uppercase tracking-[0.08em]" style={{ color: U.accent }}>
                  Live Goody
                </span>
              )}
            </div>
            <div className="p-2.5">
              <h3 className="line-clamp-2 min-h-[34px] text-[12px] font-semibold leading-[1.35]" style={{ color: U.ink }}>{product.name}</h3>
              <p className="mt-1 truncate text-[10.5px]" style={{ color: U.muted }}>{product.brand || 'Goody'}</p>
              <p className="mt-1.5 text-[11px] font-semibold" style={{ color: U.textSecondary }}>{formatPrice(product.price, product.currency)}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] leading-4" style={{ color: U.muted }}>Preview only. Availability is checked again before approval.</p>
    </div>
  );
};

export default InlineGiftPreview;
