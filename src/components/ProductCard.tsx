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
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${className}`}
      onClick={() => onSelect?.(product)}
    >
      <CardContent className="p-4">
        {/* Product Image */}
        <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-muted">
          {product.featuredImage ? (
            <img
              src={product.featuredImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm line-clamp-2 leading-tight">
            {product.title}
          </h3>
          
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          {/* Badge */}
          {product.metafields.badge && (
            <Badge variant="secondary" className="text-xs">
              {product.metafields.badge}
            </Badge>
          )}

          {/* Inventory indicator */}
          {product.totalInventory <= 5 && product.totalInventory > 0 && (
            <div className="text-xs text-amber-600">
              Only {product.totalInventory} left
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;