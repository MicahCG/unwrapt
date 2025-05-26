import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '@/components/auth/LoginPage';
import OnboardingFlow from '@/components/OnboardingFlow';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useAuth();

  // Check if user has completed onboarding by looking for existing recipients
  const { data: hasCompletedOnboarding, isLoading: checkingOnboarding } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data: recipients, error } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (error) {
        console.error('Error checking onboarding status:', error);
        return false;
      }
      
      // If user has recipients, they've completed onboarding
      return recipients && recipients.length > 0;
    },
    enabled: !!user?.id
  });

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // If user has completed onboarding, show Dashboard
  if (hasCompletedOnboarding) {
    return <Dashboard />;
  }

  // Otherwise, show onboarding flow
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
