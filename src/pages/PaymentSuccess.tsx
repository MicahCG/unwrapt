import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift } from 'lucide-react';
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

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    // Check if this payment came from onboarding flow
    const onboardingFlag = localStorage.getItem('onboardingPaymentFlow');
    if (onboardingFlag === 'true') {
      setIsFromOnboarding(true);
      // Clean up the flag
      localStorage.removeItem('onboardingPaymentFlow');
    }
    
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setIsVerifying(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (error) throw error;

      if (data?.paymentStatus === 'paid') {
        setVerificationComplete(true);
        setShowVerificationConfetti(true);
        
        // If this was from onboarding, invalidate onboarding status
        if (isFromOnboarding && user?.id) {
          await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
          await queryClient.invalidateQueries({ queryKey: ['user-metrics', user.id] });
        }
        
        toast({
          title: "Payment Successful!",
          description: "Your gift has been scheduled and payment confirmed.",
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
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

  if (isVerifying) {
    return (
      <>
        <ConfettiAnimation isActive={showConfetti} duration={5000} startDelay={0} />
        <div className="min-h-screen bg-brand-cream flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
                <p className="text-brand-charcoal">Verifying your payment...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <ConfettiAnimation isActive={showConfetti} duration={5000} startDelay={0} />
      <ConfettiAnimation isActive={showVerificationConfetti} duration={5500} startDelay={0} />
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                {verificationComplete ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : (
                  <Gift className="h-12 w-12 text-brand-gold" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-brand-charcoal">
              {verificationComplete ? 'Payment Successful!' : 'Thank You!'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4 text-center">
            <p className="text-brand-charcoal/70">
              {verificationComplete 
                ? 'Your gift has been scheduled and your payment has been confirmed. We\'ll take care of everything from here!'
                : 'We\'re processing your order now.'
              }
            </p>
            
            <div className="bg-brand-gold/10 p-4 rounded-lg">
              <p className="text-sm text-brand-charcoal">
                🎁 We'll curate the perfect gift and handle delivery at just the right time
              </p>
            </div>

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
