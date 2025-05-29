
import React from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import LoginPage from '@/components/auth/LoginPage';
import OnboardingFlow from '@/components/OnboardingFlow';
import Dashboard from '@/components/Dashboard';

const Index = () => {
  const { user, loading } = useAuth();

  // Check if user has completed onboarding by looking for existing recipients or profiles
  const { data: hasCompletedOnboarding, isLoading: checkingOnboarding } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // For fake dev user, always return true to skip onboarding
      if (process.env.NODE_ENV === 'development' && user.id === '00000000-0000-0000-0000-000000000001') {
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
      
      // If user has recipients, they've definitely completed onboarding
      if (recipients && recipients.length > 0) {
        return true;
      }
      
      // Also check if user has a profile (could indicate returning user)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileError);
      }
      
      // If user has a profile, consider them as having completed onboarding
      // (they might be a returning user who had an account before onboarding was implemented)
      return !!profile;
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
