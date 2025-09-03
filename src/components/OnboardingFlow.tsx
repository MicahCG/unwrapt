
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import CalendarStep from '@/components/onboarding/CalendarStep';
import RecipientStep from '@/components/onboarding/RecipientStep';
import InterestsStep from '@/components/onboarding/InterestsStep';
import GiftScheduleStep from '@/components/onboarding/GiftScheduleStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface OnboardingFlowProps {
  onBack: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [isCompleting, setIsCompleting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dynamic total steps based on flow path
  const getTotalSteps = () => {
    // For manual recipient entry with data: Calendar -> Gift Schedule (2 steps)
    if (onboardingData.manualRecipientData) {
      return 2;
    }
    // For manual recipient entry without data: Calendar -> Recipient -> Gift Schedule (3 steps)
    if (onboardingData.manualRecipientAdded || onboardingData.noRecipientsFound) {
      return 3;
    }
    // For calendar-based flow: Calendar -> Interests -> Gift Schedule (3 steps)
    return 3;
  };

  console.log('🔧 OnboardingFlow: Rendering step', currentStep, 'for user:', user?.id);

  const createRecipientsFromCalendarData = async (importedDates: any[]) => {
    if (!importedDates || importedDates.length === 0) return [];

    console.log('📅 OnboardingFlow: Creating recipients from calendar data:', importedDates.length, 'events');

    // Group events by person name first (like the sync button does)
    const peopleMap = new Map<string, any>();
    
    importedDates.forEach((event: any) => {
      if (event.personName) {
        const personKey = event.personName.toLowerCase().trim();
        
        if (!peopleMap.has(personKey)) {
          peopleMap.set(personKey, {
            name: event.personName,
            birthday: event.type === 'birthday' ? event.date : null,
            anniversary: event.type === 'anniversary' ? event.date : null,
            events: [event]
          });
        } else {
          const person = peopleMap.get(personKey)!;
          if (event.type === 'birthday' && !person.birthday) {
            person.birthday = event.date;
          }
          if (event.type === 'anniversary' && !person.anniversary) {
            person.anniversary = event.date;
          }
          person.events.push(event);
        }
      }
    });

    const calendarPeople = Array.from(peopleMap.values());
    console.log('👥 OnboardingFlow: Found unique people in calendar:', calendarPeople.length);

    // Get existing recipients to avoid duplicates
    const { data: existingRecipients } = await supabase
      .from('recipients')
      .select('name, birthday, anniversary')
      .eq('user_id', user?.id);

    // Filter out people who are already recipients
    const newPeople = calendarPeople.filter(person => {
      const isDuplicate = existingRecipients?.some(existing => {
        const nameMatch = existing.name.toLowerCase().trim() === person.name.toLowerCase().trim();
        const birthdayMatch = existing.birthday === person.birthday;
        const anniversaryMatch = existing.anniversary === person.anniversary;
        
        // Consider it a duplicate if name matches and at least one date matches
        return nameMatch && (birthdayMatch || anniversaryMatch);
      });
      
      return !isDuplicate;
    });

    if (newPeople.length === 0) {
      console.log('📅 OnboardingFlow: All people already exist as recipients');
      return [];
    }

    const recipients = [];

    for (const person of newPeople) {
      try {
        const recipientData = {
          user_id: user?.id,
          name: person.name,
          email: null,
          phone: null,
          address: null,
          interests: onboardingData.interests || [],
          birthday: person.birthday,
          anniversary: person.anniversary,
          relationship: null, // User can add this later
          notes: `Imported from Google Calendar during onboarding`
        };

        const { data: newRecipient, error: recipientError } = await supabase
          .from('recipients')
          .insert(recipientData)
          .select()
          .single();

        if (recipientError) {
          console.error('Error creating recipient for', person.name, ':', recipientError);
          continue;
        }

        recipients.push(newRecipient);
        console.log('✅ Created recipient:', newRecipient.name, 'with birthday:', newRecipient.birthday, 'anniversary:', newRecipient.anniversary);
      } catch (error) {
        console.error('Error processing person', person.name, ':', error);
      }
    }

    console.log('📅 OnboardingFlow: Successfully created', recipients.length, 'recipients from calendar');
    return recipients;
  };

  const handleStepComplete = async (stepData: any) => {
    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);

    console.log('🔧 OnboardingFlow: Step completed:', currentStep, 'data:', stepData);

    const totalSteps = getTotalSteps();

    if (currentStep === totalSteps) {
      // Complete onboarding and save data
      setIsCompleting(true);
      try {
        console.log('Completing onboarding with data:', updatedData);

        // Create recipients from ALL calendar data (not just selected one)
        let allRecipients = [];
        if (updatedData.importedDates && updatedData.importedDates.length > 0) {
          allRecipients = await createRecipientsFromCalendarData(updatedData.importedDates);
        }

        // Create recipient from manual entry or selection
        let selectedRecipient = null;
        if (updatedData.manualRecipientData) {
          // Manual recipient data passed directly from CalendarStep
          const { data: newRecipient, error: recipientError } = await supabase
            .from('recipients')
            .insert({
              user_id: user?.id,
              name: updatedData.manualRecipientData.fullName,
              email: null,
              phone: null,
              address: null,
              interests: [],
              birthday: updatedData.manualRecipientData.birthday || null,
              anniversary: updatedData.manualRecipientData.anniversary || null,
              relationship: updatedData.manualRecipientData.relationship,
            })
            .select()
            .single();

          if (recipientError) {
            console.error('Error saving manual recipient:', recipientError);
          } else {
            selectedRecipient = newRecipient;
            allRecipients.push(newRecipient);
          }
        } else if (updatedData.firstRecipient) {
          // Manual recipient entry via RecipientStep
          const { data: newRecipient, error: recipientError } = await supabase
            .from('recipients')
            .insert({
              user_id: user?.id,
              name: updatedData.firstRecipient.fullName,
              email: updatedData.firstRecipient.email,
              phone: updatedData.firstRecipient.phone,
              address: JSON.stringify(updatedData.firstRecipient.address),
              interests: updatedData.interests || [],
              birthday: updatedData.firstRecipient.birthday || null,
              anniversary: updatedData.firstRecipient.anniversary || null,
              relationship: updatedData.firstRecipient.relationship,
            })
            .select()
            .single();

          if (recipientError) {
            console.error('Error saving manual recipient:', recipientError);
          } else {
            selectedRecipient = newRecipient;
            allRecipients.push(newRecipient);
          }
        } else if (updatedData.selectedPersonForGift && !allRecipients.find(r => r.name === updatedData.selectedPersonForGift.personName)) {
          // Calendar-based recipient selection
          const { data: newRecipient, error: recipientError } = await supabase
            .from('recipients')
            .insert({
              user_id: user?.id,
              name: updatedData.selectedPersonForGift.personName,
              email: null,
              phone: null,
              address: null,
              interests: updatedData.interests || [],
              birthday: updatedData.selectedPersonForGift.type === 'birthday' ? updatedData.selectedPersonForGift.date : null,
              anniversary: updatedData.selectedPersonForGift.type === 'anniversary' ? updatedData.selectedPersonForGift.date : null,
            })
            .select()
            .single();

          if (recipientError) {
            console.error('Error saving selected recipient:', recipientError);
          } else {
            selectedRecipient = newRecipient;
            allRecipients.push(newRecipient);
          }
        } else if (updatedData.selectedPersonForGift) {
          selectedRecipient = allRecipients.find(r => r.name === updatedData.selectedPersonForGift.personName);
        }

        // Save scheduled gift if we have gift data and a recipient
        if (updatedData.firstGift && selectedRecipient) {
          const { error: giftError } = await supabase
            .from('scheduled_gifts')
            .insert({
              user_id: user?.id,
              recipient_id: selectedRecipient.id,
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

        // Invalidate queries to refresh dashboard
        await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['recipients', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['user-metrics', user?.id] });

        const recipientCount = allRecipients.length;
        const selectedName = updatedData.selectedPersonForGift?.personName || 
                           updatedData.manualRecipientData?.fullName || 
                           updatedData.firstRecipient?.fullName;

        toast({
          title: "Welcome to Unwrapt!",
          description: recipientCount > 0 
            ? `${recipientCount} recipients added to your dashboard! ${selectedName ? `Your gift for ${selectedName} has been scheduled.` : ''}`
            : selectedName 
            ? `Your gift for ${selectedName} has been scheduled!`
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

  const handleSkip = () => {
    console.log('🔧 OnboardingFlow: Skipping step:', currentStep);
    // Skip to next step or complete onboarding
    const totalSteps = getTotalSteps();
    if (currentStep === totalSteps) {
      handleStepComplete({});
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
  };

  const renderStep = () => {
    console.log('🔧 OnboardingFlow: Rendering step component for step:', currentStep);
    
    // Check if we have manual recipient data (skip recipient entry)
    const hasManualRecipientData = onboardingData.manualRecipientData;
    
    // Check if we need manual recipient entry flow
    const isManualRecipientFlow = onboardingData.manualRecipientAdded || onboardingData.noRecipientsFound;
    
    if (hasManualRecipientData) {
      // Shortened flow: Calendar -> Gift Schedule (2 steps)
      switch (currentStep) {
        case 1:
          return <CalendarStep onNext={handleStepComplete} onSkip={handleSkip} />;
        case 2:
          return (
            <GiftScheduleStep 
              onNext={handleStepComplete} 
              recipientName={onboardingData.manualRecipientData.fullName}
              interests={[]} // No interests for manual flow
              selectedPersonForGift={{ personName: onboardingData.manualRecipientData.fullName }}
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
    } else if (isManualRecipientFlow) {
      // Regular manual flow: Calendar -> Recipient -> Gift Schedule (3 steps)
      switch (currentStep) {
        case 1:
          return <CalendarStep onNext={handleStepComplete} onSkip={handleSkip} />;
        case 2:
          return (
            <RecipientStep 
              onNext={handleStepComplete} 
              isManualEntry={true}
            />
          );
        case 3:
          return (
            <GiftScheduleStep 
              onNext={handleStepComplete} 
              recipientName={onboardingData.firstRecipient?.fullName}
              interests={[]} // No interests for manual flow - skip interests step
              selectedPersonForGift={onboardingData.firstRecipient ? { personName: onboardingData.firstRecipient?.fullName } : null}
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
    } else {
      // Regular calendar-based flow: Calendar -> Interests -> Gift Schedule (3 steps)
      switch (currentStep) {
        case 1:
          return <CalendarStep onNext={handleStepComplete} onSkip={handleSkip} />;
        case 2:
          return (
            <InterestsStep 
              onNext={handleStepComplete} 
              selectedPersonForGift={onboardingData.selectedPersonForGift}
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
    }
  };

  const getStepTitle = () => {
    return "";
  };

  const totalSteps = getTotalSteps();

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
                <Logo size="md" />
              </div>
            </div>
            
            <div className="flex items-center">
              {/* User Menu - but hide settings in onboarding */}
              {user && <UserMenu hideSettings={true} />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator - moved to body */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-brand-charcoal/70">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="w-32 bg-brand-cream-light rounded-full h-2">
                  <div 
                    className="bg-brand-charcoal h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
