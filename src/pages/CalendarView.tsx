import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Home, Settings, CalendarDays, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AppNavigation from '@/components/AppNavigation';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';

const CalendarView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasIntegration, setHasIntegration] = useState(false);

  useEffect(() => {
    const fetchCalendarData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has a calendar integration
        console.log('📅 Checking for calendar integration...');
        const { data: integration, error: integrationError } = await supabase
          .from('calendar_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .maybeSingle();

        if (integrationError) {
          console.error('📅 Error checking integration:', integrationError);
          setLoading(false);
          return;
        }

        if (!integration) {
          console.log('📅 No calendar integration found');
          setHasIntegration(false);
          setLoading(false);
          return;
        }

        console.log('📅 Calendar integration found, fetching events...');
        setHasIntegration(true);

        // Fetch events using the stored access token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
          body: { 
            action: 'fetch_events', 
            access_token: integration.access_token 
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        });

        if (eventsError) {
          console.error('📅 Error fetching events:', eventsError);
          toast({
            title: "Error Fetching Events",
            description: "Could not fetch calendar events. Please try reconnecting your calendar.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const events = eventsData?.events || [];
        console.log('📅 Fetched events:', events.length);
        setCalendarEvents(events);

      } catch (error) {
        console.error('📅 Error in fetchCalendarData:', error);
        toast({
          title: "Error",
          description: "Failed to load calendar data.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [user, toast]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'birthday':
        return <Gift className="h-4 w-4 text-pink-500" />;
      case 'anniversary':
        return <CalendarDays className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal"></div>
          <span className="ml-2 text-brand-charcoal">Loading calendar events...</span>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <ResponsiveHeader>
        <ResponsiveNavigation>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light w-full sm:w-auto"
          >
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <AppNavigation />
        </ResponsiveNavigation>

        <ResponsiveActions>
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </ResponsiveActions>
      </ResponsiveHeader>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center text-brand-charcoal text-lg sm:text-xl">
            <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
            Special Events Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasIntegration ? (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-brand-charcoal/30 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal mb-2">
                No Calendar Integration Found
              </h3>
              <p className="text-sm sm:text-base text-brand-charcoal/70 mb-6 max-w-md mx-auto">
                Connect your Google Calendar during onboarding to see your important dates here.
              </p>
              <Button
                onClick={() => navigate('/onboarding')}
                className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
              >
                Go to Onboarding
              </Button>
            </div>
          ) : calendarEvents.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <CalendarDays className="h-12 w-12 sm:h-16 sm:w-16 text-brand-charcoal/30 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal mb-2">
                No Special Events Found
              </h3>
              <p className="text-sm sm:text-base text-brand-charcoal/70 max-w-md mx-auto">
                We didn't find any birthdays, anniversaries, or special events in your Google Calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal">
                  Found {calendarEvents.length} Special Event{calendarEvents.length !== 1 ? 's' : ''}
                </h3>
                <div className="text-xs sm:text-sm text-brand-charcoal/70">
                  Imported from Google Calendar
                </div>
              </div>
              
              <div className="grid gap-3">
                {calendarEvents.map((event, index) => (
                  <div 
                    key={index} 
                    className="flex items-center p-3 sm:p-4 bg-white rounded-lg border border-brand-cream-light hover:shadow-md transition-shadow"
                  >
                    <div className="mr-3 flex-shrink-0">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-brand-charcoal text-sm sm:text-base truncate">
                        {event.summary}
                      </h4>
                      <p className="text-xs sm:text-sm text-brand-charcoal/70">
                        {formatDate(event.date)}
                      </p>
                    </div>
                    <div className="text-xs px-2 py-1 bg-brand-cream rounded-full text-brand-charcoal capitalize flex-shrink-0 ml-2">
                      {event.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ResponsiveContainer>
  );
};

export default CalendarView;
