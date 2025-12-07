import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFromOnboarding, setIsFromOnboarding] = useState(false);

  useEffect(() => {
    const sessionId = 
      searchParams.get('session_id') || 
      searchParams.get('checkout_session_id') ||
      searchParams.get('sessionId') ||
      searchParams.get('checkoutSessionId');
  
    console.log('PaymentSuccess: URL params:', { 
      sessionId, 
      allParams: Object.fromEntries(searchParams.entries()),
      currentURL: window.location.href
    });
    
    // Check if this payment came from onboarding flow
    const onboardingFlag = localStorage.getItem('onboardingPaymentFlow');
    if (onboardingFlag === 'true') {
      setIsFromOnboarding(true);
      localStorage.removeItem('onboardingPaymentFlow');
    }
    
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      console.error('PaymentSuccess: No session_id found in URL');
      setIsVerifying(false);
      toast({
        title: "Session Not Found",
        description: "Unable to find payment session. Please try again or contact support.",
        variant: "destructive"
      });
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      console.log('PaymentSuccess: Verifying session:', sessionId);
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      console.log('PaymentSuccess: Response:', { data, error });

      if (error) {
        console.error('PaymentSuccess: Error:', error);
        throw error;
      }

      if (data?.paymentStatus === 'paid') {
        setVerificationComplete(true);
        setShowConfetti(true);
        
        if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['upcoming-gifts', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['unpaid-gifts', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
          
          if (isFromOnboarding) {
            await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
            await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
          }
        }
        
        toast({
          title: "Payment Successful!",
          description: "Your subscription is now active.",
        });
      } else {
        toast({
          title: "Payment Status",
          description: `Status: ${data?.paymentStatus || 'unknown'}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('PaymentSuccess: Verification error:', error);
      toast({
        title: "Verification Error",
        description: "There was an issue verifying your payment.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/', { replace: true });
  };

  const handleRetryVerification = () => {
    const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
    if (sessionId) {
      setIsVerifying(true);
      setVerificationComplete(false);
      verifyPayment(sessionId);
    }
  };

  const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
  const hasSessionId = !!sessionId;

  return (
    <>
      <ConfettiAnimation isActive={showConfetti} duration={6000} startDelay={0} />
      
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border border-[#E8E4DE] shadow-lg">
          <CardHeader className="text-center pb-2 pt-8">
            {/* Status Icon */}
            <div className="flex justify-center mb-6">
              {isVerifying ? (
                <div className="w-20 h-20 rounded-full bg-[#F5F3F0] flex items-center justify-center">
                  <RefreshCw className="h-10 w-10 text-[#8B7355] animate-spin" />
                </div>
              ) : verificationComplete ? (
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="h-10 w-10 text-amber-600" />
                </div>
              )}
            </div>
            
            {/* Title */}
            <CardTitle className="text-2xl font-display text-[#1A1A1A]">
              {isVerifying 
                ? 'Verifying Payment...' 
                : verificationComplete 
                  ? 'Welcome to VIP!' 
                  : 'Payment Issue'
              }
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center px-6 pb-8">
            {/* Description */}
            <p className="text-[#1A1A1A]/70 leading-relaxed">
              {isVerifying 
                ? 'Please wait while we confirm your subscription...'
                : verificationComplete 
                  ? 'Your VIP subscription is now active. Enjoy unlimited recipients, gift automation, and more!'
                  : hasSessionId
                    ? 'We encountered an issue processing your payment. Please try again.'
                    : 'We couldn\'t find your payment session. This may happen if the checkout was cancelled.'
              }
            </p>
            
            {/* VIP Features - only show on success */}
            {verificationComplete && (
              <div className="bg-[#F5F3F0] rounded-lg p-4 space-y-2 text-left">
                <p className="text-sm font-medium text-[#1A1A1A] mb-3">Your VIP benefits:</p>
                <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/80">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Unlimited recipients</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/80">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Gift automation & scheduling</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/80">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>Gift wallet with auto-reload</span>
                </div>
              </div>
            )}

            {/* Error details - only show when no session */}
            {!isVerifying && !hasSessionId && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <p className="text-xs text-amber-800">
                  <strong>Need help?</strong> Contact support with your payment confirmation email.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!isVerifying && !verificationComplete && hasSessionId && (
                <Button 
                  onClick={handleRetryVerification}
                  variant="outline"
                  className="w-full h-12 border-[#8B7355]/30 text-[#8B7355] hover:bg-[#8B7355]/5"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Verification
                </Button>
              )}

              <Button 
                size="lg" 
                className="w-full h-12 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white"
                onClick={handleGoToDashboard}
                disabled={isVerifying}
              >
                <Gift className="w-4 h-4 mr-2" />
                {verificationComplete ? 'Go to Dashboard' : 'Back to Home'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PaymentSuccess;
