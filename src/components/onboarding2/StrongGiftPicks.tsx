import React, { useEffect } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import type { GiftAskUserOffer, GiftCatalogItem } from '@/lib/giftCatalog';
import { trackProductEvent } from '@/lib/productAnalytics';
import { Eyebrow } from '@/components/unwrapt2/MobileShell';
import { U } from '@/components/unwrapt2/theme';

interface StrongGiftPicksProps {
  recipientFirstName: string;
  interests: string[];
  products: GiftCatalogItem[];
  unmatchedInterests?: string[];
  askUser?: GiftAskUserOffer[];
}

/** Prefer the agent's own why line. */
export function whyForGift(product: GiftCatalogItem, interests: string[]): string {
  if (product.why?.trim()) return product.why.trim();
  if (product.fit === 'adjacent') {
    const focus = interests[0]?.toLowerCase();
    return focus
      ? `Closest live option near ${focus}`
      : 'Closest live option from what is in stock';
  }
  const focus = interests[0]?.toLowerCase();
  return focus ? `Because they're into ${focus}` : 'Matched to what you shared';
}

const StrongGiftPicks: React.FC<StrongGiftPicksProps> = ({
  recipientFirstName,
  interests,
  products,
  unmatchedInterests = [],
  askUser = [],
}) => {
  useEffect(() => {
    if (!products.length && !askUser.length) return;
    void trackProductEvent('onboarding_catalog_previewed', {
      catalog_source: products[0]?.provider === 'goody' ? 'goody' : 'unwrapt',
      recommendation_count: products.length,
      interest_count: interests.length,
      unmatched_count: unmatchedInterests.length,
      ask_user_count: askUser.length,
    });
  }, [products, interests.length, unmatchedInterests.length, askUser.length]);

  if (!products.length) {
    return (
      <div className="flex flex-col gap-3">
        <div style={{ padding: 20, borderRadius: 20, background: U.surface, border: `1px solid ${U.border}` }}>
          <Gift size={24} color={U.accent} aria-hidden="true" />
          <p className="mt-3 text-[15px] leading-6" style={{ color: U.textSecondary }}>
            {askUser.length > 0 ? (
              <>I searched the live catalog for {recipientFirstName} and don&apos;t have an exact match yet.</>
            ) : unmatchedInterests.length > 0 || interests.length > 0 ? (
              <>
                I searched the live catalog and don&apos;t have a clear match for{' '}
                <span style={{ color: U.ink, fontWeight: 600 }}>
                  {(unmatchedInterests.length ? unmatchedInterests : interests)
                    .map((i) => i.toLowerCase())
                    .join(' / ')}
                </span>{' '}
                yet. I saved {recipientFirstName}&apos;s taste instead of forcing unrelated products.
              </>
            ) : (
              <>Thea saved {recipientFirstName}&apos;s taste profile. Stronger matches will land in your gift inbox next.</>
            )}
          </p>
        </div>
        {askUser.map((offer) => (
          <div
            key={`${offer.interest}-${offer.alternative}`}
            className="rounded-[18px] px-4 py-3.5 text-[14px] leading-5"
            style={{ background: U.chip, color: U.ink, border: `1px solid ${U.border}` }}
          >
            {offer.question}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {askUser.map((offer) => (
        <div
          key={`${offer.interest}-${offer.alternative}`}
          className="rounded-[18px] px-4 py-3.5 text-[14px] leading-5"
          style={{ background: U.chip, color: U.ink, border: `1px solid ${U.border}` }}
        >
          {offer.question}
        </div>
      ))}
      {products.some((p) => p.fit === 'adjacent') && (
        <p className="rounded-[16px] px-3.5 py-3 text-[13px] leading-5" style={{ background: U.chip, color: U.textSecondary }}>
          Exact stock was thin, so these are the closest live options in the same interest family.
        </p>
      )}
      {products.slice(0, 2).map((product, index) => (
        <article
          key={`${product.provider}-${product.id}`}
          className="flex items-center gap-3.5"
          style={{ padding: 14, borderRadius: 20, background: U.surface, border: `1px solid ${U.border}` }}
        >
          <div
            className="flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden"
            style={{ borderRadius: 16, background: U.chip }}
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
              <Eyebrow color={U.accent}>
                {product.fit === 'adjacent'
                  ? 'Closest live option'
                  : index === 0
                    ? 'Top pick'
                    : 'Also strong'}
              </Eyebrow>
            </div>
            <h3 className="text-[15.5px] font-semibold leading-snug">{product.name}</h3>
            <p className="mt-1.5 text-[13px] leading-5" style={{ color: U.textSecondary }}>
              {whyForGift(product, interests)}
            </p>
          </div>
        </article>
      ))}
      <p className="px-1 text-[11.5px] leading-5" style={{ color: U.muted }}>
        Thea explains the final match and asks before any purchase.
      </p>
    </div>
  );
};

export default StrongGiftPicks;
