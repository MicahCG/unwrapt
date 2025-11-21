import React, { useState, useEffect } from 'react';
import { Logo } from '@/components/ui/logo';
import { useAuth } from '@/components/auth/AuthProvider';
import UserMenu from '@/components/auth/UserMenu';
import { ImportantDatesAnimation } from '@/components/onboarding/ImportantDatesAnimation';
import { GiftCarouselAnimation } from '@/components/onboarding/GiftCarouselAnimation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface OnboardingFlowProps {
  onBack: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<'loading' | 'dates' | 'gifts' | 'complete'>('loading');
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check for calendar integration and fetch events
    checkCalendarAndFetchEvents();
  }, [user]);

  const checkCalendarAndFetchEvents = async () => {
    if (!user) return;

    try {
      // Check if user has calendar integration
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (integration) {
        // Fetch calendar events
        const { data: session } = await supabase.auth.getSession();
        if (session?.session) {
          const { data: eventsData, error } = await supabase.functions.invoke('google-calendar', {
            body: { action: 'get_events' },
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
            }
          });

          if (!error && eventsData?.events) {
            const formattedEvents = eventsData.events.map((event: any) => ({
              personName: event.personName,
              type: event.type,
              date: event.date,
            }));
            
            setCalendarEvents(formattedEvents);
            
            // If we have events, show the dates animation
            if (formattedEvents.length > 0) {
              setCurrentStep('dates');
            } else {
              // No events found, skip directly to gift showcase
              setCurrentStep('gifts');
            }
          } else {
            // Error fetching events, skip to gifts
            setCurrentStep('gifts');
          }
        }
      } else {
        // No calendar integration, skip directly to gift showcase
        setCurrentStep('gifts');
      }
    } catch (error) {
      console.error('Error checking calendar integration:', error);
      // On error, skip to gifts
      setCurrentStep('gifts');
    }
  };

  const handleDatesComplete = () => {
    console.log('📅 Dates animation complete, moving to gifts');
    setCurrentStep('gifts');
  };

  const handleGiftsComplete = async () => {
    console.log('🎁 Gifts animation complete, creating recipients and completing onboarding');
    setCurrentStep('complete');

    try {
      // Create recipients from calendar data
      if (calendarEvents.length > 0) {
        await createRecipientsFromCalendarData(calendarEvents);
      }

      // Calculate user metrics
      if (user?.id) {
        await supabase.rpc('calculate_user_metrics', { user_uuid: user.id });
      }

      // Invalidate queries to refresh dashboard
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['recipients', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['user-metrics', user?.id] });

      toast({
        title: "Welcome to Unwrapt!",
        description: calendarEvents.length > 0 
          ? `${calendarEvents.length} recipients added to your dashboard!`
          : "Let's start making gift-giving effortless!",
      });

      // Navigate to dashboard after brief delay
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "There was a problem completing your setup. Please try again.",
        variant: "destructive"
      });
      // Still navigate to dashboard even if there's an error
      setTimeout(() => {
        onBack();
      }, 2000);
    }
  };

  const createRecipientsFromCalendarData = async (events: any[]) => {
    if (!events || events.length === 0) return;

    console.log('📅 Creating recipients from calendar data:', events.length, 'events');

    // Group events by person name
    const peopleMap = new Map<string, any>();
    
    events.forEach((event: any) => {
      if (event.personName) {
        const personKey = event.personName.toLowerCase().trim();
        
        if (!peopleMap.has(personKey)) {
          peopleMap.set(personKey, {
            name: event.personName,
            birthday: event.type === 'birthday' ? event.date : null,
            anniversary: event.type === 'anniversary' ? event.date : null,
          });
        } else {
          const person = peopleMap.get(personKey)!;
          if (event.type === 'birthday' && !person.birthday) {
            person.birthday = event.date;
          }
          if (event.type === 'anniversary' && !person.anniversary) {
            person.anniversary = event.date;
          }
        }
      }
    });

    const calendarPeople = Array.from(peopleMap.values());
    console.log('👥 Found unique people in calendar:', calendarPeople.length);

    // Get existing recipients to avoid duplicates
    const { data: existingRecipients } = await supabase
      .from('recipients')
      .select('name, birthday, anniversary')
      .eq('user_id', user?.id);

    // Filter out people who are already recipients
    const newPeople = calendarPeople.filter(person => {
      const isDuplicate = existingRecipients?.some(existing => {
        const nameMatch = existing.name.toLowerCase().trim() === person.name.toLowerCase().trim();
        return nameMatch;
      });
      return !isDuplicate;
    });

    if (newPeople.length === 0) {
      console.log('📅 All people already exist as recipients');
      return;
    }

    // Create recipients
    for (const person of newPeople) {
      try {
        const recipientData = {
          user_id: user?.id,
          name: person.name,
          email: null,
          phone: null,
          address: null,
          interests: [],
          birthday: person.birthday,
          anniversary: person.anniversary,
          relationship: null,
          notes: `Imported from Google Calendar during onboarding`
        };

        const { error: recipientError } = await supabase
          .from('recipients')
          .insert(recipientData);

        if (recipientError) {
          console.error('Error creating recipient for', person.name, ':', recipientError);
          continue;
        }

        console.log('✅ Created recipient:', person.name);
      } catch (error) {
        console.error('Error processing person', person.name, ':', error);
      }
    }

    console.log('📅 Successfully created recipients from calendar');
  };

  // Render different steps
  if (currentStep === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#D2B887]" />
          <p className="text-[#1A1A1A]/70">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  if (currentStep === 'dates') {
    return (
      <ImportantDatesAnimation 
        events={calendarEvents} 
        onComplete={handleDatesComplete}
      />
    );
  }

  if (currentStep === 'gifts') {
    return (
      <GiftCarouselAnimation 
        onComplete={handleGiftsComplete}
      />
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D2B887] mx-auto mb-4"></div>
          <p className="text-[#1A1A1A]">Completing your setup...</p>
          <p className="text-[#1A1A1A]/70 text-sm mt-2">You'll be redirected to your dashboard shortly</p>
        </div>
      </div>
    );
  }

  return null;
};

export default OnboardingFlow;
