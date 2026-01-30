
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import CalendarStep from '@/components/onboarding/CalendarStep';
import VIPUpsellStep from '@/components/onboarding/VIPUpsellStep';
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
  const [isVipUser, setIsVipUser] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is already VIP
  useEffect(() => {
    const checkVipStatus = async () => {
      if (!user?.id) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      
      if (profile?.subscription_tier === 'vip') {
        console.log('🔧 OnboardingFlow: User is already VIP, will skip upsell');
        setIsVipUser(true);
      }
    };
    
    checkVipStatus();
  }, [user?.id]);

  // Dynamic total steps based on flow path
  const getTotalSteps = () => {
    // For manual recipient entry with data: Calendar -> Gift Schedule (2 steps)
    if (onboardingData.manualRecipientData) {
      console.log('🔧 OnboardingFlow: Using 2-step flow (manual recipient with data)');
      return 2;
    }
    // For no recipients found: Calendar -> Gift Schedule with manual name entry (2 steps)
    if (onboardingData.noRecipientsFound) {
      console.log('🔧 OnboardingFlow: Using 2-step flow (no recipients found)');
      return 2;
    }
    // For no calendar events flow: Calendar -> Recipient -> VIP Upsell (3 steps)
    if (onboardingData.noCalendarEvents && onboardingData.startManualEntry) {
      console.log('🔧 OnboardingFlow: Using 3-step flow (no calendar events, manual entry)');
      return 3;
    }
    // For manual recipient entry without data: Calendar -> Recipient -> Gift Schedule (3 steps)
    if (onboardingData.manualRecipientAdded) {
      console.log('🔧 OnboardingFlow: Using 3-step flow (manual recipient added)');
      return 3;
    }
    // For calendar-based flow: Calendar -> Interests -> Gift Schedule (3 steps)
    console.log('🔧 OnboardingFlow: Using 3-step flow (calendar-based)');
    return 3;
  };

  console.log('🔧 OnboardingFlow: Rendering step', currentStep, 'of', getTotalSteps(), 'for user:', user?.id);
  console.log('🔧 OnboardingFlow: Current onboarding data:', onboardingData);

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

  const completeOnboarding = async () => {
    setIsCompleting(true);
    try {
      console.log('Completing onboarding with data:', onboardingData);

      // Create recipients from ALL calendar data
      let allRecipients = [];
      if (onboardingData.importedDates && onboardingData.importedDates.length > 0) {
        allRecipients = await createRecipientsFromCalendarData(onboardingData.importedDates);
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

      toast({
        title: "Welcome to Unwrapt!",
        description: recipientCount > 0 
          ? `${recipientCount} recipients added to your dashboard!`
          : "Your onboarding is complete. Let's start making gift-giving effortless!",
      });

      console.log('Onboarding completed successfully');

      // Small delay to ensure toast is visible, then navigate to dashboard
      setTimeout(() => {
        setIsCompleting(false);
        onBack(); // This will trigger parent to show dashboard
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
  };

  const handleStepComplete = async (stepData: any) => {
    console.log('🔧 OnboardingFlow: Step', currentStep, 'completed with data:', stepData);

    const updatedData = { ...onboardingData, ...stepData };
    setOnboardingData(updatedData);
    console.log('🔧 OnboardingFlow: Updated onboarding data:', updatedData);

    console.log('🔧 OnboardingFlow: Step completed:', currentStep, 'data:', stepData);

    const totalSteps = getTotalSteps();
    console.log('🔧 OnboardingFlow: Current step:', currentStep, 'Total steps:', totalSteps);

    // If step 1 (calendar) is complete and we have dates, move to gift showcase (step 2)
    if (currentStep === 1 && updatedData.importedDates && updatedData.importedDates.length > 0) {
      console.log('🔧 OnboardingFlow: Calendar complete with dates, moving to gift showcase');
      setCurrentStep(2);
      return;
    }

    if (currentStep === totalSteps) {
      // Handle old flows that don't use gift showcase
      setIsCompleting(true);
      try {
        // Create recipients from manual entry or selection
        let allRecipients: any[] = [];
        let selectedRecipient = null;
        
        if (updatedData.manualRecipientName) {
          // Manual recipient name from no recipients flow
          const { data: newRecipient, error: recipientError } = await supabase
            .from('recipients')
            .insert({
              user_id: user?.id,
              name: updatedData.manualRecipientName,
              email: null,
              phone: null,
              address: null,
              interests: [],
              birthday: null,
              anniversary: null,
              relationship: null,
            })
            .select()
            .single();

          if (recipientError) {
            console.error('Error saving manual recipient:', recipientError);
          } else {
            selectedRecipient = newRecipient;
            allRecipients.push(newRecipient);
          }
        } else if (updatedData.manualRecipientData) {
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
              email: null,
              phone: null,
              street: updatedData.firstRecipient.street || null,
              city: updatedData.firstRecipient.city || null,
              state: updatedData.firstRecipient.state || null,
              zip_code: updatedData.firstRecipient.zipCode || null,
              country: updatedData.firstRecipient.country || 'United States',
              interests: [],
              birthday: updatedData.firstRecipient.birthday || null,
              anniversary: null,
              relationship: updatedData.firstRecipient.relationship,
              preferred_gift_vibe: updatedData.firstRecipient.preferredGiftVibe || null,
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

        // Small delay to ensure toast is visible, then navigate to dashboard
        setTimeout(() => {
          setIsCompleting(false);
          onBack(); // This will trigger parent to show dashboard
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
      // Check if we're in the noCalendarEvents flow (step 2 = RecipientStep, step 3 = VIPUpsell)
      const isNoCalendarEventsFlow = updatedData.noCalendarEvents && updatedData.startManualEntry;

      if (currentStep === 2 && isNoCalendarEventsFlow) {
        // NoCalendarEvents flow: RecipientStep done, move to VIPUpsellStep
        console.log('🔧 OnboardingFlow: RecipientStep complete in noCalendarEvents flow, moving to VIPUpsell');
        setCurrentStep(3);
      } else if (currentStep === 2 && updatedData.importedDates && updatedData.importedDates.length > 0) {
        // Calendar flow: VIPUpsell done (step 2), complete onboarding
        console.log('🔧 OnboardingFlow: VIPUpsell complete in calendar flow, completing onboarding');
        await completeOnboarding();
      } else {
        console.log('🔧 OnboardingFlow: Not final step, moving from step', currentStep, 'to step', currentStep + 1);
        setCurrentStep(currentStep + 1);
      }
    }
  };

const handleSkip = async () => {
    console.log('🔧 OnboardingFlow: Skip clicked at step:', currentStep);
    
    // If at calendar step (step 1), skip to manual recipient entry
    if (currentStep === 1) {
      console.log('🔧 OnboardingFlow: Skipping calendar, moving to manual recipient entry');
      setOnboardingData((prev: any) => ({ 
        ...prev, 
        noCalendarEvents: true, 
        startManualEntry: true 
      }));
      setCurrentStep(2);
      return;
    }
    
    // For other steps, complete onboarding
    console.log('🔧 OnboardingFlow: Completing onboarding from skip');
    await completeOnboarding();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      console.log('🔧 OnboardingFlow: Going back from step', currentStep, 'to step', currentStep - 1);
      setCurrentStep(currentStep - 1);
    } else {
      console.log('🔧 OnboardingFlow: At first step, calling onBack()');
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
    
    // Step 1: Calendar
    if (currentStep === 1) {
      return <CalendarStep onNext={handleStepComplete} onSkip={handleSkip} />;
    }

// Step 2: VIP Upsell (if we have imported dates from calendar AND user is not already VIP)
    if (currentStep === 2 && onboardingData.importedDates && onboardingData.importedDates.length > 0) {
      // If user is already VIP, skip upsell and complete onboarding
      if (isVipUser) {
        console.log('🔧 OnboardingFlow: User is VIP, skipping upsell step');
        // Auto-complete for VIP users
        completeOnboarding();
        return (
          <div className="min-h-screen bg-brand-cream flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
              <p className="text-brand-charcoal">Completing your setup...</p>
            </div>
          </div>
        );
      }
      
      return (
        <VIPUpsellStep 
          importedDates={onboardingData.importedDates}
          onUpgrade={() => {
            // Stripe will redirect, so we just log here
            console.log('User clicked upgrade');
          }}
          onSkip={async () => {
            // Complete onboarding and go to dashboard as free user
            await completeOnboarding();
          }}
        />
      );
    }

    // Check for no calendar events flow (Calendar -> Recipient -> VIP Upsell)
    const isNoCalendarEventsFlow = onboardingData.noCalendarEvents && onboardingData.startManualEntry;

    // Check if we have manual recipient data (skip recipient entry)
    const hasManualRecipientData = onboardingData.manualRecipientData;

    // Check if we need manual recipient entry flow (3 steps)
    const isManualRecipientFlow = onboardingData.manualRecipientAdded;

    // Check if no recipients found (2 steps: Calendar -> Gift Schedule with manual name)
    const isNoRecipientsFlow = onboardingData.noRecipientsFound;

    // No calendar events flow: Calendar -> Recipient -> VIP Upsell (3 steps)
    if (isNoCalendarEventsFlow) {
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
          // If user is already VIP, skip upsell and save recipient then complete
          if (isVipUser) {
            console.log('🔧 OnboardingFlow: User is VIP, skipping upsell step');
            // Trigger final step completion which saves the recipient
            handleStepComplete({});
            return (
              <div className="min-h-screen bg-brand-cream flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
                  <p className="text-brand-charcoal">Completing your setup...</p>
                </div>
              </div>
            );
          }

          // Get the recipient name for VIP upsell
          const manualRecipientName = onboardingData.firstRecipient?.fullName || 'your loved one';

          return (
            <VIPUpsellStep
              importedDates={[]}
              recipientName={manualRecipientName}
              onUpgrade={() => {
                console.log('User clicked upgrade');
              }}
              onSkip={() => {
                // Trigger final step completion which saves the recipient
                handleStepComplete({});
              }}
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
    } else if (hasManualRecipientData) {
      // Shortened flow: Calendar -> Gift Schedule (2 steps)
      switch (currentStep) {
        case 1:
          return <CalendarStep onNext={handleStepComplete} onSkip={handleSkip} />;
        case 2:
          return (
            <GiftScheduleStep 
              onNext={handleStepComplete}
              onSkip={handleSkip}
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
    } else if (isNoRecipientsFlow) {
      // No recipients flow: Calendar -> Gift Schedule with manual name entry (2 steps)
      switch (currentStep) {
        case 1:
          return <CalendarStep onNext={handleStepComplete} onSkip={handleSkip} />;
        case 2:
          return (
            <GiftScheduleStep 
              onNext={handleStepComplete}
              onSkip={handleSkip}
              interests={[]} // No interests for no recipients flow
              selectedPersonForGift={null}
              allowManualRecipientEntry={true}
              hidePayment={true}
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
              onSkip={handleSkip}
              recipientName={onboardingData.firstRecipient?.fullName}
              interests={[]} // No interests for manual flow - skip interests step
              selectedPersonForGift={onboardingData.firstRecipient ? { personName: onboardingData.firstRecipient?.fullName } : null}
              firstRecipient={onboardingData.firstRecipient}
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
              onSkip={handleSkip}
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
                <a href="https://unwrapt.io" className="hover:opacity-80 transition-opacity">
                  <Logo size="md" />
                </a>
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
          {/* Progress bar only - no step text to save vertical space on mobile */}
          <div className="mb-6">
            <div className="flex justify-center">
              <div className="w-48 bg-brand-cream-light rounded-full h-1.5">
                <div 
                  className="bg-brand-charcoal h-1.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
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
