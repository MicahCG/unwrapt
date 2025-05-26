
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Calendar } from 'lucide-react';
import WelcomeStep from '@/components/onboarding/WelcomeStep';
import CalendarStep from '@/components/onboarding/CalendarStep';
import RecipientStep from '@/components/onboarding/RecipientStep';

interface OnboardingFlowProps {
  onBack: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({});

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
            <h3 className="text-2xl font-bold mb-4">Step {currentStep} - Coming Soon!</h3>
            <p className="text-muted-foreground mb-6">
              This step is still being built. Check back soon!
            </p>
            <Button onClick={handleBack}>Go Back</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div className="flex items-center">
                <Gift className="h-6 w-6 text-primary mr-2" />
                <span className="font-bold text-lg">Unwrapt</span>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </span>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
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
