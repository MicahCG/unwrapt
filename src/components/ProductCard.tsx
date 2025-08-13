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
          ? 'ring-2 ring-primary shadow-lg scale-105' 
          : 'hover:shadow-md hover:scale-[1.02]'
      } ${className}`}
      onClick={() => onSelect?.(product)}
    >
      <div className="bg-background rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-300">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted relative">
          {product.featuredImage ? (
            <img
              src={product.featuredImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm font-medium">No Image</span>
            </div>
          )}
          
          {/* Badge overlay */}
          {product.metafields.badge && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-background/90 text-foreground shadow-sm border-none">
                {product.metafields.badge}
              </Badge>
            </div>
          )}
          
          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 leading-snug text-foreground group-hover:text-primary transition-colors">
              {product.title}
            </h3>
          </div>
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
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
            <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">
              Only {product.totalInventory} left
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;