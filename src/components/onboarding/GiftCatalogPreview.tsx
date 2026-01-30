import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAllProducts, type Product } from '@/lib/giftVibes';

interface GiftCatalogPreviewProps {
  maxProducts?: number;
  compact?: boolean;
}

const GiftCatalogPreview: React.FC<GiftCatalogPreviewProps> = ({
  maxProducts = 4,
  compact = true
}) => {
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => getAllProducts(),
    staleTime: 5 * 60 * 1000,
  });

  // Get featured products
  const featuredProducts = allProducts.slice(0, maxProducts);

  if (isLoading) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-[#E4DCD2]/50 p-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#D2B887]" />
          <span className="text-sm font-medium text-[#1A1A1A]/70">Loading gifts...</span>
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-16 h-16 flex-shrink-0 bg-[#F8F1E6] rounded-lg animate-pulse" />
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
      className="bg-gradient-to-r from-[#FAF8F3] to-[#EFE7DD]/80 rounded-xl border border-[#E4DCD2]/60 p-4 shadow-sm"
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D2B887]" />
          <span className="text-sm font-medium text-[#1A1A1A]">Curated gifts we'll send</span>
        </div>
        <span className="text-xs text-[#1A1A1A]/40">{allProducts.length}+ items</span>
      </div>

      {/* Horizontal Product Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {featuredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * index, duration: 0.2 }}
            className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white shadow-sm border border-[#E4DCD2]/30"
          >
            {product.featured_image_url ? (
              <img
                src={product.featured_image_url}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#F8F1E6]">
                <Gift className="w-5 h-5 text-[#D2B887]" />
              </div>
            )}
            {/* Small price badge */}
            <div className="absolute bottom-1 left-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-medium text-[#1A1A1A] shadow-sm">
              ${product.price}
            </div>
          </motion.div>
        ))}
        
        {/* "More" indicator */}
        {allProducts.length > maxProducts && (
          <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-[#F8F1E6]/50 border border-dashed border-[#D2B887]/30 flex items-center justify-center">
            <span className="text-xs text-[#D2B887] font-medium">+{allProducts.length - maxProducts}</span>
          </div>
        )}
      </div>

      {/* Trust line */}
      <p className="text-[10px] text-[#1A1A1A]/40 mt-3 text-center">
        Artisan-made • Beautifully wrapped • Delivered on time
      </p>
    </motion.div>
  );
};

export default GiftCatalogPreview;
