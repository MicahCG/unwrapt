import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getGiftRecommendations, type GiftCatalogItem } from '@/lib/giftCatalog';
import { ProductImage } from '@/components/dashboard/TheaChatCards';
import { U } from '@/components/unwrapt2/theme';
import { useThea } from '@/hooks/useThea';

interface CatalogPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName?: string;
  interests?: string[];
  /** Opens the review for the chosen gift (Manual with a person, Thea without). */
  onSelect: (product: GiftCatalogItem) => void;
}

const ALL = '__all__';

const price = (product: GiftCatalogItem) =>
  product.price == null
    ? 'Price at review'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency, maximumFractionDigits: 0 }).format(product.price);

const CatalogPreviewSheet: React.FC<CatalogPreviewSheetProps> = ({
  open,
  onOpenChange,
  recipientName,
  interests = [],
  onSelect,
}) => {
  const { openThea } = useThea();
  const saved = interests.slice(0, 3);
  const [filter, setFilter] = useState<string>(ALL);
  useEffect(() => {
    if (open) setFilter(ALL);
  }, [open, recipientName]);

  const requested = filter === ALL ? saved : [filter];
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['catalog-preview', [...requested].sort().join('|')],
    queryFn: () => getGiftRecommendations(requested, 6),
    enabled: open,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  const products = data?.products || [];
  const first = recipientName?.split(' ')[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto rounded-t-[28px] border-0 bg-[#F7F1E6] px-5 pb-10 pt-5 sm:mx-auto sm:max-w-[440px] lg:max-w-[600px]">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2A2520]/15" />
        <SheetHeader className="text-left">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B65B3C]">
            <Sparkles className="h-3.5 w-3.5" /> Catalog
          </div>
          <SheetTitle className="font-display text-[30px] font-normal leading-[1.05] text-[#2A2520]">
            {first ? `Ideas for ${first}` : 'Explore the collection'}
          </SheetTitle>
          <SheetDescription className="max-w-sm text-sm leading-6 text-[#6F6559]">
            {saved.length ? `Ranked by what ${first || 'they'} love. Pick one to review it before anything is ordered.` : 'Add interests to a person for a sharper list, or ask Thea to narrow it down.'}
          </SheetDescription>
        </SheetHeader>

        {saved.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by interest">
            {[ALL, ...saved].map((value) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(value)}
                  className="u-press min-h-10 rounded-full border px-3.5 text-[12.5px] font-semibold"
                  style={{ background: active ? U.ink : U.surface, color: active ? U.buttonText : '#5A5147', borderColor: active ? U.ink : U.border }}
                >
                  {value === ALL ? 'All matches' : value}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3" aria-busy={isLoading || isFetching}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-60 animate-pulse rounded-[20px] bg-white/70" />)
            : products.map((product) => (
              <article key={`${product.provider}-${product.id}`} className="u-catalog-card flex flex-col overflow-hidden rounded-[20px] bg-white p-2.5 shadow-[0_8px_24px_rgba(42,37,32,0.05)]">
                <ProductImage src={product.imageUrl} className="aspect-square w-full rounded-[15px]" />
                <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                  <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.3] text-[#2A2520]">{product.name}</h3>
                  <p className="mt-1 truncate text-[11px] text-[#8A7E6E]">{product.brand || 'Curated by Unwrapt'}</p>
                  {product.why && <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-[#6F6559]">{product.why}</p>}
                  <p className="mt-auto pt-2 font-mono text-[12px] text-[#5A5147]">{price(product)}</p>
                  <button
                    type="button"
                    onClick={() => onSelect(product)}
                    className="u-press mt-2 min-h-10 rounded-[12px] text-[12px] font-semibold"
                    style={{ background: U.ink, color: U.buttonText }}
                  >
                    Select gift
                  </button>
                </div>
              </article>
            ))}
        </div>

        {!isLoading && isError && (
          <div className="mt-2 rounded-[16px] px-4 py-3.5 text-center text-[13px]" style={{ background: U.accentSoft, color: U.inkSoft }}>
            Couldn’t load gifts right now.{' '}
            <button type="button" onClick={() => void refetch()} className="min-h-8 font-semibold" style={{ color: U.accent }}>Try again</button>
          </div>
        )}
        {!isLoading && !isError && products.length === 0 && (
          <div className="mt-2 rounded-[16px] px-4 py-4 text-center text-[13px] leading-5" style={{ background: U.chip, color: U.inkSoft }}>
            No matches for {filter === ALL ? 'these interests' : `“${filter}”`} yet.
            <div className="mt-2 flex justify-center gap-4">
              {filter !== ALL && <button type="button" onClick={() => setFilter(ALL)} className="min-h-8 font-semibold" style={{ color: U.accent }}>See all matches</button>}
              <button type="button" onClick={() => openThea({ surface: 'catalog', recipientName })} className="min-h-8 font-semibold" style={{ color: U.accent }}>Ask Thea</button>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-[11px] leading-5" style={{ color: U.muted }}>
          Nothing is purchased until you review the gift and confirm.
        </p>
      </SheetContent>
    </Sheet>
  );
};

export default CatalogPreviewSheet;
