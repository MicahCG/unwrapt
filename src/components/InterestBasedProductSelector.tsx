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

  // Show all categories for filtering
  const relevantInterests = interestCategories;

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
            {recipientInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-sm text-gray-600">Based on interests:</span>
                {recipientInterests.map((interest, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-blue-50 text-blue-700 border border-blue-200">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-white/90 backdrop-blur-md border border-gray-200 shadow-lg p-1 h-auto rounded-lg">
          {relevantInterests.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex flex-col items-center gap-2 py-3 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-primary/20 rounded-lg transition-all duration-300 hover:bg-gray-50 text-gray-700 data-[state=active]:text-primary"
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {relevantInterests.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-8 space-y-6">
            <div className="text-center space-y-2 p-6 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg">
              <h4 className="text-xl font-semibold text-gray-900">{category.label}</h4>
              <p className="text-gray-600">{category.description}</p>
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