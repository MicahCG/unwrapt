import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import CalendarStep from '@/components/onboarding/CalendarStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import GiftScheduleStep from '@/components/onboarding/GiftScheduleStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface OnboardingFlowProps {
  onBack: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1); // Start at step 1 (CalendarStep)
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const totalSteps = 3; // Reduced from 4 to 3 (removed WelcomeStep)

  console.log('🔧 OnboardingFlow: Rendering step', currentStep, 'for user:', user?.id);

  const handleStepComplete = async (stepData: any) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    console.log('🔧 OnboardingFlow: Step completed:', currentStep, 'data:', stepData);

    if (currentStep === totalSteps) {
      // Complete onboarding and save data
      setIsCompleting(true);
      try {
        console.log('Completing onboarding with data:', updatedData);

        // Create recipient from calendar person if we have one
        let recipientData = null;
        if (updatedData.selectedPersonForGift) {
          const { data: newRecipient, error: recipientError } = await supabase
            .from('recipients')
            .insert({
              user_id: user?.id,
              name: updatedData.selectedPersonForGift.personName,
              email: null, // Will be added later when user manages recipients
              phone: null,
              address: null, // Will be added later
              interests: updatedData.interests || [],
              // Store calendar info for future reference
              birthday: updatedData.selectedPersonForGift.type === 'birthday' ? updatedData.selectedPersonForGift.date : null,
              anniversary: updatedData.selectedPersonForGift.type === 'anniversary' ? updatedData.selectedPersonForGift.date : null,
            })
            .select()
            .single();

          if (recipientError) {
            console.error('Error saving recipient:', recipientError);
            throw new Error('Failed to save recipient');
          }

          recipientData = newRecipient;
          console.log('Recipient created from calendar data:', recipientData);
        }

        // Save scheduled gift if we have gift data and a recipient
        if (updatedData.firstGift && recipientData) {
          const { error: giftError } = await supabase
            .from('scheduled_gifts')
            .insert({
              user_id: user?.id,
              recipient_id: recipientData.id,
              occasion: updatedData.firstGift.occasion,
              occasion_date: updatedData.firstGift.occasionDate,
              gift_type: updatedData.firstGift.giftType,
              price_range: updatedData.firstGift.priceRange,
              status: 'scheduled'
            });

          if (giftError) {
            console.error('Error saving scheduled gift:', giftError);
            throw new Error('Failed to save scheduled gift');
          }

          console.log('Scheduled gift saved successfully');
        }

        // Calculate and save initial metrics
        if (user?.id) {
          console.log('Calculating user metrics...');
          await supabase.rpc('calculate_user_metrics', { user_uuid: user.id });
        }

        // Invalidate the onboarding status query to trigger a refresh
        await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });

        toast({
          title: "Welcome to Unwrapt!",
          description: updatedData.selectedPersonForGift?.personName 
            ? `Your gift for ${updatedData.selectedPersonForGift.personName} has been scheduled! Let's start making gift-giving effortless!`
            : "Your onboarding is complete. Let's start making gift-giving effortless!",
        });

        console.log('Onboarding completed successfully');

        // Small delay to ensure toast is visible, then redirect will happen automatically
        setTimeout(() => {
          setIsCompleting(false);
        }, 1000);

      } catch (error) {
        console.error('Error completing onboarding:', error);
        toast({
          title: "Error",
          description: "There was a problem completing your setup. Please try again.",
          variant: "destructive"
        });
        setIsCompleting(false);
      }
    } else {
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

  if (isCompleting) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
          <p className="text-brand-charcoal">Completing your setup...</p>
          <p className="text-brand-charcoal/70 text-sm mt-2">You'll be redirected to your dashboard shortly</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    console.log('🔧 OnboardingFlow: Rendering step component for step:', currentStep);
    
    switch (currentStep) {
      case 1:
        return <CalendarStep onNext={handleStepComplete} />;
      case 2:
        return (
          <InterestsStep 
            onNext={handleStepComplete} 
            importedDates={onboardingData.importedDates || []}
          />
        );
      case 3:
        return (
          <GiftScheduleStep 
            onNext={handleStepComplete} 
            recipientName={onboardingData.selectedPersonForGift?.personName}
            interests={onboardingData.interests}
            selectedPersonForGift={onboardingData.selectedPersonForGift}
          />
        );
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

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Connect Your Calendar";
      case 2:
        return "Select Interests";
      case 3:
        return "Schedule Gift";
      default:
        return `Step ${currentStep}`;
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
                  disabled={isCompleting}
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
                  {getStepTitle()} ({currentStep} of {totalSteps})
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