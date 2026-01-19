
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2, Sparkles, UserPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

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
  const [showAnimation, setShowAnimation] = useState(false);
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
      // Use secure function - tokens are never exposed to client
      const { data: integrations, error } = await supabase
        .rpc('get_my_calendar_integration');

      if (!error && integrations && integrations.length > 0) {
        const integration = integrations[0];
        if (integration.is_connected && !integration.is_expired) {
          setIsConnected(true);
          // Fetch events through edge function (handles tokens server-side)
          await fetchCalendarEvents();
        }
      }
    } catch (error) {
      console.error('Error checking calendar integration:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!user) return;

    setIsConnecting(true);
    try {
      // Get current session without forcing a refresh
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found. Please log in again.');
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

  const fetchCalendarEvents = async () => {
    setIsFetchingEvents(true);
    try {
      // Get current session without forcing a refresh
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session found');
        setIsFetchingEvents(false);
        return;
      }

      // Edge function handles tokens securely server-side
      console.log('📅 Fetching calendar events for onboarding...');
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'fetch_events'
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
      
      // Show animation if we found events
      if (importantDates.length > 0) {
        setShowAnimation(true);
        // Auto-proceed after animation
        setTimeout(() => {
          onNext({
            importedDates: importantDates,
            calendarConnected: true
          });
        }, 4000); // 4 seconds for animation
      } else {
        // No events found, skip animation
        toast({
          title: "No Events Found",
          description: "We couldn't find any important dates in your calendar.",
        });
      }

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
    console.log('📅 CalendarStep: Event selected:', event);
    console.log('📅 CalendarStep: Calling onNext with event data...');
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
    
    console.log('📅 CalendarStep: onNext called successfully');
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
        </CardContent>
      </Card>
    );
  }

  // If connected but still fetching events OR showing animation
  if (isFetchingEvents || showAnimation) {
    const soonestEvents = getSoonestEvents().slice(0, 5); // Show up to 5 dates
    
    return (
      <Card className="animate-fadeInUp">
        {isFetchingEvents ? (
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-charcoal mb-4" />
            <p className="text-brand-charcoal">Fetching your calendar events...</p>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-brand-charcoal/10 p-6 rounded-full"
            >
              <Sparkles className="h-16 w-16 text-brand-charcoal" />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-brand-charcoal mb-2">
                Amazing! We found {events.length} important dates
              </h2>
              <p className="text-muted-foreground">
                We'll help you never miss a special occasion
              </p>
            </motion.div>

            <div className="w-full max-w-md space-y-3">
              {soonestEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + (index * 0.15), duration: 0.4 }}
                  className="border rounded-lg p-4 bg-white shadow-sm"
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
                </motion.div>
              ))}
              
              {events.length > 5 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.5 }}
                  className="text-center text-sm text-muted-foreground pt-2"
                >
                  ...and {events.length - 5} more dates
                </motion.div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.5 }}
              className="text-center text-sm text-muted-foreground"
            >
              Setting things up for you...
            </motion.div>
          </CardContent>
        )}
      </Card>
    );
  }

// No events found - show engaging UI with manual entry option
  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-charcoal/10 p-4 rounded-full">
            <UserPlus className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">
          No Events, No Problem!
        </CardTitle>
        <p className="text-muted-foreground">
          We didn't find any birthdays or anniversaries in your calendar.<br />
          No worries, you can add recipients manually.
        </p>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => onNext({ noCalendarEvents: true, startManualEntry: true })}
          className="w-full bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
          size="lg"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Your First Recipient
        </Button>
      </CardContent>
    </Card>
  );
};

export default CalendarStep;
