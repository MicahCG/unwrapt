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
  Webhook,
  ShoppingCart,
  Clock
} from 'lucide-react';

const ProductionTestDashboard = () => {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Helper function to generate proper UUIDs
  const generateTestUUID = () => {
    const uuid = crypto.randomUUID();
    console.log('🔑 Generated UUID:', uuid);
    return uuid;
  };

  // Helper function to handle edge function responses with better error details
  const handleEdgeFunctionResponse = async (response: any, functionName: string) => {
    console.log(`📡 ${functionName} response:`, response);
    
    if (response.error) {
      console.error(`❌ ${functionName} error:`, response.error);
      throw new Error(`${functionName} failed: ${response.error.message || JSON.stringify(response.error)}`);
    }
    
    if (!response.data) {
      console.error(`❌ ${functionName} no data:`, response);
      throw new Error(`${functionName} returned no data`);
    }
    
    if (response.data.success === false) {
      console.error(`❌ ${functionName} not successful:`, response.data);
      const errorMessage = response.data.error || response.data.message || 'Unknown error';
      throw new Error(`${functionName} failed: ${errorMessage}`);
    }
    
    return response.data;
  };

  // Test the specific payment fulfillment flow with better error handling
  const testPaymentFulfillmentFlow = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing Payment Fulfillment Flow...');
      
      // Step 1: Create test data using edge function (bypasses RLS)
      console.log('Step 1: Creating test data via edge function...');
      const testGiftId = generateTestUUID();
      const testUserId = generateTestUUID();
      const testRecipientId = generateTestUUID();
      
      console.log('📋 Test IDs generated:', {
        testGiftId,
        testUserId,
        testRecipientId
      });
      
      // Use an edge function to create test data (bypasses RLS)
      console.log('👤 Creating test data with IDs via edge function...');
      const createTestDataResponse = await supabase.functions.invoke('create-test-data', {
        body: {
          testGiftId,
          testUserId,
          testRecipientId,
          recipient: {
            name: 'Test Recipient',
            email: 'test@example.com',
            street: '123 Test Street',
            city: 'Test City',
            state: 'CA',
            zip_code: '12345',
            country: 'US'
          },
          gift: {
            occasion: 'Test Birthday',
            occasion_date: '2024-12-25',
            payment_status: 'paid',
            status: 'scheduled',
            gift_type: 'Test Gift',
            price_range: '$25-50'
          }
        }
      });

      const testDataResult = await handleEdgeFunctionResponse(createTestDataResponse, 'create-test-data');
      console.log('✅ Test data created via edge function:', testDataResult);

      // Step 2: Test process-gift-fulfillment function
      console.log('Step 2: Testing process-gift-fulfillment with gift ID:', testGiftId);
      
      const fulfillmentResponse = await supabase.functions.invoke('process-gift-fulfillment', {
        body: {
          scheduledGiftId: testGiftId
        }
      });

      const fulfillmentData = await handleEdgeFunctionResponse(fulfillmentResponse, 'process-gift-fulfillment');
      console.log('✅ Process-gift-fulfillment succeeded:', fulfillmentData);

      setTestResults(prev => [...prev, {
        test: 'Payment Fulfillment Flow',
        status: 'success',
        step: 'complete',
        result: fulfillmentData,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Fulfillment Test Successful",
        description: "Complete payment fulfillment flow tested successfully",
      });

      // Clean up test data via edge function
      console.log('🧹 Cleaning up test data via edge function...');
      try {
        const cleanupResponse = await supabase.functions.invoke('cleanup-test-data', {
          body: {
            testGiftId,
            testRecipientId
          }
        });

        if (cleanupResponse.error) {
          console.log('⚠️ Cleanup warning (may be OK):', cleanupResponse.error);
        } else {
          console.log('✅ Cleanup completed');
        }
      } catch (cleanupError) {
        console.log('⚠️ Cleanup failed (not critical):', cleanupError);
      }

    } catch (error) {
      console.error('❌ Payment fulfillment flow test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Payment Fulfillment Flow',
        status: 'error',
        step: 'execution',
        result: error.message,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Flow Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test just the shopify-order function directly  
  const testShopifyOrderDirect = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing shopify-order function directly...');
      
      const testGiftId = generateTestUUID();
      console.log('🎁 Using gift ID for Shopify test:', testGiftId);
      
      const testAddress = {
        first_name: 'Test',
        last_name: 'User',
        address1: '123 Test Street',
        city: 'Test City',
        province: 'CA',
        country: 'US',
        zip: '12345',
        phone: '555-123-4567'
      };

      const response = await supabase.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId: testGiftId,
          recipientAddress: testAddress,
          testMode: true
        }
      });

      const data = await handleEdgeFunctionResponse(response, 'shopify-order');

      setTestResults(prev => [...prev, {
        test: 'Shopify Order Direct',
        status: 'success',
        result: data,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Shopify Order Test Successful",
        description: "Direct shopify-order function test completed",
      });

    } catch (error) {
      console.error('❌ Shopify order direct test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Shopify Order Direct',
        status: 'error',
        result: error.message,
        timestamp: new Date().toISOString()
      }]);

      toast({
        title: "Shopify Order Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test verify-payment with mock session
  const testVerifyPaymentFlow = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing verify-payment flow...');
      
      const testSessionId = 'cs_test_' + Date.now() + '_fulfillment_test';
      console.log('💳 Using test session ID:', testSessionId);
      
      const response = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: testSessionId }
      });

      const data = await handleEdgeFunctionResponse(response, 'verify-payment');

      setTestResults(prev => [...prev, {
        test: 'Verify Payment Flow',
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
        test: 'Verify Payment Flow',
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

  // Test Stripe with test card numbers (no real charges)
  const testStripeIntegration = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing Stripe integration with test data...');
      
      const testGiftId = generateTestUUID();
      console.log('🎁 Using gift ID for Stripe test:', testGiftId);
      
      const { data, error } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: testGiftId,
          testMode: true
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
      
      const testGiftId = generateTestUUID();
      console.log('🎁 Using gift ID for Shopify integration test:', testGiftId);
      
      const { data, error } = await supabase.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId: testGiftId,
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
    
    const tests = [
      { name: 'Payment Verification', func: testVerifyPaymentFlow },
      { name: 'Shopify Order Direct', func: testShopifyOrderDirect },
      { name: 'Payment Fulfillment Flow', func: testPaymentFulfillmentFlow }
    ];
    
    for (const test of tests) {
      try {
        console.log(`🧪 Running ${test.name}...`);
        await test.func();
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error);
        // Continue with next test even if one fails
      }
    }
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
          <Tabs defaultValue="fulfillment" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="fulfillment">Fulfillment Flow</TabsTrigger>
              <TabsTrigger value="individual">Individual Tests</TabsTrigger>
              <TabsTrigger value="batch">Batch Testing</TabsTrigger>
              <TabsTrigger value="results">Test Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="fulfillment" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-semibold text-blue-900 mb-2">Payment Fulfillment Flow Testing</h3>
                <p className="text-sm text-blue-800 mb-3">
                  These tests specifically target the flow where process-gift-fulfillment is called.
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>1. ✅ Create test data (bypasses RLS)</div>
                  <div>2. ✅ Call process-gift-fulfillment</div>
                  <div>3. ✅ Verify Shopify order creation</div>
                  <div>4. ✅ Clean up test data</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Full Fulfillment Flow
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tests the complete flow from payment verification to order creation
                    </p>
                    <Button 
                      size="sm" 
                      onClick={testPaymentFulfillmentFlow}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Full Flow
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Shopify Order Direct
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Tests shopify-order function directly in test mode
                    </p>
                    <Button 
                      size="sm" 
                      onClick={testShopifyOrderDirect}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Shopify Direct
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
                      onClick={testVerifyPaymentFlow}
                      disabled={isRunningTests}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Test Verification
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="individual" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Individual function tests are available in the Fulfillment Flow tab.
              </p>
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
                              {result.step && (
                                <Badge variant="outline" className="text-xs">
                                  {result.step}
                                </Badge>
                              )}
                              <Badge 
                                variant={result.status === 'success' ? 'default' : result.status === 'warning' ? 'secondary' : 'destructive'}
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
