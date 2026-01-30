import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllProducts, GIFT_VIBE_OPTIONS, type GiftVibe, type Product } from '@/lib/giftVibes';

interface GiftCatalogPreviewProps {
  onVibeSelect?: (vibe: GiftVibe) => void;
  selectedVibe?: GiftVibe | null;
  maxProducts?: number;
}

const GiftCatalogPreview: React.FC<GiftCatalogPreviewProps> = ({
  onVibeSelect,
  selectedVibe,
  maxProducts = 6
}) => {
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getAllProducts(),
    staleTime: 5 * 60 * 1000,
  });

  // Group products by vibe
  const productsByVibe = GIFT_VIBE_OPTIONS.reduce((acc, option) => {
    acc[option.vibe] = allProducts.filter(p => p.gift_vibe === option.vibe).slice(0, 4);
    return acc;
  }, {} as Record<GiftVibe, Product[]>);

  // Get featured products (one from each vibe, or first N)
  const featuredProducts = allProducts.slice(0, maxProducts);

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#E4DCD2] p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-[#D2B887]" />
          <span className="font-medium text-[#1A1A1A]">Loading gift catalog...</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[#F8F1E6] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-gradient-to-br from-[#FAF8F3] to-[#EFE7DD] rounded-2xl border border-[#E4DCD2] p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.08)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#D2B887]/20">
            <Sparkles className="w-5 h-5 text-[#D2B887]" />
          </div>
          <div>
            <h3 className="font-medium text-[#1A1A1A]">Our Curated Collection</h3>
            <p className="text-sm text-[#1A1A1A]/60">Handpicked gifts, not algorithms</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-[#1A1A1A]/50">
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {featuredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index, duration: 0.3 }}
            className="group relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm border border-[#E4DCD2]/50 cursor-pointer hover:shadow-md transition-all"
          >
            {product.featured_image_url ? (
              <img
                src={product.featured_image_url}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#F8F1E6]">
                <Gift className="w-8 h-8 text-[#D2B887]" />
              </div>
            )}
            
            {/* Price tag overlay */}
            <div className="absolute bottom-1.5 left-1.5 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-[#1A1A1A] shadow-sm">
              ${product.price}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Vibe Categories */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[#1A1A1A]/50 uppercase tracking-wide mb-3">
          Choose a gift style
        </p>
        <div className="flex flex-wrap gap-2">
          {GIFT_VIBE_OPTIONS.map((option) => {
            const isSelected = selectedVibe === option.vibe;
            const productCount = productsByVibe[option.vibe]?.length || 0;
            
            return (
              <button
                key={option.vibe}
                type="button"
                onClick={() => onVibeSelect?.(option.vibe)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                  isSelected
                    ? 'bg-[#D2B887] text-white shadow-md'
                    : 'bg-white/80 text-[#1A1A1A]/70 hover:bg-white hover:shadow-sm border border-[#E4DCD2]'
                }`}
              >
                <span>{option.label}</span>
                {productCount > 0 && (
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-[#1A1A1A]/40'}`}>
                    ({productCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trust message */}
      <div className="mt-5 pt-4 border-t border-[#E4DCD2] text-center">
        <p className="text-xs text-[#1A1A1A]/50">
          All gifts are from artisan makers • Delivered beautifully wrapped
        </p>
      </div>
    </motion.div>
  );
};

export default GiftCatalogPreview;
