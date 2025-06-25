
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AddRecipientModal from '../AddRecipientModal';

interface CalendarStepProps {
  onNext: (data: any) => void;
  onSkip: () => void;
}

interface CalendarEvent {
  summary: string;
  date: string;
  type: 'birthday' | 'anniversary';
  personName: string;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext, onSkip }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user already has calendar integration
  useEffect(() => {
    checkCalendarIntegration();
  }, [user]);

  const checkCalendarIntegration = async () => {
    if (!user) return;

    try {
      const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();

      if (integration) {
        setIsConnected(true);
        await fetchCalendarEvents(integration.access_token);
      }
    } catch (error) {
      console.error('Error checking calendar integration:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!user) return;

    setIsConnecting(true);
    try {
      // Get current session for auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('🔗 Getting Google Calendar auth URL...');
      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (authError) {
        console.error('❌ Auth URL error:', authError);
        throw new Error(authError.message || 'Failed to get authorization URL');
      }

      if (authData?.authUrl) {
        console.log('🚀 Opening Google Calendar auth window');
        // Open the auth URL in a new window for OAuth flow
        const authWindow = window.open(authData.authUrl, 'google-auth', 'width=500,height=600');
        
        // Listen for the auth completion
        const checkAuth = setInterval(async () => {
          try {
            if (authWindow?.closed) {
              clearInterval(checkAuth);
              // Check if auth was successful by looking for integration
              await checkCalendarIntegration();
              setIsConnecting(false);
            }
          } catch (error) {
            console.error('Error checking auth window:', error);
          }
        }, 1000);

        // Cleanup after 5 minutes
        setTimeout(() => {
          clearInterval(checkAuth);
          setIsConnecting(false);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
        }, 300000);
      }
    } catch (error) {
      console.error('💥 Calendar connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect calendar';
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const fetchCalendarEvents = async (accessToken: string) => {
    setIsFetchingEvents(true);
    try {
      // Get current session for auth headers
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('📅 Fetching calendar events for onboarding...');
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'fetch_events',
          access_token: accessToken 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (eventsError) {
        console.error('❌ Events fetch error:', eventsError);
        throw new Error(eventsError.message || 'Failed to fetch calendar events');
      }

      const importantDates = eventsData?.events || [];
      console.log('🎉 Found important dates:', importantDates.length);
      
      setEvents(importantDates);

      // Store imported dates for later use in onboarding flow
      onNext({ 
        importedDates: importantDates,
        calendarConnected: true 
      });

      toast({
        title: "Calendar Connected!",
        description: `Found ${importantDates.length} important dates in your calendar.`,
      });

    } catch (error) {
      console.error('💥 Events fetch error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch calendar events';
      toast({
        title: "Fetch Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsFetchingEvents(false);
    }
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate && events.length > 0) {
      const eventsForDate = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === newDate.toDateString();
      });
      if (eventsForDate.length > 0) {
        setSelectedEvent(eventsForDate[0]);
      } else {
        setSelectedEvent(null);
      }
    }
  };

  const handleNext = () => {
    if (selectedEvent) {
      onNext({ 
        selectedPersonForGift: {
          personName: selectedEvent.personName,
          date: selectedEvent.date,
          type: selectedEvent.type
        },
        importedDates: events,
        calendarConnected: isConnected
      });
    } else if (events.length > 0) {
      // If they have events but didn't select one, still pass the imported dates
      onNext({
        importedDates: events,
        calendarConnected: isConnected,
        noRecipientsFound: true
      });
    } else {
      // No events found or no calendar connected
      onNext({
        noRecipientsFound: true,
        manualRecipientAdded: true
      });
    }
  };

  const handleManualEntry = () => {
    setShowManualModal(true);
  };

  // If not connected, show connection screen
  if (!isConnected) {
    return (
      <Card className="animate-fadeInUp">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-brand-charcoal/10 p-4 rounded-full">
              <CalendarIcon className="h-12 w-12 text-brand-charcoal" />
            </div>
          </div>
          <CardTitle className="text-3xl mb-2">
            Connect Your Calendar
          </CardTitle>
          <p className="text-muted-foreground">
            Connect Google Calendar to automatically find birthdays and anniversaries.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={connectGoogleCalendar}
            disabled={isConnecting}
            className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <CalendarIcon className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleManualEntry}
            className="w-full"
          >
            Enter Person Manually
          </Button>

          <div className="flex justify-between pt-4">
            <Button variant="secondary" onClick={onSkip}>Skip This Step</Button>
          </div>
        </CardContent>

        {showManualModal && (
          <AddRecipientModal
            isOpen={showManualModal}
            onClose={(recipientData) => {
              setShowManualModal(false);
              if (recipientData) {
                // Pass the recipient data to the next step
                onNext({
                  manualRecipientData: recipientData,
                  calendarConnected: false
                });
              }
            }}
          />
        )}
      </Card>
    );
  }

  // If connected but still fetching events
  if (isFetchingEvents) {
    return (
      <Card className="animate-fadeInUp">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-charcoal mb-4" />
          <p className="text-brand-charcoal">Fetching your calendar events...</p>
        </CardContent>
      </Card>
    );
  }

  // Connected and events loaded - show date selection
  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <CalendarIcon className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">
          When is their special day?
        </CardTitle>
        <p className="text-muted-foreground">
          {events.length > 0 
            ? `Found ${events.length} important dates in your calendar. Select one to get started.`
            : "No important dates found. You can add someone manually."
          }
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        {events.length > 0 && (
          <>
            <div className="flex justify-center w-full">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center" side="bottom">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedEvent ? (
              <div className="border rounded-md p-4 bg-brand-cream/20">
                <h3 className="text-lg font-semibold">{selectedEvent.personName}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedEvent.type === 'birthday' ? 'Birthday' : 'Anniversary'} on {format(new Date(selectedEvent.date), "PPP")}
                </p>
              </div>
            ) : (
              <div className="border rounded-md p-4 text-center text-muted-foreground">
                {date ? 'No event selected for this date.' : 'Select a date to see events.'}
              </div>
            )}

            {/* Show a preview of available events */}
            {events.length > 0 && (
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2 text-brand-charcoal">Available Events:</h4>
                <div className="space-y-2">
                  {events.slice(0, 3).map((event, index) => (
                    <div key={index} className="text-sm flex justify-between">
                      <span>{event.personName}</span>
                      <span className="text-muted-foreground">
                        {event.type === 'birthday' ? '🎂' : '💕'} {format(new Date(event.date), "MMM d")}
                      </span>
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      ...and {events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {events.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Important Dates Found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any birthdays or anniversaries in your calendar.
            </p>
            <Button 
              variant="outline" 
              onClick={handleManualEntry}
              className="w-full"
            >
              Add Someone Manually
            </Button>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="secondary" onClick={onSkip}>Skip</Button>
          <Button 
            onClick={handleNext}
            disabled={events.length === 0 && !selectedEvent}
          >
            Continue
          </Button>
        </div>
      </CardContent>
      
      {showManualModal && (
        <AddRecipientModal
          isOpen={showManualModal}
          onClose={(recipientData) => {
            setShowManualModal(false);
            if (recipientData) {
              // Pass the recipient data to the next step
              onNext({
                manualRecipientData: recipientData,
                calendarConnected: isConnected,
                importedDates: events
              });
            }
          }}
        />
      )}
    </Card>
  );
};

export default CalendarStep;
