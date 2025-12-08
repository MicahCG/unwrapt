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

  // Check user's subscription status directly as fallback
  const checkSubscriptionStatus = async () => {
    if (!user?.id) {
      setIsVerifying(false);
      return false;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // If user is VIP, they successfully subscribed (webhook already processed)
      if (profile?.subscription_tier === 'vip') {
        console.log('PaymentSuccess: User is VIP, subscription confirmed via profile check');
        setVerificationComplete(true);
        setShowConfetti(true);
        await invalidateQueries();
        toast({
          title: "Payment Successful!",
          description: "Your VIP subscription is now active.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('PaymentSuccess: Error checking subscription:', error);
      return false;
    }
  };

  // Poll subscription status multiple times with exponential backoff
  const pollSubscriptionStatus = async (maxAttempts = 5) => {
    console.log('PaymentSuccess: Starting subscription status polling...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`PaymentSuccess: Poll attempt ${attempt}/${maxAttempts}`);

      const isVip = await checkSubscriptionStatus();
      if (isVip) {
        return true;
      }

      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 3s, 4s
        const delayMs = attempt * 1000;
        console.log(`PaymentSuccess: Not VIP yet, waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return false;
  };

  const invalidateQueries = async () => {
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['upcoming-gifts', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['unpaid-gifts', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      if (isFromOnboarding) {
        await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
      }
    }
  };

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

    const processVerification = async () => {
      if (sessionId) {
        // Try to verify with session_id first
        await verifyPayment(sessionId);
      } else {
        // No session_id - this is common with Stripe billing portal or direct checkout links
        // The webhook likely already processed the subscription
        console.log('PaymentSuccess: No session_id, polling subscription status via webhook processing...');

        const isVip = await pollSubscriptionStatus();

        if (!isVip) {
          setIsVerifying(false);
          toast({
            title: "Verifying Payment",
            description: "Your payment is being processed. Your subscription will be active shortly. Please check your dashboard in a moment.",
            variant: "default"
          });
        } else {
          setIsVerifying(false);
        }
      }
    };

    processVerification();
  }, [searchParams, user?.id]);

  const verifyPayment = async (sessionId: string) => {
    try {
      console.log('PaymentSuccess: Verifying session:', sessionId);

      // For subscription payments, we don't use verify-payment edge function
      // Instead, we rely on the webhook to upgrade the user and poll the database
      // The verify-payment function is designed for gift payments, not subscriptions

      console.log('PaymentSuccess: Polling subscription status after checkout...');
      const isVip = await pollSubscriptionStatus();

      if (!isVip) {
        console.log('PaymentSuccess: Not yet VIP after polling, showing pending message');
        toast({
          title: "Payment Processing",
          description: "Your subscription payment is being processed. Please check your dashboard in a moment.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('PaymentSuccess: Verification error:', error);
      // Even on error, try to check subscription status
      const isVip = await checkSubscriptionStatus();
      if (!isVip) {
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your payment. Please check your dashboard or contact support.",
          variant: "destructive"
        });
      }
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
                ? hasSessionId
                  ? 'Please wait while we confirm your subscription...'
                  : 'Confirming your subscription with Stripe...'
                : verificationComplete
                  ? 'Your VIP subscription is now active. Enjoy unlimited recipients, gift automation, and more!'
                  : hasSessionId
                    ? 'We encountered an issue processing your payment. Please try again.'
                    : 'Your payment is being processed. Please refresh this page in a moment or check your dashboard.'
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
            {!isVerifying && !verificationComplete && !hasSessionId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Your payment was successful in Stripe and is being processed.
                  If you don't see VIP status after refreshing, please contact support with your payment confirmation email.
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
