import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '@/components/auth/LoginPage';
import OnboardingFlow from '@/components/OnboardingFlow';
import OnboardingIntro from '@/components/OnboardingIntro';
import Dashboard from '@/components/Dashboard';
import SubscribeGate from '@/components/subscription/SubscribeGate';
import { markSkipAgentWelcome } from '@/lib/funnel';
import { isPaidVip } from '@/lib/stripe';

const Index = () => {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [showLoginPage, setShowLoginPage] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Landing signup already chose "Get started"  -  skip stacked intro + welcome.
    const shouldShowIntro = localStorage.getItem('shouldShowOnboardingIntro');

    if (shouldShowIntro === 'true' && user && !loading) {
      localStorage.removeItem('shouldShowOnboardingIntro');
      markSkipAgentWelcome();
      localStorage.setItem('hasSeenIntro', 'true');
      setShowIntro(false);
      return;
    }

    // Unauthenticated first visit: short story, then login (not another Get started).
    if (!user && !loading) {
      const hasSeenIntro = localStorage.getItem('hasSeenIntro');
      if (!hasSeenIntro) {
        setShowIntro(true);
      } else {
        setShowLoginPage(true);
      }
    }
  }, [user, loading]);

  // Recipients = onboarding progress; VIP = paid access to the product.
  const { data: access, isLoading: checkingAccess } = useQuery({
    queryKey: ['app-access', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { hasRecipients: false, isPaid: false };
      }

      // Dev fake user keeps full access for local testing.
      if (process.env.NODE_ENV === 'development' && user.id === '00000000-0000-0000-0000-000000000001') {
        return { hasRecipients: true, isPaid: true };
      }

      const [{ data: recipients, error: recipientsError }, { data: profile, error: profileError }] =
        await Promise.all([
          supabase.from('recipients').select('id').eq('user_id', user.id).limit(1),
          supabase
            .from('profiles')
            .select('subscription_tier, subscription_status')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

      if (recipientsError) console.error('Error checking recipients:', recipientsError);
      if (profileError) console.error('Error checking profile:', profileError);

      return {
        hasRecipients: (recipients?.length || 0) > 0,
        isPaid: isPaidVip(profile),
      };
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF6EE' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#B65B3C' }} />
      </div>
    );
  }

  const handleIntroComplete = () => {
    localStorage.setItem('hasSeenIntro', 'true');
    markSkipAgentWelcome();
    setShowIntro(false);

    if (!user) {
      if (window.location.hostname === 'unwrapt.io') {
        window.location.href = 'https://app.unwrapt.io';
        return;
      }

      setTimeout(() => {
        setShowLoginPage(true);
      }, 100);
    }
  };

  if (user) {
    if (showIntro) {
      return <OnboardingIntro onComplete={handleIntroComplete} />;
    }

    // Paid members only  -  dashboard is gated.
    if (access?.isPaid) {
      return <Dashboard />;
    }

    // Finished setup but unpaid: hard paywall (no inbox bypass).
    if (access?.hasRecipients) {
      return <SubscribeGate />;
    }

    return (
      <OnboardingFlow
        onBack={async () => {
          await queryClient.invalidateQueries({ queryKey: ['app-access', user?.id] });
          await queryClient.refetchQueries({ queryKey: ['app-access', user?.id] });
        }}
      />
    );
  }

  if (showIntro) {
    return <OnboardingIntro onComplete={handleIntroComplete} />;
  }

  return (
    <div className={`transition-opacity duration-500 ${showLoginPage ? 'opacity-100' : 'opacity-0'}`}>
      <LoginPage />
    </div>
  );
};

export default Index;
