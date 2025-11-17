
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useAuth } from '@/components/auth/AuthProvider';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Check authentication - redirect to login if not authenticated
  useEffect(() => {
    console.log('🔧 Onboarding: Auth check - loading:', loading, 'user:', user?.id);
    
    if (!loading && !user) {
      console.log('🔧 Onboarding: No user found, redirecting to login');
      window.location.href = 'https://app.unwrapt.io';
    }
  }, [user, loading]);

  const handleBackToDashboard = () => {
    console.log('🔧 Onboarding: Navigating back to dashboard');
    window.location.href = 'https://app.unwrapt.io';
  };

  // Show loading state while checking auth
  if (loading) {
    console.log('🔧 Onboarding: Showing loading state');
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render onboarding if no user
  if (!user) {
    console.log('🔧 Onboarding: No user, showing nothing');
    return null;
  }

  console.log('🔧 Onboarding: Rendering onboarding flow for user:', user.id);

  return (
    <div className="min-h-screen bg-brand-cream">
      <OnboardingFlow onBack={handleBackToDashboard} />
    </div>
  );
};

export default Onboarding;
