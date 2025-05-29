
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertCircle, Package, CreditCard, Truck } from 'lucide-react';

interface OrderStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  icon: React.ReactNode;
  description?: string;
}

interface OrderStatusTrackerProps {
  giftId?: string;
  currentStep?: string;
  error?: string;
  testResults?: any;
}

const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({ 
  giftId, 
  currentStep = 'schedule', 
  error,
  testResults 
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const steps: OrderStep[] = [
    {
      id: 'schedule',
      label: 'Gift Scheduled',
      status: currentStep === 'schedule' ? 'active' : 'completed',
      icon: <Clock className="h-4 w-4" />,
      description: 'Gift has been scheduled with recipient details'
    },
    {
      id: 'payment',
      label: 'Payment Processing',
      status: error ? 'error' : currentStep === 'payment' ? 'active' : currentStep === 'schedule' ? 'pending' : 'completed',
      icon: <CreditCard className="h-4 w-4" />,
      description: 'Stripe payment session created and processed'
    },
    {
      id: 'verification',
      label: 'Payment Verified',
      status: error ? 'error' : currentStep === 'verification' ? 'active' : ['schedule', 'payment'].includes(currentStep) ? 'pending' : 'completed',
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Payment confirmation received from Stripe'
    },
    {
      id: 'fulfillment',
      label: 'Order Fulfillment',
      status: error ? 'error' : currentStep === 'fulfillment' ? 'active' : ['schedule', 'payment', 'verification'].includes(currentStep) ? 'pending' : 'completed',
      icon: <Package className="h-4 w-4" />,
      description: 'Shopify order created and product selected'
    },
    {
      id: 'shipped',
      label: 'Shipped',
      status: currentStep === 'shipped' ? 'completed' : 'pending',
      icon: <Truck className="h-4 w-4" />,
      description: 'Package shipped to recipient'
    }
  ];

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'active': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'error': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-400 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'active': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Status Tracker
          {giftId && (
            <Badge variant="outline" className="text-xs">
              {giftId.slice(0, 8)}...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800">Error Occurred</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-2">
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getStepColor(step.status)}`}
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{step.label}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${step.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' : 
                                           step.status === 'active' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                           step.status === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                                           'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      {step.status}
                    </Badge>
                  </div>
                  {step.description && (
                    <p className="text-sm opacity-75 mt-1">{step.description}</p>
                  )}
                </div>
              </div>

              {expandedStep === step.id && testResults && (
                <div className="ml-6 p-3 bg-white border border-gray-200 rounded text-sm">
                  <pre className="whitespace-pre-wrap text-gray-600">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </div>
              )}

              {index < steps.length - 1 && (
                <div className="ml-6 w-px h-4 bg-gray-200"></div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderStatusTracker;
