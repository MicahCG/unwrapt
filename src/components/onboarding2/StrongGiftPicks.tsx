import React, { useEffect } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import type { GiftCatalogItem } from '@/lib/giftCatalog';
import { trackProductEvent } from '@/lib/productAnalytics';
import { Eyebrow } from '@/components/unwrapt2/MobileShell';
import { U } from '@/components/unwrapt2/theme';

interface StrongGiftPicksProps {
  recipientFirstName: string;
  interests: string[];
  products: GiftCatalogItem[];
  unmatchedInterests?: string[];
}

const productBlob = (product: GiftCatalogItem) =>
  `${product.name} ${product.brand || ''} ${product.description || ''}`.toLowerCase();

const interestHits = (blob: string, interest: string) => {
  const key = interest.toLowerCase();
  const aliases: Record<string, string[]> = {
    coffee: ['coffee', 'espresso', 'latte', 'brew', 'mug', 'roast'],
    bikini: ['bikini', 'swim', 'beach', 'resort', 'pool', 'towel'],
    bikinis: ['bikini', 'swim', 'beach', 'resort', 'pool', 'towel'],
    swimwear: ['swim', 'bikini', 'beach', 'resort', 'pool'],
    fashion: ['fashion', 'style', 'jewelry', 'scarf', 'leather', 'apparel'],
    gaming: ['game', 'gaming', 'puzzle', 'cards'],
    accessories: ['accessory', 'jewelry', 'scarf', 'bag', 'wallet'],
  };
  const words = aliases[key] || [key, key.replace(/s$/, '')];
  return words.some((w) => w && blob.includes(w));
};

/** Honest why line tying the product back to what Unwrapt learned. */
export function whyForGift(product: GiftCatalogItem, interests: string[]): string {
  const tags = interests.map((i) => i.toLowerCase()).filter(Boolean);
  const blob = productBlob(product);
  const hits = tags.filter((tag) => interestHits(blob, tag));

  if (hits.length >= 2) {
    return `Fits their ${hits[0]} and ${hits[1]}`;
  }
  if (hits.length === 1) {
    const focus = hits[0];
    if (/book|journal|print/.test(blob)) return `A thoughtful ${focus} keepsake`;
    if (/mug|cup|brew|coffee|tea|matcha/.test(blob)) return `For their daily ${focus} ritual`;
    if (/bag|pouch|case|accessory|wear|swim|beach/.test(blob)) return `A stylish ${focus} everyday pick`;
    if (/game|play|console|puzzle/.test(blob)) return `Playful pick for their ${focus}`;
    if (/candle|spa|self|yoga|pilates|run/.test(blob)) return `Because they're into ${focus}`;
    return `Because they're into ${focus}`;
  }

  return 'Closest fit from the live catalog';
}

const StrongGiftPicks: React.FC<StrongGiftPicksProps> = ({
  recipientFirstName,
  interests,
  products,
  unmatchedInterests = [],
}) => {
  useEffect(() => {
    if (!products.length) return;
    void trackProductEvent('onboarding_catalog_previewed', {
      catalog_source: products[0]?.provider === 'goody' ? 'goody' : 'unwrapt',
      recommendation_count: products.length,
      interest_count: interests.length,
      unmatched_count: unmatchedInterests.length,
    });
  }, [products, interests.length, unmatchedInterests.length]);

  if (!products.length) {
    return (
      <div style={{ padding: 20, borderRadius: 20, background: U.surface, border: `1px solid ${U.border}` }}>
        <Gift size={24} color={U.accent} aria-hidden="true" />
        <p className="mt-3 text-[15px] leading-6" style={{ color: U.textSecondary }}>
          Thea saved {recipientFirstName}&apos;s taste profile. Stronger matches will land in your gift inbox next.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {unmatchedInterests.length > 0 && (
        <p className="rounded-[16px] px-3.5 py-3 text-[13px] leading-5" style={{ background: U.chip, color: U.textSecondary }}>
          I don&apos;t have a strong live match for{' '}
          <span style={{ color: U.ink, fontWeight: 600 }}>
            {unmatchedInterests.map((i) => i.toLowerCase()).join(' / ')}
          </span>{' '}
          yet, so these lean on what is in stock. Thea can keep hunting after you subscribe.
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
              <Eyebrow color={U.accent}>{index === 0 ? 'Top pick' : 'Also strong'}</Eyebrow>
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
