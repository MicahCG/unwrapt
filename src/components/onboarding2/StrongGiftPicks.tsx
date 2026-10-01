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
}

/** 5–7 word why line from interests + product cues. */
export function whyForGift(product: GiftCatalogItem, interests: string[]): string {
  const tags = interests.map((i) => i.toLowerCase()).filter(Boolean);
  const name = `${product.name} ${product.brand || ''} ${product.description || ''}`.toLowerCase();

  if (tags.length >= 2) {
    return `Ties ${tags[0]} + ${tags[1]} together`;
  }

  const focus = tags[0] || 'them';
  if (/book|journal|print/.test(name)) return `A thoughtful ${focus} keepsake`;
  if (/mug|cup|brew|coffee|tea/.test(name)) return `Daily ritual they’ll actually use`;
  if (/bag|pouch|case|accessory|wear/.test(name)) return `Stylish everyday ${focus} touch`;
  if (/game|play|console|puzzle/.test(name)) return `Playful pick for game nights`;
  if (/candle|spa|self/.test(name)) return `Warm, personal feel-good gift`;
  return `Feels personal for ${focus} lovers`;
}

const StrongGiftPicks: React.FC<StrongGiftPicksProps> = ({
  recipientFirstName,
  interests,
  products,
}) => {
  useEffect(() => {
    if (!products.length) return;
    void trackProductEvent('onboarding_catalog_previewed', {
      catalog_source: products[0]?.provider === 'goody' ? 'goody' : 'unwrapt',
      recommendation_count: products.length,
      interest_count: interests.length,
    });
  }, [products, interests.length]);

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
