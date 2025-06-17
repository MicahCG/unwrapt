
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, TestTube2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import OrderStatusTracker from './OrderStatusTracker';

interface ShopifyTestModalProps {
  gift: any;
  isOpen: boolean;
  onClose: () => void;
}

const ShopifyTestModal: React.FC<ShopifyTestModalProps> = ({ gift, isOpen, onClose }) => {
  const { toast } = useToast();
  const [isTestingLive, setIsTestingLive] = useState(false);
  const [isTestingDry, setIsTestingDry] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState('schedule');
  const [error, setError] = useState<string | null>(null);

  const validateGiftData = () => {
    const errors = [];
    
    if (!gift.recipients?.name) errors.push('Recipient name is missing');
    
    // Updated validation to check individual address columns instead of JSONB
    if (!gift.recipients?.street) errors.push('Recipient street address is missing');
    if (!gift.recipients?.city) errors.push('Recipient city is missing');
    if (!gift.recipients?.state) errors.push('Recipient state is missing');
    if (!gift.recipients?.zip_code) errors.push('Recipient ZIP code is missing');
    
    if (!gift.price_range) errors.push('Price range is not set');
    
    return errors;
  };

  const handleTestIntegration = async (testMode: boolean) => {
    const validationErrors = validateGiftData();
    if (validationErrors.length > 0) {
      setError(`Invalid gift data: ${validationErrors.join(', ')}`);
      toast({
        title: "Invalid Test Data",
        description: validationErrors.join(', '),
        variant: "destructive",
      });
      return;
    }

    const setLoading = testMode ? setIsTestingDry : setIsTestingLive;
    setLoading(true);
    setTestResults(null);
    setError(null);
    setCurrentStep('payment');

    try {
      // Prepare recipient address using individual columns
      const testAddress = {
        first_name: gift.recipients?.name?.split(' ')[0] || 'Test',
        last_name: gift.recipients?.name?.split(' ').slice(1).join(' ') || 'User',
        address1: gift.recipients?.street || '123 Test Street',
        city: gift.recipients?.city || 'Test City',
        province: gift.recipients?.state || 'CA',
        country: gift.recipients?.country || 'US',
        zip: gift.recipients?.zip_code || '12345',
        phone: gift.recipients?.phone || '555-123-4567'
      };

      console.log('🧪 Testing Shopify integration:', {
        testMode,
        giftId: gift.id,
        recipientName: gift.recipients?.name,
        address: testAddress
      });

      setCurrentStep('verification');

      const { data, error } = await supabase.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId: gift.id,
          recipientAddress: testAddress,
          testMode: testMode
        }
      });

      if (error) {
        console.error('❌ Shopify test error:', error);
        throw error;
      }

      setCurrentStep('fulfillment');
      setTestResults(data);
      
      if (data.success) {
        setCurrentStep(testMode ? 'fulfillment' : 'shipped');
        toast({
          title: testMode ? "Test Completed Successfully" : "Order Created Successfully",
          description: testMode 
            ? `Product selected: ${data.selectedProduct?.productName || 'Vanilla Candle'}`
            : `Order ${data.shopifyOrderName} created successfully`,
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }

    } catch (error) {
      console.error('❌ Shopify test error:', error);
      setError(error.message || 'Failed to test Shopify integration');
      setCurrentStep('schedule');
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Shopify integration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validationErrors = validateGiftData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Test Shopify Integration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Gift Details */}
          <div className="bg-brand-cream-light p-4 rounded-lg">
            <h3 className="font-semibold text-brand-charcoal mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Gift Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><strong>Recipient:</strong> {gift.recipients?.name || 'Not set'}</p>
                <p><strong>Occasion:</strong> {gift.occasion || 'Not set'}</p>
                <p><strong>Price Range:</strong> {gift.price_range || 'Not set'}</p>
              </div>
              <div className="space-y-2">
                <p><strong>Address:</strong></p>
                <div className="text-xs bg-white p-2 rounded border">
                  {gift.recipients?.street ? (
                    <>
                      <div>{gift.recipients.street}</div>
                      <div>{gift.recipients.city}, {gift.recipients.state} {gift.recipients.zip_code}</div>
                      <div>{gift.recipients.country || 'US'}</div>
                    </>
                  ) : (
                    <span className="text-red-600">No address set</span>
                  )}
                </div>
              </div>
            </div>
            {gift.recipients?.interests && gift.recipients.interests.length > 0 && (
              <div className="mt-3">
                <strong className="text-sm">Interests:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {gift.recipients.interests.map((interest: string) => (
                    <Badge key={interest} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h4 className="font-medium text-red-800">Data Validation Issues</h4>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
              <p className="text-sm text-red-700 mt-2">
                Please ensure all recipient data is complete before testing.
              </p>
            </div>
          )}

          {/* Order Status Tracker */}
          <OrderStatusTracker 
            giftId={gift.id}
            currentStep={currentStep}
            error={error}
            testResults={testResults}
          />

          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-brand-charcoal">Dry Run Test</h4>
              <p className="text-sm text-brand-charcoal/70">
                Test product matching without creating an actual order
              </p>
              <Button
                onClick={() => handleTestIntegration(true)}
                disabled={isTestingDry || validationErrors.length > 0}
                className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              >
                {isTestingDry ? 'Testing...' : 'Run Dry Test'}
                <TestTube2 className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-brand-charcoal">Live Test</h4>
              <p className="text-sm text-brand-charcoal/70">
                Create an actual test order in Shopify
              </p>
              <Button
                onClick={() => handleTestIntegration(false)}
                disabled={isTestingLive || validationErrors.length > 0}
                className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              >
                {isTestingLive ? 'Creating Order...' : 'Create Live Order'}
                <ShoppingCart className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Test Results */}
          {testResults && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                {testResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h4 className="font-semibold">
                  {testResults.testMode ? 'Test Results' : 'Order Results'}
                </h4>
              </div>
              
              <div className="space-y-2 text-sm">
                {testResults.selectedProduct && (
                  <>
                    <p><strong>Selected Product:</strong> {testResults.selectedProduct.productName || 'Vanilla Candle'}</p>
                    <p><strong>Variant ID:</strong> {testResults.selectedProduct.variantId}</p>
                    <p><strong>Price:</strong> ${testResults.variant?.price || '25.00'}</p>
                    <p><strong>Match Reason:</strong> {testResults.selectedProduct.matchReason}</p>
                    {!testResults.testMode && testResults.shopifyOrderName && (
                      <p><strong>Order Number:</strong> {testResults.shopifyOrderName}</p>
                    )}
                    {testResults.trackingUrl && (
                      <p><strong>Tracking URL:</strong> 
                        <a href={testResults.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                          View in Shopify
                        </a>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShopifyTestModal;
