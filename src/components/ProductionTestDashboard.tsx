
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  TestTube2, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Play,
  Settings,
  Database,
  Webhook
} from 'lucide-react';

const ProductionTestDashboard = () => {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Test Stripe with test card numbers (no real charges)
  const testStripeIntegration = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing Stripe integration with test data...');
      
      // Test creating a payment session (this won't charge real money in test mode)
      const { data, error } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: 'test-gift-' + Date.now(),
          testMode: true // Important: test mode flag
        }
      });

      if (error) throw error;

      setTestResults(prev => [...prev, {
        test: 'Stripe Payment Creation',
        status: 'success',
        result: data,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Stripe Test Successful",
        description: "Payment session created successfully in test mode",
      });

    } catch (error) {
      console.error('❌ Stripe test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Stripe Payment Creation',
        status: 'error',
        result: error.message,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Stripe Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test payment verification with mock session
  const testPaymentVerification = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing payment verification...');
      
      // Use a test session ID that won't charge anything
      const testSessionId = 'cs_test_' + Date.now() + '_mock_verification';
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: testSessionId }
      });

      if (error) throw error;

      setTestResults(prev => [...prev, {
        test: 'Payment Verification',
        status: 'success',
        result: data,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Payment Verification Test Successful",
        description: "Mock payment verification completed",
      });

    } catch (error) {
      console.error('❌ Payment verification test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Payment Verification',
        status: 'error',
        result: error.message,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Payment Verification Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test Shopify integration in dry-run mode
  const testShopifyIntegration = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing Shopify integration in test mode...');
      
      const { data, error } = await supabase.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId: 'test-gift-' + Date.now(),
          recipientAddress: {
            first_name: 'Test',
            last_name: 'User',
            address1: '123 Test Street',
            city: 'Test City',
            province: 'CA',
            country: 'US',
            zip: '12345',
            phone: '555-123-4567'
          },
          testMode: true // This prevents real order creation
        }
      });

      if (error) throw error;

      setTestResults(prev => [...prev, {
        test: 'Shopify Integration',
        status: 'success',
        result: data,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Shopify Test Successful",
        description: "Product matching and order logic tested successfully",
      });

    } catch (error) {
      console.error('❌ Shopify test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Shopify Integration',
        status: 'error',
        result: error.message,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Shopify Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test email sending
  const testEmailFunction = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing email functionality...');
      
      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'gift_scheduled',
          userEmail: 'test@example.com',
          userName: 'Test User',
          recipientName: 'Test Recipient',
          giftDetails: {
            occasion: 'Test Occasion',
            occasionDate: '2024-01-01',
            giftType: 'Test Gift',
            priceRange: '$25-50'
          }
        }
      });

      if (error) throw error;

      setTestResults(prev => [...prev, {
        test: 'Email Notification',
        status: 'success',
        result: data,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Email Test Successful",
        description: "Test email sent successfully",
      });

    } catch (error) {
      console.error('❌ Email test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Email Notification',
        status: 'error',
        result: error.message,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Email Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Run all tests in sequence
  const runAllTests = async () => {
    setTestResults([]);
    await testStripeIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    await testPaymentVerification();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testShopifyIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testEmailFunction();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Production Testing Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test your deployed edge functions without real purchases or charges
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="individual">Individual Tests</TabsTrigger>
              <TabsTrigger value="batch">Batch Testing</TabsTrigger>
              <TabsTrigger value="results">Test Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Stripe Payment Test
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tests payment session creation using Stripe's test mode
                    </p>
                    <Button 
                      size="sm" 
                      onClick={testStripeIntegration}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Stripe
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Payment Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tests payment verification with mock session data
                    </p>
                    <Button 
                      size="sm" 
                      onClick={testPaymentVerification}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Verification
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Shopify Integration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tests product matching without creating real orders
                    </p>
                    <Button 
                      size="sm" 
                      onClick={testShopifyIntegration}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Shopify
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Email Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tests email sending functionality with test data
                    </p>
                    <Button 
                      size="sm" 
                      onClick={testEmailFunction}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Email
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="batch" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Run All Tests</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Execute all tests in sequence to validate the entire system
                  </p>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={runAllTests}
                    disabled={isRunningTests}
                    className="w-full"
                    size="lg"
                  >
                    {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
                    <TestTube2 className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Results</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setTestResults([])}
                    >
                      Clear Results
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {testResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No test results yet. Run some tests to see results here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {testResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{result.test}</span>
                              <Badge 
                                variant={result.status === 'success' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {result.status === 'success' ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {result.status}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded p-2 text-xs">
                            <pre className="whitespace-pre-wrap overflow-x-auto">
                              {typeof result.result === 'object' 
                                ? JSON.stringify(result.result, null, 2)
                                : result.result
                              }
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionTestDashboard;
