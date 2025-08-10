import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Heart, Coffee, Flame, ChefHat } from 'lucide-react';
import ProductSelector from './ProductSelector';
import { ShopifyProduct } from '@/hooks/useShopifyCollection';

interface InterestBasedProductSelectorProps {
  recipientInterests?: string[];
  onProductSelect: (product: ShopifyProduct) => void;
  selectedProduct?: ShopifyProduct | null;
  className?: string;
}

const InterestBasedProductSelector: React.FC<InterestBasedProductSelectorProps> = ({
  recipientInterests = [],
  onProductSelect,
  selectedProduct,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('interests');

  // Available interest categories
  const interestCategories = [
    {
      id: 'candles',
      label: 'Candles',
      icon: Flame,
      description: 'Scented candles and aromatherapy'
    },
    {
      id: 'coffee',
      label: 'Coffee',
      icon: Coffee,
      description: 'Coffee blends and accessories'
    },
    {
      id: 'chocolate',
      label: 'Chocolate',
      icon: ChefHat,
      description: 'Artisan chocolates and treats'
    },
    {
      id: 'all',
      label: 'All Gifts',
      icon: Package,
      description: 'Browse our full collection'
    }
  ];

  // Determine which interests are relevant
  const relevantInterests = interestCategories.filter(category => 
    category.id === 'all' || recipientInterests.some(interest => 
      interest.toLowerCase().includes(category.id) || category.id === 'all'
    )
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Choose the Perfect Gift
        </CardTitle>
        {recipientInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Based on interests:</span>
            {recipientInterests.map((interest, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            {relevantInterests.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{category.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {relevantInterests.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium">{category.label}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                
                <ProductSelector
                  selectedInterest={category.id === 'all' ? undefined : category.id}
                  interests={category.id === 'all' ? recipientInterests : [category.id]}
                  onProductSelect={onProductSelect}
                  selectedProduct={selectedProduct}
                  key={`${category.id}-${activeTab}`} // Force re-render when tab changes
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {selectedProduct && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-4">
              {selectedProduct.featuredImage && (
                <img
                  src={selectedProduct.featuredImage}
                  alt={selectedProduct.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{selectedProduct.title}</h4>
                <p className="text-lg font-semibold text-primary">
                  ${selectedProduct.price.toFixed(2)}
                </p>
                {selectedProduct.metafields.badge && (
                  <Badge variant="secondary" className="mt-1">
                    {selectedProduct.metafields.badge}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InterestBasedProductSelector;