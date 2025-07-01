// Enhanced PaymentSuccess component with better debugging
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { useAuth } from '@/components/auth/AuthProvider';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showVerificationConfetti, setShowVerificationConfetti] = useState(false);
  const [isFromOnboarding, setIsFromOnboarding] = useState(false);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    // Get all possible session ID parameters from Stripe
    const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
    const testParam = searchParams.get('test');
    
    console.log('🔧 PaymentSuccess: URL params:', { 
      sessionId, 
      testParam,
      allParams: Object.fromEntries(searchParams.entries()),
      currentURL: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search
    });
    
    if (testParam === 'true') {
      console.log('🔧 PaymentSuccess: Test mode activated');
      setTestMode(true);
      const testSessionId = 'cs_test_' + Date.now();
      console.log('🔧 PaymentSuccess: Using test session ID:', testSessionId);
      testVerifyPayment(testSessionId);
      return;
    }
    
    // Check if this payment came from onboarding flow
    const onboardingFlag = localStorage.getItem('onboardingPaymentFlow');
    if (onboardingFlag === 'true') {
      setIsFromOnboarding(true);
      localStorage.removeItem('onboardingPaymentFlow');
      console.log('🔧 PaymentSuccess: Detected onboarding payment flow');
    }
    
    if (sessionId) {
      console.log('🔧 PaymentSuccess: Starting payment verification for session:', sessionId);
      verifyPayment(sessionId);
    } else {
      console.error('🔧 PaymentSuccess: No session_id found in URL parameters');
      console.error('🔧 PaymentSuccess: Available URL parameters:', Object.fromEntries(searchParams.entries()));
      console.error('🔧 PaymentSuccess: Full URL:', window.location.href);
      setIsVerifying(false);
      
      // Show more detailed error information
      toast({
        title: "Payment Verification Issue",
        description: `Unable to find payment session. URL: ${window.location.href}. Available params: ${Object.keys(Object.fromEntries(searchParams.entries())).join(', ') || 'none'}`,
        variant: "destructive"
      });
    }
  }, [searchParams]);

  const testVerifyPayment = async (testSessionId) => {
    console.log('🧪 PaymentSuccess: Testing verification flow with session:', testSessionId);
    
    try {
      console.log('🧪 PaymentSuccess: Calling verify-payment function...');
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId: testSessionId }
      });

      console.log('🧪 PaymentSuccess: verify-payment response:', { data, error });

      if (error) {
        console.error('🧪 PaymentSuccess: verify-payment function error:', error);
        toast({
          title: "Test Failed",
          description: `verify-payment function error: ${error.message}`,
          variant: "destructive"
        });
        
        setVerificationComplete(false);
      } else {
        console.log('🧪 PaymentSuccess: verify-payment succeeded');
        setVerificationComplete(true);
        setShowVerificationConfetti(true);
        
        toast({
          title: "Test Status",
          description: `Test session processed. Response received from verify-payment function.`,
        });
      }
      
    } catch (error) {
      console.error('🧪 PaymentSuccess: Test error:', error);
      toast({
        title: "Test Error",
        description: `Test failed: ${error.message}`,
        variant: "destructive"
      });
      setVerificationComplete(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPayment = async (sessionId) => {
    try {
      console.log('🔧 PaymentSuccess: Calling verify-payment function with session:', sessionId);
      console.log('🔧 PaymentSuccess: Supabase client configured, user authenticated:', !!user);
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      console.log('🔧 PaymentSuccess: Verify payment response:', { data, error });

      if (error) {
        console.error('🔧 PaymentSuccess: Error from verify-payment function:', error);
        throw error;
      }

      if (data?.paymentStatus === 'paid') {
        console.log('🔧 PaymentSuccess: Payment verified successfully');
        setVerificationComplete(true);
        setShowVerificationConfetti(true);
        
        // If this was from onboarding, invalidate onboarding status
        if (isFromOnboarding && user?.id) {
          console.log('🔧 PaymentSuccess: Invalidating onboarding queries');
          await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['user-metrics', user.id] });
        }
        
        toast({
          title: "Payment Successful!",
          description: "Your gift has been scheduled and payment confirmed.",
        });
      } else {
        console.log('🔧 PaymentSuccess: Payment not completed, status:', data?.paymentStatus);
        toast({
          title: "Payment Status",
          description: `Payment status: ${data?.paymentStatus || 'unknown'}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🔧 PaymentSuccess: Error verifying payment:', error);
      toast({
        title: "Verification Error",
        description: "There was an issue verifying your payment. Please contact support if needed.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoToDashboard = async () => {
    console.log('🔧 PaymentSuccess: Navigating to dashboard');
    
    // If from onboarding, force refresh the onboarding status before navigating
    if (isFromOnboarding && user?.id) {
      try {
        // Invalidate all relevant queries to force refresh
        await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
        
        // Small delay to allow queries to invalidate
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 100);
      } catch (error) {
        console.error('Error invalidating queries:', error);
        navigate('/', { replace: true });
      }
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleRetryVerification = () => {
    console.log('🔧 PaymentSuccess: Manually retrying verification');
    const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
    
    if (sessionId) {
      setIsVerifying(true);
      setVerificationComplete(false);
      verifyPayment(sessionId);
    } else {
      toast({
        title: "No Session ID",
        description: "Cannot retry verification without a valid session ID in the URL.",
        variant: "destructive"
      });
    }
  };

  const runManualTest = () => {
    console.log('🧪 PaymentSuccess: Running manual test');
    setIsVerifying(true);
    setVerificationComplete(false);
    testVerifyPayment('cs_test_manual_' + Date.now());
  };

  if (isVerifying) {
    return (
      <>
        <ConfettiAnimation isActive={showConfetti} duration={5000} startDelay={0} />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
                <p className="text-brand-charcoal">
                  {testMode ? 'Testing payment verification...' : 'Verifying your payment and creating your order...'}
                </p>
                <p className="text-sm text-brand-charcoal/60 mt-2">This may take a few moments</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // If no session ID and not in test mode, show error state with retry options
  const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
  const hasSessionId = !!sessionId;

  return (
    <>
      <ConfettiAnimation isActive={showConfetti} duration={5000} startDelay={0} />
      <ConfettiAnimation isActive={showVerificationConfetti} duration={5500} startDelay={0} />
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${verificationComplete ? 'bg-green-100' : hasSessionId ? 'bg-brand-gold/20' : 'bg-red-100'}`}>
                {verificationComplete ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : hasSessionId ? (
                  <Gift className="h-12 w-12 text-brand-gold" />
                ) : (
                  <Gift className="h-12 w-12 text-red-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-brand-charcoal">
              {testMode 
                ? 'Test Complete!' 
                : verificationComplete 
                  ? 'Payment Successful!' 
                  : hasSessionId 
                    ? 'Thank You!' 
                    : 'Payment Issue'
              }
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 text-center">
            <p className="text-brand-charcoal/70">
              {testMode 
                ? 'Payment verification test completed. Check console logs and Supabase function logs for details.'
                : verificationComplete 
                  ? 'Your gift has been scheduled and your payment has been confirmed. We\'ll take care of everything from here!'
                  : hasSessionId
                    ? 'We\'re processing your order now.'
                    : 'There was an issue finding your payment session. This might be due to a URL problem or payment cancellation.'
              }
            </p>
            
            {/* Debug info section - only show if no session ID */}
            {!hasSessionId && !testMode && (
              <div className="bg-gray-100 p-3 rounded text-left text-xs text-gray-600">
                <p><strong>Debug Info:</strong></p>
                <p>URL: {window.location.href}</p>
                <p>Params: {JSON.stringify(Object.fromEntries(searchParams.entries()))}</p>
              </div>
            )}
            
            {(verificationComplete || hasSessionId) && (
              <div className="bg-brand-gold/10 p-4 rounded-lg">
                <p className="text-sm text-brand-charcoal">
                  🎁 We'll curate the perfect gift and handle delivery at just the right time
                </p>
              </div>
            )}

            {testMode && (
              <Button 
                onClick={runManualTest}
                variant="outline"
                className="w-full mb-2"
              >
                <TestTube className="w-4 h-4 mr-2" />
                Run Another Test
              </Button>
            )}

            {!hasSessionId && !testMode && (
              <Button 
                onClick={handleRetryVerification}
                variant="outline"
                className="w-full mb-2"
              >
                Retry Verification
              </Button>
            )}

            <Button 
              size="lg" 
              className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
              onClick={handleGoToDashboard}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentSuccess;