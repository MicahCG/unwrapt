import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift, AlertCircle, ArrowRight, RefreshCw, Wallet, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { useAuth } from '@/components/auth/AuthProvider';

type PaymentType = 'subscription' | 'wallet' | 'gift' | 'unknown';

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
  const [paymentType, setPaymentType] = useState<PaymentType>('unknown');
  const [walletAmount, setWalletAmount] = useState<number>(0);

  // Determine payment type from URL
  useEffect(() => {
    const type = searchParams.get('type') as PaymentType;
    const amount = searchParams.get('amount');
    
    if (type === 'wallet' || type === 'subscription' || type === 'gift') {
      setPaymentType(type);
    } else {
      // Legacy fallback - assume subscription if no type specified
      setPaymentType('subscription');
    }
    
    if (amount) {
      setWalletAmount(parseFloat(amount));
    }
  }, [searchParams]);

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

  // Check wallet balance was updated
  const checkWalletDeposit = async () => {
    if (!user?.id) {
      setIsVerifying(false);
      return false;
    }

    try {
      // Check for recent completed wallet transaction
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('transaction_type', 'deposit')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      // If there's a recent completed deposit, consider it successful
      if (transactions && transactions.length > 0) {
        const latestDeposit = transactions[0];
        const depositTime = new Date(latestDeposit.created_at);
        const now = new Date();
        const minutesSinceDeposit = (now.getTime() - depositTime.getTime()) / (1000 * 60);
        
        // If deposit was within last 5 minutes, it's likely the one we just made
        if (minutesSinceDeposit < 5) {
          console.log('PaymentSuccess: Wallet deposit confirmed');
          setVerificationComplete(true);
          setShowConfetti(true);
          await invalidateQueries();
          toast({
            title: "Funds Added!",
            description: `$${walletAmount || latestDeposit.amount} has been added to your wallet.`,
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('PaymentSuccess: Error checking wallet deposit:', error);
      return false;
    }
  };

  // Check gift payment was processed
  const checkGiftPayment = async () => {
    if (!user?.id) {
      setIsVerifying(false);
      return false;
    }

    const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
    
    try {
      // Check for payment record with this session
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('stripe_session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // If payment exists, mark as complete (webhook may still be processing)
      if (payment) {
        console.log('PaymentSuccess: Gift payment record found');
        setVerificationComplete(true);
        setShowConfetti(true);
        await invalidateQueries();
        toast({
          title: "Payment Successful!",
          description: "Your gift order has been placed.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('PaymentSuccess: Error checking gift payment:', error);
      return false;
    }
  };

  // Poll status with exponential backoff
  const pollStatus = async (checkFn: () => Promise<boolean>, maxAttempts = 5) => {
    console.log(`PaymentSuccess: Starting status polling for ${paymentType}...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`PaymentSuccess: Poll attempt ${attempt}/${maxAttempts}`);

      const success = await checkFn();
      if (success) {
        return true;
      }

      if (attempt < maxAttempts) {
        const delayMs = attempt * 1000;
        console.log(`PaymentSuccess: Not verified yet, waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return false;
  };

  const invalidateQueries = async () => {
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['upcoming-gifts', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['unpaid-gifts', user.id] });
      
      if (isFromOnboarding) {
        await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user.id] });
        await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
      }
    }
  };

  useEffect(() => {
    const sessionId =
      searchParams.get('session_id') ||
      searchParams.get('checkout_session_id');

    console.log('PaymentSuccess: URL params:', {
      sessionId,
      paymentType,
      walletAmount,
      allParams: Object.fromEntries(searchParams.entries()),
    });

    // Check if this payment came from onboarding flow
    const onboardingFlag = localStorage.getItem('onboardingPaymentFlow');
    if (onboardingFlag === 'true') {
      setIsFromOnboarding(true);
      localStorage.removeItem('onboardingPaymentFlow');
    }

    const processVerification = async () => {
      // Wait for paymentType to be set
      if (paymentType === 'unknown') return;

      let checkFn: () => Promise<boolean>;
      
      switch (paymentType) {
        case 'subscription':
          checkFn = checkSubscriptionStatus;
          break;
        case 'wallet':
          checkFn = checkWalletDeposit;
          break;
        case 'gift':
          checkFn = checkGiftPayment;
          break;
        default:
          checkFn = checkSubscriptionStatus;
      }

      const success = await pollStatus(checkFn);

      if (!success) {
        setIsVerifying(false);
        // Still show success - webhook may just be delayed
        setVerificationComplete(true);
        setShowConfetti(true);
        toast({
          title: "Payment Processing",
          description: "Your payment was received and is being processed.",
          variant: "default"
        });
      } else {
        setIsVerifying(false);
      }
    };

    processVerification();
  }, [searchParams, user?.id, paymentType]);

  const handleGoToDashboard = () => {
    navigate('/', { replace: true });
  };

  const getContent = () => {
    switch (paymentType) {
      case 'wallet':
        return {
          icon: <Wallet className="h-10 w-10 text-emerald-600" />,
          title: 'Funds Added!',
          description: `$${walletAmount || ''} has been added to your gift wallet. You're all set to schedule gifts!`,
          benefits: [
            'Use wallet balance for automated gifts',
            'Funds never expire',
            'Set up auto-reload to stay topped up',
          ],
          buttonText: 'Go to Dashboard',
        };
      case 'gift':
        return {
          icon: <Gift className="h-10 w-10 text-emerald-600" />,
          title: 'Gift Order Placed!',
          description: 'Your gift order has been successfully placed. We\'ll send you tracking details once it ships.',
          benefits: [
            'Order confirmation sent to your email',
            'Track shipping in your dashboard',
            'Recipient will love it!',
          ],
          buttonText: 'View My Gifts',
        };
      case 'subscription':
      default:
        return {
          icon: <Crown className="h-10 w-10 text-emerald-600" />,
          title: 'Welcome to VIP!',
          description: 'Your VIP subscription is now active. Enjoy unlimited recipients, gift automation, and more!',
          benefits: [
            'Unlimited recipients',
            'Gift automation & scheduling',
            'Gift wallet with auto-reload',
          ],
          buttonText: 'Go to Dashboard',
        };
    }
  };

  const content = getContent();
  const hasSessionId = !!(searchParams.get('session_id') || searchParams.get('checkout_session_id'));

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
                  {content.icon}
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
                  ? content.title 
                  : 'Payment Issue'
              }
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center px-6 pb-8">
            {/* Description */}
            <p className="text-[#1A1A1A]/70 leading-relaxed">
              {isVerifying
                ? 'Please wait while we confirm your payment...'
                : verificationComplete
                  ? content.description
                  : 'We encountered an issue processing your payment. Please try again.'
              }
            </p>
            
            {/* Benefits - only show on success */}
            {verificationComplete && (
              <div className="bg-[#F5F3F0] rounded-lg p-4 space-y-2 text-left">
                <p className="text-sm font-medium text-[#1A1A1A] mb-3">
                  {paymentType === 'wallet' ? 'Your wallet:' : paymentType === 'gift' ? 'What\'s next:' : 'Your VIP benefits:'}
                </p>
                {content.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-[#1A1A1A]/80">
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Error details - only show when verification failed */}
            {!isVerifying && !verificationComplete && !hasSessionId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Your payment was successful in Stripe and is being processed.
                  If you don't see the update after refreshing, please contact support.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                size="lg" 
                className="w-full h-12 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white"
                onClick={handleGoToDashboard}
                disabled={isVerifying}
              >
                <Gift className="w-4 h-4 mr-2" />
                {verificationComplete ? content.buttonText : 'Back to Home'}
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
