import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getGiftRecommendations, type GiftCatalogItem } from '@/lib/giftCatalog';
import { U } from '@/components/unwrapt2/theme';
import { useThea } from '@/hooks/useThea';

interface CatalogPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName?: string;
  interests?: string[];
}

const placeholders: GiftCatalogItem[] = [
  { id: 'placeholder-1', name: 'A thoughtful everyday upgrade', brand: 'Curated placeholder', description: 'A polished, useful gift chosen around their interests.', imageUrl: null, price: 48, currency: 'USD', provider: 'unwrapt', providerProductId: null },
  { id: 'placeholder-2', name: 'A small luxury for their routine', brand: 'Curated placeholder', description: 'Something they would enjoy but might not buy for themselves.', imageUrl: null, price: 72, currency: 'USD', provider: 'unwrapt', providerProductId: null },
  { id: 'placeholder-3', name: 'An experience worth remembering', brand: 'Curated placeholder', description: 'A flexible option with room for a personal note.', imageUrl: null, price: 95, currency: 'USD', provider: 'unwrapt', providerProductId: null },
];

const CatalogPreviewSheet: React.FC<CatalogPreviewSheetProps> = ({
  open,
  onOpenChange,
  recipientName,
  interests = [],
}) => {
  const { openThea } = useThea();
  const { data, isLoading } = useQuery({
    queryKey: ['catalog-preview', [...interests].sort().join('|')],
    queryFn: () => getGiftRecommendations(interests, 6),
    enabled: open,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const products = data?.products.length ? data.products : placeholders;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto rounded-t-[28px] border-0 bg-[#F7F1E6] px-5 pb-10 pt-5 sm:mx-auto sm:max-w-[440px]">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2A2520]/15" />
        <SheetHeader className="text-left">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B65B3C]">
            <Sparkles className="h-3.5 w-3.5" /> Catalog preview
          </div>
          <SheetTitle className="font-display text-[30px] font-normal leading-[1.05] text-[#2A2520]">
            {recipientName ? `Ideas for ${recipientName.split(' ')[0]}` : 'Explore the collection'}
          </SheetTitle>
          <SheetDescription className="max-w-sm text-sm leading-6 text-[#6F6559]">
            {interests.length
              ? `Guided by ${interests.slice(0, 3).join(', ')}. Prices and availability are illustrative until the Goody catalog is activated.`
              : 'A lightweight preview of the kinds of gifts Thea can curate. Live Goody inventory will replace placeholders after activation.'}
          </SheetDescription>
        </SheetHeader>
        <button onClick={() => openThea({ surface: 'catalog', recipientName })} className="u-touch-card mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#2A2520] px-4 py-3 text-[13px] font-semibold text-[#F4ECDD]"><Sparkles className="h-4 w-4" /> Ask Thea to narrow it down</button>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-[20px] bg-white/70" />)
            : products.map((product, index) => (
              <article key={`${product.provider}-${product.id}`} className="u-catalog-card overflow-hidden rounded-[20px] bg-white p-2.5 shadow-[0_8px_24px_rgba(42,37,32,0.05)]">
                <div className="relative aspect-square overflow-hidden rounded-[15px]" style={{ background: index % 2 ? '#E9E1D1' : '#EFE7DA' }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Gift className="h-7 w-7 text-[#B65B3C]/55" />
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#6F6559]">
                    {product.provider === 'goody' ? 'Live' : 'Preview'}
                  </span>
                </div>
                <div className="px-1 pb-1 pt-3">
                  <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.3] text-[#2A2520]">{product.name}</h3>
                  <p className="mt-1 truncate text-[11px] text-[#8A7E6E]">{product.brand || 'Curated by Unwrapt'}</p>
                  <p className="mt-2 font-mono text-[12px] text-[#5A5147]">
                    {product.price == null ? 'Price pending' : new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency, maximumFractionDigits: 0 }).format(product.price)}
                  </p>
                </div>
              </article>
            ))}
        </div>
        <p className="mt-5 text-center text-[11px] leading-5" style={{ color: U.muted }}>
          Preview only. Nothing is purchased until you review the gift and total.
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default CatalogPreviewSheet;
