import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import ProductSelector from './ProductSelector';
import { ShopifyProduct } from '@/hooks/useShopifyCollection';
import { GIFT_VIBE_OPTIONS, type GiftVibe } from '@/lib/giftVibes';

interface InterestBasedProductSelectorProps {
  recipientGiftVibe?: GiftVibe | null;
  onProductSelect: (product: ShopifyProduct) => void;
  selectedProduct?: ShopifyProduct | null;
  className?: string;
}

const InterestBasedProductSelector: React.FC<InterestBasedProductSelectorProps> = ({
  recipientGiftVibe = null,
  onProductSelect,
  selectedProduct,
  className = ""
}) => {
  const vibeOption = recipientGiftVibe
    ? GIFT_VIBE_OPTIONS.find(v => v.vibe === recipientGiftVibe)
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/30 via-transparent to-blue-50/20 pointer-events-none" />

      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Choose the Perfect Gift</h3>
            {vibeOption && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs bg-[#D2B887]/10 text-[#D2B887] border border-[#D2B887]/20">
                  {vibeOption.label}
                </Badge>
                <span className="text-sm text-gray-600">{vibeOption.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 space-y-6">
        <ProductSelector
          interests={[]}
          onProductSelect={onProductSelect}
          selectedProduct={selectedProduct}
          className="border-none shadow-none"
        />
      </div>

      {selectedProduct && (
        <div className="mt-8 p-6 bg-white/95 backdrop-blur-md rounded-xl border border-gray-200 shadow-lg">
          <div className="flex items-start gap-6">
            {selectedProduct.featuredImage && (
              <div className="flex-shrink-0">
                <div className="relative">
                  <img
                    src={selectedProduct.featuredImage}
                    alt={selectedProduct.title}
                    className="w-24 h-24 rounded-lg object-cover shadow-md border border-gray-200"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{selectedProduct.title}</h4>
                <p className="text-2xl font-bold text-gray-900">
                  ${selectedProduct.price.toFixed(2)}
                </p>
              </div>
              {selectedProduct.metafields.badge && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedProduct.metafields.badge}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestBasedProductSelector;