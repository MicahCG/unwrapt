import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '@/components/auth/LoginPage';
import OnboardingFlow from '@/components/OnboardingFlow';
import Dashboard from '@/components/Dashboard';
import SubscribeGate from '@/components/subscription/SubscribeGate';
import { markSkipAgentWelcome } from '@/lib/funnel';
import { isPaidVip } from '@/lib/stripe';
import { loadOnboardingProgress, shouldResumeOnboarding } from '@/lib/onboardingProgress';

const Index = () => {
  const { user, loading } = useAuth();
  const [showLoginPage, setShowLoginPage] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Landing signup already chose Get Started - skip agent welcome on app.
    const shouldShowIntro = localStorage.getItem('shouldShowOnboardingIntro');

    if (shouldShowIntro === 'true' && user && !loading) {
      localStorage.removeItem('shouldShowOnboardingIntro');
      markSkipAgentWelcome();
      localStorage.setItem('hasSeenIntro', 'true');
      return;
    }

    // Unauthenticated visitors go straight to login on the app.
    if (!user && !loading) {
      setShowLoginPage(true);
    }
  }, [user, loading]);

  // Recipients + onboarding_step = progress; VIP = paid access to the product.
  const { data: access, isLoading: checkingAccess } = useQuery({
    queryKey: ['app-access', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { hasRecipients: false, isPaid: false, resumeOnboarding: false };
      }

      // Dev fake user keeps full access for local testing.
      if (process.env.NODE_ENV === 'development' && user.id === '00000000-0000-0000-0000-000000000001') {
        return { hasRecipients: true, isPaid: true, resumeOnboarding: false };
      }

      const [{ data: profile, error: profileError }, progress] = await Promise.all([
        supabase
          .from('profiles')
          .select('subscription_tier, subscription_status')
          .eq('id', user.id)
          .maybeSingle(),
        loadOnboardingProgress(user.id),
      ]);

      if (profileError) console.error('Error checking profile:', profileError);

      const hasRecipients = progress.recipients.length > 0;

      return {
        hasRecipients,
        isPaid: isPaidVip(profile),
        // Mid-flow drafts (intel/reveal) resume setup; subscription/done → paywall.
        resumeOnboarding: hasRecipients && shouldResumeOnboarding(progress.step),
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

  if (user) {
    // Paid members only - dashboard is gated.
    if (access?.isPaid) {
      return <Dashboard />;
    }

    // Finished gift-proof / checkout path but unpaid: hard paywall (no inbox bypass).
    if (access?.hasRecipients && !access.resumeOnboarding) {
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

  return (
    <div className={`transition-opacity duration-500 ${showLoginPage ? 'opacity-100' : 'opacity-0'}`}>
      <LoginPage />
    </div>
  );
};

export default Index;
