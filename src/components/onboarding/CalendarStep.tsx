
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        console.log('🚀 Redirecting to Google Calendar auth');
        // Direct redirect to Google's OAuth page
        window.location.href = authData.authUrl;
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

  // Get the 3 soonest events
  const getSoonestEvents = () => {
    const now = new Date();
    const sortedEvents = events
      .map(event => ({
        ...event,
        dateObj: new Date(event.date)
      }))
      .filter(event => event.dateObj >= now)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(0, 3);
    
    return sortedEvents;
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    // Automatically proceed to next step after selection
    onNext({ 
      selectedPersonForGift: {
        personName: event.personName,
        date: event.date,
        type: event.type
      },
      importedDates: events,
      calendarConnected: isConnected
    });
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
          
          <Button 
            variant="ghost" 
            onClick={onSkip}
            className="w-full text-muted-foreground hover:text-brand-charcoal"
          >
            I'll schedule recipients later
          </Button>
        </CardContent>
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

  const soonestEvents = getSoonestEvents();

  // Connected and events loaded - show event selection
  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <CalendarIcon className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">
          We Found {events.length} Important Dates!
        </CardTitle>
        <p className="text-muted-foreground">
          Who should we start with?
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {soonestEvents.length > 0 ? (
          <>
            <div className="space-y-3">
              {soonestEvents.map((event, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-brand-charcoal/50"
                  onClick={() => handleEventSelect(event)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-brand-charcoal">{event.personName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {event.type === 'birthday' ? '🎂' : '💕'} {event.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-brand-charcoal">
                        {format(new Date(event.date), "MMM d")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {events.length > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                ...and {events.length - 3} more dates in your calendar
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={onSkip}
                className="w-full text-muted-foreground hover:text-brand-charcoal"
              >
                I'll schedule recipients later
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Upcoming Events Found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any upcoming birthdays or anniversaries in your calendar. You can still continue to set up your first gift.
            </p>
            <Button onClick={() => onNext({
              importedDates: [],
              calendarConnected: isConnected,
              noRecipientsFound: true
            })}>
              Continue Anyway
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarStep;
