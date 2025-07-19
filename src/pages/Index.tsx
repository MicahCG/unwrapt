
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '@/components/auth/LoginPage';
import OnboardingFlow from '@/components/OnboardingFlow';
import OnboardingIntro from '@/components/OnboardingIntro';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [showLoginPage, setShowLoginPage] = useState(false);

  useEffect(() => {
    // Check if this is a first visit (no user and hasn't seen intro)
    const hasSeenIntro = sessionStorage.getItem('introShown');
    if (hasSeenIntro) {
      setShowIntro(false);
      setIsFirstVisit(false);
      setShowLoginPage(true);
    }
  }, []);

  // Check if user has completed onboarding by looking for existing recipients
  const { data: hasCompletedOnboarding, isLoading: checkingOnboarding } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      console.log('🔧 Index: Checking onboarding status for user:', user.id);
      
      // For fake dev user, always return true to skip onboarding
      if (process.env.NODE_ENV === 'development' && user.id === '00000000-0000-0000-0000-000000000001') {
        console.log('🔧 Index: Fake dev user detected, skipping onboarding');
        return true;
      }
      
      // Check for recipients first (primary indicator of completed onboarding)
      const { data: recipients, error: recipientsError } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (recipientsError) {
        console.error('Error checking recipients:', recipientsError);
      }
      
      console.log('🔧 Index: Recipients found:', recipients?.length || 0);
      
      // If user has recipients, they've definitely completed onboarding
      if (recipients && recipients.length > 0) {
        console.log('🔧 Index: User has recipients, onboarding complete');
        return true;
      }
      
      // For new users with no recipients, they need onboarding
      console.log('🔧 Index: New user detected, needs onboarding');
      return false;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true
  });

  console.log('🔧 Index: Render state:', { 
    hasUser: !!user, 
    loading, 
    checkingOnboarding, 
    hasCompletedOnboarding,
    userId: user?.id 
  });

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleIntroComplete = () => {
    setShowIntro(false);
    sessionStorage.setItem('introShown', 'true');
    // Add a small delay before showing login page to create smooth transition
    setTimeout(() => {
      setShowLoginPage(true);
    }, 100);
  };

  if (!user) {
    console.log('🔧 Index: No user, showing login page');
    
    // Show intro for first-time visitors
    if (showIntro && isFirstVisit) {
      return <OnboardingIntro onComplete={handleIntroComplete} />;
    }
    
    return (
      <div className={`transition-opacity duration-500 ${showLoginPage || !isFirstVisit ? 'opacity-100' : 'opacity-0'}`}>
        <LoginPage />
      </div>
    );
  }

  // If user has completed onboarding, show Dashboard
  if (hasCompletedOnboarding) {
    console.log('🔧 Index: User completed onboarding, showing dashboard');
    return <Dashboard />;
  }

  // Otherwise, show onboarding flow
  console.log('🔧 Index: User needs onboarding, showing onboarding flow');
  return (
    <OnboardingFlow 
      onBack={() => {
        // This won't be called since we're starting from the authenticated state
        console.log('Back from onboarding');
      }} 
    />
  );
};

export default Index;
