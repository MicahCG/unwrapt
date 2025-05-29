import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, TestTube2, CheckCircle, AlertCircle } from 'lucide-react';

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

  const handleTestIntegration = async (testMode: boolean) => {
    const setLoading = testMode ? setIsTestingDry : setIsTestingLive;
    setLoading(true);
    setTestResults(null);

    try {
      const testAddress = {
        first_name: gift.recipients?.name?.split(' ')[0] || 'Test',
        last_name: gift.recipients?.name?.split(' ')[1] || 'User',
        address1: '123 Test Street',
        city: 'Test City',
        province: 'CA',
        country: 'US',
        zip: '12345',
        phone: '555-123-4567'
      };

      const { data, error } = await supabase.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId: gift.id,
          recipientAddress: testAddress,
          testMode: testMode
        }
      });

      if (error) throw error;

      setTestResults(data);
      
      toast({
        title: testMode ? "Test Completed Successfully" : "Order Created Successfully",
        description: testMode 
          ? `Found ${data.totalMatches} matching products, ${data.affordableMatches} within budget`
          : `Order ${data.shopifyOrderName} created successfully`,
      });

    } catch (error) {
      console.error('Shopify test error:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Shopify integration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Test Shopify Integration
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-brand-cream-light p-4 rounded-lg">
            <h3 className="font-semibold text-brand-charcoal mb-2">Gift Details</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Recipient:</strong> {gift.recipients?.name}</p>
              <p><strong>Occasion:</strong> {gift.occasion}</p>
              <p><strong>Price Range:</strong> {gift.price_range}</p>
              <div className="flex items-center gap-2">
                <strong>Interests:</strong>
                {gift.recipients?.interests?.map((interest: string) => (
                  <Badge key={interest} variant="outline" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-brand-charcoal">Dry Run Test</h4>
              <p className="text-sm text-brand-charcoal/70">
                Test product matching without creating an actual order
              </p>
              <Button
                onClick={() => handleTestIntegration(true)}
                disabled={isTestingDry}
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
                disabled={isTestingLive}
                className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              >
                {isTestingLive ? 'Creating Order...' : 'Create Live Order'}
                <ShoppingCart className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

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
                    <p><strong>Selected Product:</strong> {testResults.selectedProduct.title}</p>
                    <p><strong>Price:</strong> ${testResults.variant.price}</p>
                    <p><strong>Match Score:</strong> {testResults.selectedProduct.matchScore}/10</p>
                    <p><strong>Match Reason:</strong> {testResults.selectedProduct.matchReason}</p>
                    <p><strong>Total Matches Found:</strong> {testResults.totalMatches}</p>
                    <p><strong>Within Budget:</strong> {testResults.affordableMatches}</p>
                    {!testResults.testMode && (
                      <p><strong>Order Number:</strong> {testResults.shopifyOrderName}</p>
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
