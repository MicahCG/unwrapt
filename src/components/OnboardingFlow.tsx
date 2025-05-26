
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import CalendarStep from '@/components/onboarding/CalendarStep';
import RecipientStep from '@/components/onboarding/RecipientStep';

interface OnboardingFlowProps {
  onBack: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({});
  const { user } = useAuth();

  const totalSteps = 7;

  const handleStepComplete = (stepData: any) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleStepComplete} />;
      case 2:
        return <CalendarStep onNext={handleStepComplete} />;
      case 3:
        return <RecipientStep onNext={handleStepComplete} />;
      default:
        return (
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold mb-4 text-brand-charcoal">Step {currentStep} - Coming Soon!</h3>
            <p className="text-brand-charcoal/70 mb-6">
              This step is still being built. Check back soon!
            </p>
            <Button onClick={handleBack} className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90">Go Back</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream">
      {/* Header */}
      <div className="border-b border-brand-cream bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {currentStep > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBack}
                  className="mr-4 text-brand-charcoal hover:bg-brand-cream-light"
                >
                  ← Back
                </Button>
              )}
              <div className="flex items-center">
                <Logo variant="icon" size="md" className="mr-2" />
                <span className="font-bold text-lg text-brand-charcoal">Unwrapt</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Progress Indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-brand-charcoal/70">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="w-32 bg-brand-cream-light rounded-full h-2">
                  <div 
                    className="bg-brand-charcoal h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* User Menu */}
              {user && <UserMenu />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
