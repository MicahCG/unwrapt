
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OnboardingFlow from '@/components/OnboardingFlow';

const Onboarding = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    console.log('🔧 Onboarding: Navigating back to dashboard');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      <OnboardingFlow onBack={handleBackToDashboard} />
    </div>
  );
};

export default Onboarding;
