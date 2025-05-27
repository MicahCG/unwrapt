
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OnboardingFlow from '@/components/OnboardingFlow';

const Onboarding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-cream">
      <OnboardingFlow onBack={() => navigate('/')} />
    </div>
  );
};

export default Onboarding;
