import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Package } from 'lucide-react';
import ProductCard from './ProductCard';
import { useShopifyCollection, useProductsForInterests, ShopifyProduct } from '@/hooks/useShopifyCollection';

interface ProductSelectorProps {
  interests?: string[];
  selectedInterest?: string;
  onProductSelect: (product: ShopifyProduct) => void;
  selectedProduct?: ShopifyProduct | null;
  className?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  interests = [],
  selectedInterest,
  onProductSelect,
  selectedProduct,
  className = ""
}) => {
  const [retryKey, setRetryKey] = useState(0);

  // Use different hooks based on whether we have a specific interest or multiple interests
  const collectionQuery = useShopifyCollection(
    selectedInterest || null, 
    12
  );
  
  const interestsQuery = useProductsForInterests(
    !selectedInterest ? interests : [],
    12
  );

  // Use the appropriate query based on what's available
  const { data: products = [], isLoading, error, refetch } = selectedInterest 
    ? collectionQuery 
    : interestsQuery;

  const handleRetry = () => {
    setRetryKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Loading Products...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || (!isLoading && products.length === 0)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Products
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-muted-foreground">
              {error ? 'Unable to load products' : 'No products available'}
            </div>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {selectedInterest ? `${selectedInterest} Gifts` : 'Curated Gifts'}
            <Badge variant="secondary">{products.length}</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        {selectedInterest && (
          <p className="text-sm text-muted-foreground">
            Showing products for {selectedInterest}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onProductSelect}
              isSelected={selectedProduct?.id === product.id}
            />
          ))}
        </div>
        
        {products.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No products available for this selection
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductSelector;