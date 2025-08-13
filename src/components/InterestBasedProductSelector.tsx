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
  const [activeTab, setActiveTab] = useState('all');

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
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Choose the Perfect Gift</h3>
            {recipientInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Based on interests:</span>
                {recipientInterests.map((interest, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-primary/10 text-primary border-none">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-muted/50 p-1 h-auto">
          {relevantInterests.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex flex-col items-center gap-2 py-3 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {relevantInterests.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-8 space-y-6">
            <div className="text-center space-y-2">
              <h4 className="text-xl font-semibold text-foreground">{category.label}</h4>
              <p className="text-muted-foreground">{category.description}</p>
            </div>
            
            <ProductSelector
              selectedInterest={category.id === 'all' ? undefined : category.id}
              interests={category.id === 'all' ? recipientInterests : [category.id]}
              onProductSelect={onProductSelect}
              selectedProduct={selectedProduct}
              key={`${category.id}-${activeTab}`}
              className="border-none shadow-none"
            />
          </TabsContent>
        ))}
      </Tabs>

      {selectedProduct && (
        <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-start gap-6">
            {selectedProduct.featuredImage && (
              <div className="flex-shrink-0">
                <img
                  src={selectedProduct.featuredImage}
                  alt={selectedProduct.title}
                  className="w-24 h-24 rounded-lg object-cover shadow-md"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-foreground">{selectedProduct.title}</h4>
                <p className="text-2xl font-bold text-primary">
                  ${selectedProduct.price.toFixed(2)}
                </p>
              </div>
              {selectedProduct.metafields.badge && (
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
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