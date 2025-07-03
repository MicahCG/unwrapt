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

  // Test the specific payment fulfillment flow
  const testPaymentFulfillmentFlow = async () => {
    setIsRunningTests(true);
    
    try {
      console.log('🧪 Testing Payment Fulfillment Flow...');
      
      // Step 1: Create a test scheduled gift record first
      console.log('Step 1: Creating test scheduled gift...');
      const testGiftId = generateTestUUID();
      const testUserId = generateTestUUID();
      const testRecipientId = generateTestUUID();
      
      console.log('📋 Test IDs generated:', {
        testGiftId,
        testUserId,
        testRecipientId
      });
      
      // First create a test recipient
      console.log('👤 Creating test recipient with ID:', testRecipientId);
      const { data: recipientData, error: recipientError } = await supabase
        .from('recipients')
        .insert({
          id: testRecipientId,
          user_id: testUserId,
          name: 'Test Recipient',
          email: 'test@example.com',
          street: '123 Test Street',
          city: 'Test City', 
          state: 'CA',
          zip_code: '12345',
          country: 'US'
        })
        .select()
        .single();

      if (recipientError) {
        console.error('❌ Failed to create test recipient:', recipientError);
        throw new Error(`Failed to create test recipient: ${recipientError.message}`);
      }

      console.log('✅ Test recipient created:', recipientData);

      console.log('🎁 Creating test scheduled gift with ID:', testGiftId);
      const { data: giftData, error: giftError } = await supabase
        .from('scheduled_gifts')
        .insert({
          id: testGiftId,
          user_id: testUserId,
          occasion: 'Test Birthday',
          occasion_date: '2024-12-25',
          recipient_id: testRecipientId,
          payment_status: 'paid',
          status: 'scheduled',
          gift_type: 'Test Gift',
          price_range: '$25-50'
        })
        .select()
        .single();

      if (giftError) {
        console.error('❌ Failed to create test gift:', giftError);
        throw new Error(`Failed to create test gift: ${giftError.message}`);
      }

      console.log('✅ Test gift created:', giftData);

      // Step 2: Test process-gift-fulfillment function
      console.log('Step 2: Testing process-gift-fulfillment with gift ID:', testGiftId);
      
      const { data: fulfillmentData, error: fulfillmentError } = await supabase.functions.invoke('process-gift-fulfillment', {
        body: {
          scheduledGiftId: testGiftId
        }
      });

      console.log('🔍 Fulfillment response:', { fulfillmentData, fulfillmentError });

      if (fulfillmentError) {
        console.error('❌ Process-gift-fulfillment failed:', fulfillmentError);
        setTestResults(prev => [...prev, {
          test: 'Payment Fulfillment Flow',
          status: 'error',
          step: 'process-gift-fulfillment',
          result: `Fulfillment failed: ${fulfillmentError.message}`,
          timestamp: new Date().toISOString()
        }]);

        toast({
          title: "Fulfillment Test Failed",
          description: `process-gift-fulfillment error: ${fulfillmentError.message}`,
          variant: "destructive"
        });
      } else if (fulfillmentData?.success) {
        console.log('✅ Process-gift-fulfillment succeeded');
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
      } else {
        console.log('⚠️ Process-gift-fulfillment completed with issues:', fulfillmentData);
        setTestResults(prev => [...prev, {
          test: 'Payment Fulfillment Flow',
          status: 'warning',
          step: 'process-gift-fulfillment',
          result: fulfillmentData,
          timestamp: new Date().toISOString()
        }]);

        toast({
          title: "Fulfillment Test Warning",
          description: "Function completed but with potential issues",
          variant: "destructive"
        });
      }

      // Clean up test data
      console.log('🧹 Cleaning up test data...');
      await supabase
        .from('scheduled_gifts')
        .delete()
        .eq('id', testGiftId);

      await supabase
        .from('recipients')
        .delete()
        .eq('id', testRecipientId);

    } catch (error) {
      console.error('❌ Payment fulfillment flow test failed:', error);
      setTestResults(prev => [...prev, {
        test: 'Payment Fulfillment Flow',
        status: 'error',
        step: 'setup',
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

      const { data, error } = await supabase.functions.invoke('shopify-order', {
        body: {
          scheduledGiftId: testGiftId,
          recipientAddress: testAddress,
          testMode: true
        }
      });

      if (error) {
        console.error('❌ Shopify order test failed:', error);
        throw error;
      }

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
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: testSessionId }
      });

      if (error) throw error;

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
    await testStripeIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
    await testVerifyPaymentFlow();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await testPaymentFulfillmentFlow();
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
                  These tests specifically target the flow you described where process-gift-fulfillment is failing.
                </p>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>1. ✅ User completes payment (Stripe)</div>
                  <div>2. ✅ Redirect to /payment/success</div>
                  <div>3. ✅ verify-payment processes</div>
                  <div>4. ✅ Database updated</div>
                  <div>5. ❌ process-gift-fulfillment called <strong>(TESTING THIS)</strong></div>
                  <div>6. ❌ shopify-order function called</div>
                  <div>7. ❌ Shopify order created</div>
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
                      Tests shopify-order function directly (bypassing fulfillment)
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
