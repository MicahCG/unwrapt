
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ExternalLink, Clock, CheckCircle } from 'lucide-react';

interface ShopifyOrderStatusProps {
  gift: any;
}

const ShopifyOrderStatus: React.FC<ShopifyOrderStatusProps> = ({ gift }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered':
        return <Package className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Extract Shopify order info from gift description
  const extractOrderInfo = (description: string) => {
    if (!description) return null;
    
    const orderMatch = description.match(/Shopify Order: ([^|]+)/);
    const productMatch = description.match(/Product: ([^|]+)/);
    
    return {
      orderName: orderMatch?.[1]?.trim(),
      productTitle: productMatch?.[1]?.trim()
    };
  };

  const orderInfo = extractOrderInfo(gift.gift_description || '');

  return (
    <Card className="border-l-4 border-l-brand-gold">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            {getStatusIcon(gift.status)}
            <span>Order Status</span>
          </div>
          <Badge className={getStatusColor(gift.status)}>
            {gift.status === 'ordered' ? 'Processing' : gift.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {orderInfo?.orderName && (
          <div>
            <p className="text-sm font-medium text-brand-charcoal">Order Number</p>
            <p className="text-sm text-brand-charcoal/70">{orderInfo.orderName}</p>
          </div>
        )}
        
        {orderInfo?.productTitle && (
          <div>
            <p className="text-sm font-medium text-brand-charcoal">Product</p>
            <p className="text-sm text-brand-charcoal/70">{orderInfo.productTitle}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium text-brand-charcoal">Delivery Date</p>
          <p className="text-sm text-brand-charcoal/70">
            {gift.delivery_date 
              ? new Date(gift.delivery_date).toLocaleDateString()
              : 'Processing'
            }
          </p>
        </div>

        {gift.status === 'ordered' && (
          <div className="bg-brand-gold/10 p-3 rounded-lg">
            <p className="text-xs text-brand-charcoal">
              🎁 Your gift is being prepared and will be shipped soon!
            </p>
          </div>
        )}

        {gift.status === 'delivered' && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-green-700">
              ✅ Gift delivered successfully!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShopifyOrderStatus;
