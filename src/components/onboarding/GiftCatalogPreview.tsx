import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllProducts, type Product } from '@/lib/giftVibes';

interface GiftCatalogPreviewProps {
  maxProducts?: number;
}

const GiftCatalogPreview: React.FC<GiftCatalogPreviewProps> = ({
  maxProducts = 8
}) => {
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getAllProducts(),
    staleTime: 5 * 60 * 1000,
  });

  // Get featured products - ensure we fill rows (multiples of 4)
  const featuredProducts = allProducts.slice(0, maxProducts);
  
  // Calculate empty slots needed to complete the row
  const emptySlots = featuredProducts.length > 0 
    ? (4 - (featuredProducts.length % 4)) % 4 
    : 0;
  const remainingProducts = allProducts.length - featuredProducts.length;

  if (isLoading) {
    return (
      <div className="bg-white/80 rounded-2xl border border-[#E4DCD2] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#D2B887]" />
          <span className="text-sm font-medium text-[#1A1A1A]/70">Loading gifts...</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-[#E4DCD2] p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#D2B887]/15 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#D2B887]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#1A1A1A]">Peek at our collection</h4>
            <p className="text-xs text-[#1A1A1A]/50">Artisan-made, beautifully wrapped</p>
          </div>
        </div>
      </div>

      {/* Product Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-3">
        {featuredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index, duration: 0.3 }}
            className="group relative"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-[#F8F1E6] shadow-sm border border-[#E4DCD2]/40 group-hover:shadow-md group-hover:border-[#D2B887]/40 transition-all">
              {product.featured_image_url ? (
                <img
                  src={product.featured_image_url}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gift className="w-6 h-6 text-[#D2B887]" />
                </div>
              )}
            </div>
            {/* Price below image */}
            <div className="mt-1.5 text-center">
              <span className="text-xs font-medium text-[#1A1A1A]/70">${product.price}</span>
            </div>
          </motion.div>
        ))}

        {/* Fill empty slots with "more gifts" cards */}
        {emptySlots > 0 && remainingProducts > 0 && Array.from({ length: emptySlots }).map((_, index) => (
          <motion.div
            key={`empty-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * (featuredProducts.length + index), duration: 0.3 }}
            className="group relative"
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#FAF8F3] to-[#EFE7DD] border border-dashed border-[#D2B887]/40 flex flex-col items-center justify-center gap-2 group-hover:border-[#D2B887]/60 transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[#D2B887]/10 flex items-center justify-center group-hover:bg-[#D2B887]/20 transition-colors">
                <ArrowRight className="w-5 h-5 text-[#D2B887]" />
              </div>
              <span className="text-xs font-medium text-[#D2B887]">
                {index === 0 ? `+${remainingProducts}` : 'more'}
              </span>
            </div>
            <div className="mt-1.5 text-center">
              <span className="text-xs text-[#1A1A1A]/40">gifts</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default GiftCatalogPreview;
