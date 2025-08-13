import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShopifyProduct } from '@/hooks/useShopifyCollection';

interface ProductCardProps {
  product: ShopifyProduct;
  onSelect?: (product: ShopifyProduct) => void;
  isSelected?: boolean;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onSelect, 
  isSelected = false,
  className = "" 
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div 
      className={`group cursor-pointer transition-all duration-300 ${
        isSelected 
          ? 'ring-2 ring-primary/50 shadow-xl scale-105' 
          : 'hover:shadow-lg hover:scale-[1.02]'
      } ${className}`}
      onClick={() => onSelect?.(product)}
    >
      <div className="bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:border-primary/40 transition-all duration-300 shadow-lg">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 relative">
          {product.featuredImage ? (
            <>
              <img
                src={product.featuredImage}
                alt={product.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-transparent">
              <span className="text-muted-foreground text-sm font-medium">No Image</span>
            </div>
          )}
          
          {/* Badge overlay */}
          {product.metafields.badge && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-gradient-to-r from-background/90 to-background/70 backdrop-blur-sm text-foreground shadow-md border border-white/30">
                {product.metafields.badge}
              </Badge>
            </div>
          )}
          
          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg border border-white/30">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3 bg-gradient-to-br from-background/60 to-background/40 backdrop-blur-sm">
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 leading-snug text-foreground group-hover:text-primary transition-colors">
              {product.title}
            </h3>
          </div>
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Inventory indicator */}
          {product.totalInventory <= 5 && product.totalInventory > 0 && (
            <div className="text-xs text-amber-600 font-medium bg-gradient-to-r from-amber-50/80 to-amber-100/60 backdrop-blur-sm px-3 py-1 rounded-full border border-amber-200/50">
              Only {product.totalInventory} left
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;