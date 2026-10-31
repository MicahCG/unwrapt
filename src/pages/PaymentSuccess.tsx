import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Gift, AlertCircle, ArrowRight, RefreshCw, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import ConfettiAnimation from '@/components/ConfettiAnimation';
import { useAuth } from '@/components/auth/AuthProvider';
import { MobileShell, Display, PrimaryButton } from '@/components/unwrapt2/MobileShell';
import { TheaCharacter } from '@/components/unwrapt2/TheaCharacter';
import { U } from '@/components/unwrapt2/theme';
import { peekPendingGiftResume } from '@/lib/postSubscribeResume';

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

  // Check gift payment was processed  -  also triggers verify-payment to fulfill the order
  const checkGiftPayment = async () => {
    if (!user?.id) {
      setIsVerifying(false);
      return false;
    }

    const sessionId = searchParams.get('session_id') || searchParams.get('checkout_session_id');
    
    if (!sessionId) {
      console.error('PaymentSuccess: No session ID for gift payment verification');
      return false;
    }

    try {
      // Call verify-payment to confirm payment with Stripe, update DB, and trigger fulfillment
      console.log('PaymentSuccess: Calling verify-payment for gift session:', sessionId);
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (verifyError) {
        console.error('PaymentSuccess: verify-payment error:', verifyError);
        // Fall back to checking payment record directly
      } else if (verifyData?.paymentStatus === 'paid') {
        console.log('PaymentSuccess: Gift payment verified and fulfillment triggered');
        setVerificationComplete(true);
        setShowConfetti(true);
        await invalidateQueries();
        toast({
          title: "Gift Order Placed!",
          description: "Your gift is being prepared and will ship soon.",
        });
        return true;
      }

      // Fallback: check if payment record was already updated (e.g. by webhook)
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('stripe_session_id', sessionId)
        .eq('status', 'paid')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (payment) {
        console.log('PaymentSuccess: Gift payment already marked paid');
        setVerificationComplete(true);
        setShowConfetti(true);
        await invalidateQueries();
        toast({
          title: "Gift Order Placed!",
          description: "Your gift is being prepared and will ship soon.",
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
        await queryClient.invalidateQueries({ queryKey: ['app-access', user.id] });
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

    // Design / QA preview: skip Stripe polling and show the success handoff.
    if (searchParams.get('preview') === '1' && (paymentType === 'subscription' || paymentType === 'unknown')) {
      setIsVerifying(false);
      setVerificationComplete(true);
      setShowConfetti(true);
      return;
    }

    const processVerification = async () => {
      // Wait for paymentType to be determined from URL params
      if (paymentType === 'unknown') {
        setIsVerifying(true);
        return;
      }

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

  const handleContinueWithThea = () => {
    // Skip obsolete welcome-back / monthly-chances overlays on this handoff.
    try {
      localStorage.setItem('opportunitiesShownDate', new Date().toDateString());
    } catch {
      /* ignore */
    }
    navigate('/?resume=gifts', { replace: true });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  const pendingResume = peekPendingGiftResume();
  const resumeFirst = pendingResume?.recipientName?.trim().split(/\s+/)[0];

  // On-brand VIP success — Thea celebrating, warm ivory/espresso, resume gift chat.
  if (paymentType === 'subscription' || paymentType === 'unknown') {
    return (
      <>
        <ConfettiAnimation isActive={showConfetti} duration={6000} startDelay={0} />
        <MobileShell glow contentClassName="px-6 pt-12 pb-6 flex flex-col items-center text-center">
          {isVerifying ? (
            <>
              <TheaCharacter size="large" pose="thinking" speaking={false} />
              <Display className="mt-6 text-[28px] leading-tight">Confirming your membership…</Display>
              <p className="mt-3 max-w-[300px] text-[15px] leading-6" style={{ color: U.textSecondary }}>
                One moment while we unlock Thea.
              </p>
              <RefreshCw className="mt-8 h-6 w-6 animate-spin" style={{ color: U.accent }} aria-hidden="true" />
            </>
          ) : (
            <>
              <div className="u-vip-celebrate">
                <TheaCharacter size="large" pose="gift" speaking reaction="clap" bubble="You’re in!" />
              </div>
              <p
                className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: U.accent }}
              >
                Payment successful
              </p>
              <Display className="mt-2 text-[32px] leading-tight">Welcome to VIP</Display>
              <p className="mt-3 max-w-[340px] text-[15px] leading-6" style={{ color: U.textSecondary }}>
                {resumeFirst
                  ? `Thea saved the gift ideas for ${resumeFirst}. Jump back in and keep planning together.`
                  : 'Thea is ready — continue chatting and she’ll pick up right where you left off.'}
              </p>

              <div
                className="mt-7 w-full max-w-[360px] rounded-[20px] px-4 py-3.5 text-left"
                style={{ background: U.surface, border: `1px solid ${U.border}` }}
              >
                <p className="text-[12px] font-semibold" style={{ color: U.ink }}>With VIP you get</p>
                <ul className="mt-2 space-y-1.5 text-[13px]" style={{ color: U.inkSoft }}>
                  {['Unlimited people in Thea’s care', 'Gift ideas timed to their occasions', 'You approve before anything is bought'].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: U.sage }} aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto w-full max-w-[360px] pt-8">
                <PrimaryButton onClick={handleContinueWithThea} disabled={isVerifying}>
                  Continue chatting with Thea
                </PrimaryButton>
              </div>
            </>
          )}
          <style>{`
            .u-vip-celebrate .u-thea-character__glow {
              animation: u-vip-glow 2.4s ease-in-out infinite;
            }
            .u-vip-celebrate .u-thea-character__figure {
              animation: u-vip-bob 2.8s ease-in-out infinite;
            }
            @keyframes u-vip-glow {
              0%, 100% { opacity: 0.55; transform: scale(1); }
              50% { opacity: 0.95; transform: scale(1.08); }
            }
            @keyframes u-vip-bob {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-6px); }
            }
            @media (prefers-reduced-motion: reduce) {
              .u-vip-celebrate .u-thea-character__glow,
              .u-vip-celebrate .u-thea-character__figure { animation: none; }
            }
          `}</style>
        </MobileShell>
      </>
    );
  }

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
          buttonText: 'Back to Thea',
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
      default:
        return {
          icon: <Gift className="h-10 w-10 text-emerald-600" />,
          title: 'Payment received',
          description: 'You’re all set.',
          benefits: [],
          buttonText: 'Continue chatting with Thea',
        };
    }
  };

  const content = getContent();
  const hasSessionId = !!(searchParams.get('session_id') || searchParams.get('checkout_session_id'));

  return (
    <>
      <ConfettiAnimation isActive={showConfetti} duration={6000} startDelay={0} />
      
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: U.bg }}>
        <Card className="w-full max-w-md border shadow-lg" style={{ background: U.surface, borderColor: U.border }}>
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex justify-center mb-6">
              {isVerifying ? (
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: U.chip }}>
                  <RefreshCw className="h-10 w-10 animate-spin" style={{ color: U.accent }} />
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
            
            <CardTitle className="text-2xl font-display" style={{ color: U.ink }}>
              {isVerifying 
                ? 'Verifying Payment...' 
                : verificationComplete 
                  ? content.title 
                  : 'Payment Issue'
              }
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center px-6 pb-8">
            <p className="leading-relaxed" style={{ color: 'rgba(42,37,32,0.7)' }}>
              {isVerifying
                ? 'Please wait while we confirm your payment...'
                : verificationComplete
                  ? content.description
                  : 'We encountered an issue processing your payment. Please try again.'
              }
            </p>
            
            {verificationComplete && content.benefits.length > 0 && (
              <div className="rounded-lg p-4 space-y-2 text-left" style={{ background: U.chip }}>
                <p className="text-sm font-medium mb-3" style={{ color: U.ink }}>
                  {paymentType === 'wallet' ? 'Your wallet:' : 'What\'s next:'}
                </p>
                {content.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(42,37,32,0.8)' }}>
                    <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}

            {!isVerifying && !verificationComplete && !hasSessionId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Your payment was successful in Stripe and is being processed.
                  If you don't see the update after refreshing, please contact support.
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button 
                size="lg" 
                className="w-full h-12"
                style={{ background: U.ink, color: U.buttonText }}
                onClick={paymentType === 'gift' ? handleGoHome : handleContinueWithThea}
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
