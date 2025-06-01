import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft, RefreshCw, Plus, AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CalendarView = () => {
  console.log('🔥 CalendarView component is rendering - this should appear in console');
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  console.log('CalendarView rendering with user:', user?.id);

  // Check for Google Calendar integration with forced refetch
  const { data: calendarIntegration, refetch: refetchIntegration, isLoading: integrationLoading } = useQuery({
    queryKey: ['calendar-integration', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('Fetching calendar integration for user:', user.id);
      
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching calendar integration:', error);
        return null;
      }
      
      console.log('Calendar integration data:', data);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch to detect new connections
    refetchOnMount: true
  });

  const isCalendarConnected = !!calendarIntegration;

  console.log('Calendar connected:', isCalendarConnected, 'Integration:', calendarIntegration);

  // Force refetch integration when component mounts
  useEffect(() => {
    if (user?.id) {
      refetchIntegration();
    }
  }, [user?.id, refetchIntegration]);

  const handleConnectCalendar = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Getting session for auth headers...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('Calling google-calendar edge function with auth headers...');
      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url', redirect_context: 'calendar' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('Auth URL response:', { authData, authError });

      if (authError) {
        console.error('Error getting auth URL:', authError);
        throw new Error(authError.message || 'Failed to get authorization URL');
      }

      if (!authData?.authUrl) {
        throw new Error('No authorization URL received from server');
      }

      console.log('Redirecting to Google OAuth:', authData.authUrl);
      window.location.href = authData.authUrl;
      
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Calendar';
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const refreshCalendarEvents = async () => {
    if (!calendarIntegration?.access_token) {
      console.log('No access token available for refreshing events');
      toast({
        title: "No Calendar Connected",
        description: "Please connect your Google Calendar first.",
        variant: "destructive"
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('Refreshing calendar events with token:', calendarIntegration.access_token ? 'Token exists' : 'No token');

      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'fetch_events', access_token: calendarIntegration.access_token },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('Events fetch response:', { eventsData, eventsError });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        throw new Error(eventsError.message || 'Failed to fetch calendar events');
      }

      const events = eventsData?.events || [];
      console.log('Received events:', events.length, 'events:', events);
      setCalendarEvents(events);

      toast({
        title: "Calendar Refreshed",
        description: `Found ${events.length} special events.`,
      });

    } catch (error) {
      console.error('Error refreshing calendar events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh calendar';
      toast({
        title: "Refresh Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load calendar events when integration is available
  useEffect(() => {
    if (isCalendarConnected && calendarIntegration?.access_token) {
      console.log('Auto-refreshing calendar events on mount');
      refreshCalendarEvents();
    } else {
      console.log('Not auto-refreshing:', { isCalendarConnected, hasToken: !!calendarIntegration?.access_token });
    }
  }, [isCalendarConnected, calendarIntegration?.access_token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'birthday':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'anniversary':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getDaysUntil = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const sortedEvents = calendarEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Show loading state while checking integration
  if (integrationLoading) {
    return (
      <div className="min-h-screen bg-brand-cream p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-brand-charcoal">
                <Calendar className="h-5 w-5 mr-2" />
                Special Events Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal mx-auto mb-4"></div>
                <p className="text-brand-charcoal/70">Checking calendar integration...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {isCalendarConnected && (
              <Button
                variant="outline"
                onClick={refreshCalendarEvents}
                disabled={isRefreshing}
                className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Events
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/settings')}
              className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-brand-charcoal">
              <Calendar className="h-5 w-5 mr-2" />
              Special Events Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isCalendarConnected ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-brand-charcoal/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-brand-charcoal mb-2">
                  Connect Your Google Calendar
                </h3>
                <p className="text-brand-charcoal/70 mb-6">
                  Connect your Google Calendar to automatically see birthdays, anniversaries, and other special events
                </p>
                <Button
                  onClick={handleConnectCalendar}
                  className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </Button>
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-brand-charcoal/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-brand-charcoal mb-2">
                  No Special Events Found
                </h3>
                <p className="text-brand-charcoal/70 mb-6">
                  We didn't find any birthdays, anniversaries, or special events in your calendar.
                  Try creating an event with keywords like "Birthday", "Anniversary", "Wedding", or including "born" in the title.
                </p>
                <Button
                  variant="outline"
                  onClick={refreshCalendarEvents}
                  disabled={isRefreshing}
                  className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-brand-charcoal">
                    Upcoming Special Events ({calendarEvents.length})
                  </h3>
                  <p className="text-sm text-brand-charcoal/60">
                    Connected to Google Calendar
                  </p>
                </div>

                <div className="grid gap-4">
                  {sortedEvents.map((event, index) => {
                    const daysUntil = getDaysUntil(event.date);
                    const isToday = daysUntil === 0;
                    const isPast = daysUntil < 0;

                    return (
                      <Card key={index} className={`${isToday ? 'ring-2 ring-brand-charcoal' : ''} ${isPast ? 'opacity-60' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-medium text-brand-charcoal">{event.summary}</h4>
                                <Badge className={getEventTypeColor(event.type)}>
                                  {event.type}
                                </Badge>
                                {isToday && (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Today!
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-brand-charcoal/70">
                                {formatDate(event.date)}
                              </p>
                            </div>
                            <div className="text-right">
                              {!isPast && (
                                <p className="text-sm font-medium text-brand-charcoal">
                                  {isToday ? 'Today' : `${daysUntil} day${daysUntil === 1 ? '' : 's'}`}
                                </p>
                              )}
                              {isPast && (
                                <p className="text-sm text-brand-charcoal/50">
                                  Past event
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;
