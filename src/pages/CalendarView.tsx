import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Home, Settings, CalendarDays, Gift, Check, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AppNavigation from '@/components/AppNavigation';
import { ResponsiveContainer, ResponsiveHeader, ResponsiveNavigation, ResponsiveActions } from '@/components/ui/responsive-container';

interface CalendarPerson {
  id: string;
  name: string;
  events: CalendarEvent[];
  isRecipient: boolean;
  recipientId?: string;
  hasScheduledGifts: boolean;
  nextEvent?: CalendarEvent;
}

interface CalendarEvent {
  summary: string;
  date: string;
  type: string;
  category: string;
  personName?: string;
}

const CalendarView = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [calendarPeople, setCalendarPeople] = useState<CalendarPerson[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [scheduledGifts, setScheduledGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [autoAddingRecipients, setAutoAddingRecipients] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch calendar integration
        const { data: integration } = await supabase
          .from('calendar_integrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .maybeSingle();

        if (!integration) {
          setHasIntegration(false);
          setLoading(false);
          return;
        }

        setHasIntegration(true);

        // Fetch all data in parallel
        const [calendarResponse, recipientsResponse, giftsResponse] = await Promise.all([
          // Calendar events - use the new dashboard action
          supabase.functions.invoke('google-calendar', {
            body: { 
              action: 'fetch_dashboard_events',
              access_token: integration.access_token 
            },
            headers: {
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            }
          }),
          // Existing recipients
          supabase
            .from('recipients')
            .select('*')
            .eq('user_id', user.id),
          // Scheduled gifts
          supabase
            .from('scheduled_gifts')
            .select('*, recipients(*)')
            .eq('user_id', user.id)
        ]);

        const events = calendarResponse.data?.events || [];
        const existingRecipients = recipientsResponse.data || [];
        const existingGifts = giftsResponse.data || [];

        setRecipients(existingRecipients);
        setScheduledGifts(existingGifts);

        // Group events by person and match with existing recipients
        const peopleMap = new Map<string, CalendarPerson>();

        events.forEach((event: CalendarEvent) => {
          if (event.personName) {
            const personKey = event.personName.toLowerCase().trim();
            
            if (!peopleMap.has(personKey)) {
              // Check if this person is already a recipient
              const matchingRecipient = existingRecipients.find(r => 
                r.name.toLowerCase().trim() === personKey
              );
              
              // Check if they have scheduled gifts
              const hasGifts = existingGifts.some(g => 
                g.recipients?.name.toLowerCase().trim() === personKey
              );

              peopleMap.set(personKey, {
                id: personKey,
                name: event.personName,
                events: [event],
                isRecipient: !!matchingRecipient,
                recipientId: matchingRecipient?.id,
                hasScheduledGifts: hasGifts,
                nextEvent: event
              });
            } else {
              const person = peopleMap.get(personKey)!;
              person.events.push(event);
              
              // Update next event if this one is sooner
              if (new Date(event.date) < new Date(person.nextEvent!.date)) {
                person.nextEvent = event;
              }
            }
          }
        });

        const calendarPeopleArray = Array.from(peopleMap.values()).sort((a, b) => 
          new Date(a.nextEvent!.date).getTime() - new Date(b.nextEvent!.date).getTime()
        );

        setCalendarPeople(calendarPeopleArray);

        // AUTO-ADD: Automatically add all calendar people as recipients
        await autoAddAllCalendarPeople(calendarPeopleArray, existingRecipients);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load calendar data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user, toast]);

  const autoAddAllCalendarPeople = async (calendarPeopleArray: CalendarPerson[], existingRecipients: any[]) => {
    // Find people who aren't already recipients
    const peopleToAdd = calendarPeopleArray.filter(person => !person.isRecipient);
    
    if (peopleToAdd.length === 0) {
      return; // Everyone is already a recipient
    }

    console.log(`🎁 Auto-adding ${peopleToAdd.length} calendar people as recipients...`);
    setAutoAddingRecipients(true);

    try {
      // Batch insert all new recipients
      const newRecipients = peopleToAdd.map(person => ({
        user_id: user?.id,
        name: person.name,
        interests: [],
        // Auto-fill birthday/anniversary from calendar
        birthday: person.events.find(e => e.category === 'birthday')?.date,
        anniversary: person.events.find(e => e.category === 'anniversary')?.date,
        // Note that this was auto-imported from calendar
        notes: 'Auto-imported from Google Calendar'
      }));

      const { data: insertedRecipients, error } = await supabase
        .from('recipients')
        .insert(newRecipients)
        .select();

      if (error) throw error;

      // Update local state to reflect new recipients
      setRecipients(prev => [...prev, ...insertedRecipients]);
      
      // Update calendar people to mark them as recipients
      setCalendarPeople(prev => 
        prev.map(person => {
          const newRecipient = insertedRecipients.find(r => 
            r.name.toLowerCase().trim() === person.name.toLowerCase().trim()
          );
          if (newRecipient) {
            return {
              ...person,
              isRecipient: true,
              recipientId: newRecipient.id
            };
          }
          return person;
        })
      );

      toast({
        title: "Recipients Added!",
        description: `Added ${peopleToAdd.length} people from your calendar as recipients. You can now schedule gifts for them!`,
      });

    } catch (error) {
      console.error('Error auto-adding recipients:', error);
      toast({
        title: "Auto-Add Failed",
        description: "Failed to add some calendar people as recipients. You can add them manually.",
        variant: "destructive"
      });
    } finally {
      setAutoAddingRecipients(false);
    }
  };

  const handleScheduleGift = (person: CalendarPerson) => {
    // Navigate to dashboard with recipient info to trigger gift scheduling modal
    navigate('/', { 
      state: { 
        openScheduleModal: true,
        recipientId: person.recipientId,
        prefilledData: {
          occasion: person.nextEvent?.category === 'birthday' ? 'birthday' : 
                   person.nextEvent?.category === 'anniversary' ? 'anniversary' : 'other',
          occasion_date: person.nextEvent?.date,
          recipient: recipients.find(r => r.id === person.recipientId)
        }
      } 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPersonStatus = (person: CalendarPerson) => {
    if (person.hasScheduledGifts) {
      return { status: 'scheduled', color: 'status-success', icon: Check };
    }
    if (person.isRecipient) {
      return { status: 'recipient', color: 'status-info', icon: User };
    }
    return { status: 'processing', color: 'status-warning', icon: Clock };
  };

  if (loading) {
    return (
      <ResponsiveContainer>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-charcoal"></div>
          <span className="ml-2 text-brand-charcoal">Loading calendar insights...</span>
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
            Your Recipients from Calendar
          </CardTitle>
          <p className="text-sm text-brand-charcoal/70">
            {autoAddingRecipients 
              ? "Adding people from your calendar as recipients..."
              : "People from your calendar - now you can schedule gifts for them!"
            }
          </p>
        </CardHeader>
        <CardContent>
          {!hasIntegration ? (
            <div className="text-center py-8 sm:py-12">
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-brand-charcoal/30 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal mb-2">
                No Calendar Integration Found
              </h3>
              <p className="text-sm sm:text-base text-brand-charcoal/70 mb-6 max-w-md mx-auto">
                Connect your Google Calendar to automatically discover people and add them as recipients.
              </p>
              <Button
                onClick={() => navigate('/onboarding')}
                className="bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90 w-full sm:w-auto"
              >
                Connect Calendar
              </Button>
            </div>
          ) : calendarPeople.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <CalendarDays className="h-12 w-12 sm:h-16 sm:w-16 text-brand-charcoal/30 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal mb-2">
                No People Found in Calendar
              </h3>
              <p className="text-sm sm:text-base text-brand-charcoal/70 max-w-md mx-auto">
                We didn't find any people with birthdays, anniversaries, or special events in your calendar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-brand-charcoal">
                  {calendarPeople.length} people from your calendar
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="status-success">
                    <Check className="h-3 w-3 mr-1" />
                    Gift Scheduled
                  </Badge>
                  <Badge className="status-info">
                    <User className="h-3 w-3 mr-1" />
                    Recipient Ready
                  </Badge>
                  {autoAddingRecipients && (
                    <Badge className="status-warning">
                      <Clock className="h-3 w-3 mr-1" />
                      Adding Recipients...
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid gap-3">
                {calendarPeople.map((person) => {
                  const { status, color, icon: StatusIcon } = getPersonStatus(person);
                  
                  return (
                    <div 
                      key={person.id} 
                      className="flex items-center p-4 bg-white rounded-lg border border-brand-cream-light hover:shadow-md transition-shadow"
                    >
                      <div className="mr-4 flex-shrink-0">
                        <div className={`p-2 rounded-full ${color}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-brand-charcoal text-sm sm:text-base">
                            {person.name}
                          </h4>
                          {person.hasScheduledGifts && (
                            <Badge className="status-success text-xs">
                              Gift Scheduled
                            </Badge>
                          )}
                          {person.isRecipient && !person.hasScheduledGifts && (
                            <Badge className="status-info text-xs">
                              Ready for Gifts
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs sm:text-sm text-brand-charcoal/70">
                          <strong>{person.nextEvent?.type}</strong> in {formatDate(person.nextEvent!.date)}
                        </p>
                        
                        {person.events.length > 1 && (
                          <p className="text-xs text-brand-charcoal/50">
                            +{person.events.length - 1} more event{person.events.length > 2 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {person.isRecipient ? (
                          <Button
                            size="sm"
                            onClick={() => handleScheduleGift(person)}
                            className="text-xs bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                            disabled={person.hasScheduledGifts}
                          >
                            {person.hasScheduledGifts ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Scheduled
                              </>
                            ) : (
                              <>
                                <Gift className="h-3 w-3 mr-1" />
                                Schedule Gift
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="text-xs text-brand-charcoal/60 text-center">
                            <Clock className="h-3 w-3 mx-auto mb-1" />
                            Adding...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-brand-cream/50 rounded-lg">
                <p className="text-sm text-brand-charcoal/80 text-center">
                  ✨ <strong>Smart Auto-Import:</strong> We automatically added people from your calendar as recipients. Now you can easily schedule gifts for their upcoming events!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ResponsiveContainer>
  );
};

export default CalendarView;