import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowDown, AlertCircle, UserPlus, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import AddRecipientModal from '@/components/AddRecipientModal';

interface CalendarStepProps {
  onNext: (data: any) => void;
}

interface CalendarEvent {
  summary: string;
  date: string;
  type: string;
  personName: string;
  daysUntil?: number;
  nextOccurrenceDate?: string;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [foundDates, setFoundDates] = useState<CalendarEvent[]>([]);
  const [upcomingDates, setUpcomingDates] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [manuallyAddedRecipient, setManuallyAddedRecipient] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check for OAuth code on component mount
  useEffect(() => {
    const checkForOAuthCode = () => {
      const storedCode = sessionStorage.getItem('google_oauth_code');
      if (storedCode) {
        console.log('📅 CalendarStep: Found stored OAuth code, processing...');
        handleOAuthCallback(storedCode);
        sessionStorage.removeItem('google_oauth_code');
      }
    };

    checkForOAuthCode();
  }, []);

  // Calculate days until and sort upcoming events
  useEffect(() => {
    if (foundDates.length > 0) {
      const today = new Date();
      const currentYear = today.getFullYear();
      
      const eventsWithDaysUntil = foundDates.map(event => {
        const eventDate = new Date(event.date);
        let nextOccurrence = new Date(currentYear, eventDate.getMonth(), eventDate.getDate());
        
        // If the date has passed this year, move to next year
        if (nextOccurrence < today) {
          nextOccurrence.setFullYear(currentYear + 1);
        }
        
        const timeDiff = nextOccurrence.getTime() - today.getTime();
        const daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return {
          ...event,
          daysUntil,
          nextOccurrenceDate: nextOccurrence.toISOString()
        };
      });
      
      // Sort by days until (closest first) and take top 3
      const sortedEvents = eventsWithDaysUntil
        .sort((a, b) => a.daysUntil! - b.daysUntil!)
        .slice(0, 3);
      
      setUpcomingDates(sortedEvents);
    }
  }, [foundDates]);

  const extractPersonFromEvent = (eventSummary: string) => {
    const summary = eventSummary.toLowerCase();
    let personName = '';
    
    if (summary.includes("'s birthday") || summary.includes("'s bday")) {
      const splitChar = summary.includes("'s birthday") ? "'s birthday" : "'s bday";
      personName = eventSummary.split(splitChar)[0].trim();
    } else if (summary.includes("'s anniversary")) {
      personName = eventSummary.split("'s")[0].trim();
    } else if (summary.includes(" birthday") || summary.includes(" bday")) {
      personName = eventSummary.replace(/birthday|bday/i, '').trim();
    } else if (summary.includes(" anniversary")) {
      personName = eventSummary.replace(/anniversary/i, '').trim();
    } else if (summary.includes("birthday -") || summary.includes("bday -")) {
      const splitStr = summary.includes("birthday -") ? "birthday -" : "bday -";
      personName = eventSummary.split(splitStr)[1].trim();
    } else if (summary.includes("anniversary -")) {
      personName = eventSummary.split("anniversary -")[1].trim();
    } else {
      // Fallback: try to extract any name-like pattern
      const words = eventSummary.split(' ');
      personName = words.find(word => 
        word.length > 2 && 
        word[0] === word[0].toUpperCase() &&
        !['Birthday', 'Bday', 'Anniversary', 'The', 'And', 'Or'].includes(word)
      ) || '';
    }
    
    return personName;
  };

  const handleGoogleConnect = async () => {
    console.log('📅 CalendarStep: Starting Google Calendar connection...');
    setIsConnecting(true);
    setError(null);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('📅 CalendarStep: Getting session for auth headers...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      console.log('📅 CalendarStep: Calling google-calendar edge function...');
      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('📅 CalendarStep: Auth URL response:', { authData, authError });

      if (authError) {
        console.error('📅 CalendarStep: Error getting auth URL:', authError);
        throw new Error(authError.message || 'Failed to get authorization URL');
      }

      if (!authData?.authUrl) {
        throw new Error('No authorization URL received from server');
      }

      console.log('📅 CalendarStep: Redirecting to Google OAuth:', authData.authUrl);
      window.location.href = authData.authUrl;
      
    } catch (error) {
      console.error('📅 CalendarStep: Error connecting to Google Calendar:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Calendar';
      setError(errorMessage);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleOAuthCallback = async (code: string) => {
    console.log('📅 CalendarStep: Processing OAuth callback with code:', { codeLength: code.length });
    setIsConnecting(true);
    setError(null);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('📅 CalendarStep: Getting session for token exchange...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      // Exchange code for token
      console.log('📅 CalendarStep: Exchanging authorization code for access token...');
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'exchange_code', code },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('📅 CalendarStep: Token exchange response:', { 
        success: !!tokenData, 
        hasAccessToken: !!tokenData?.access_token,
        error: tokenError 
      });

      if (tokenError) {
        console.error('📅 CalendarStep: Token exchange error:', tokenError);
        throw new Error(tokenError.message || 'Failed to exchange authorization code');
      }

      if (!tokenData?.access_token) {
        throw new Error('No access token received from Google');
      }

      // Fetch calendar events
      console.log('📅 CalendarStep: Fetching calendar events with access token...');
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'fetch_events', access_token: tokenData.access_token },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      console.log('📅 CalendarStep: Events fetch response:', { 
        success: !!eventsData, 
        eventCount: eventsData?.events?.length || 0,
        error: eventsError 
      });

      if (eventsError) {
        console.error('📅 CalendarStep: Events fetch error:', eventsError);
        throw new Error(eventsError.message || 'Failed to fetch calendar events');
      }

      const events = eventsData?.events || [];
      console.log('📅 CalendarStep: Successfully fetched and processed events:', events.length, 'events found');
      
      setFoundDates(events);
      setIsConnecting(false);

      if (events.length === 0) {
        toast({
          title: "Calendar Connected Successfully!",
          description: "No important dates found in your calendar. Let's add your first recipient.",
        });
        
        // Proceed directly to recipient entry screen instead of showing modal
        setTimeout(() => {
          onNext({ 
            calendarConnected: true,
            importedDates: [],
            noRecipientsFound: true
          });
        }, 1500);
      } else {
        toast({
          title: "Calendar Connected Successfully!",
          description: `Found ${events.length} important dates from your calendar.`,
        });
      }

    } catch (error) {
      console.error('📅 CalendarStep: Error processing OAuth callback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process calendar connection';
      setError(errorMessage);
      setIsConnecting(false);
      toast({
        title: "Calendar Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleContinueWithSelection = () => {
    if (!selectedEvent) return;
    
    console.log('📅 CalendarStep: Continuing with selected event:', selectedEvent);
    onNext({ 
      calendarConnected: true,
      importedDates: foundDates, // Store ALL found dates
      selectedPersonForGift: selectedEvent // Store selected person for onboarding
    });
  };

  const handleRetry = () => {
    console.log('📅 CalendarStep: Retrying calendar connection...');
    setError(null);
    setIsConnecting(false);
    setFoundDates([]);
    setUpcomingDates([]);
    setSelectedEvent(null);
    setShowManualAdd(false);
    setManuallyAddedRecipient(null);
  };

  const handleManualAdd = () => {
    setShowAddRecipientModal(true);
  };

  const handleRecipientAdded = () => {
    console.log('📅 CalendarStep: Recipient added via modal');
    setShowAddRecipientModal(false);
    
    toast({
      title: "Recipient Added!",
      description: "Great! You've added your first recipient. Let's schedule a gift for them.",
    });
    
    setTimeout(() => {
      // Go directly to recipient entry screen for manual flow
      onNext({ 
        calendarConnected: true,
        importedDates: [],
        manualRecipientAdded: true
      });
    }, 1500);
  };

  const handleContinueWithoutDates = () => {
    console.log('📅 CalendarStep: Continuing without calendar dates');
    onNext({ 
      calendarConnected: true,
      importedDates: [],
      noRecipientsFound: true
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilText = (daysUntil: number) => {
    if (daysUntil === 0) return "Today!";
    if (daysUntil === 1) return "Tomorrow";
    return `${daysUntil} days`;
  };

  return (
    <>
      <Card className="animate-fadeInUp border-brand-cream shadow-lg bg-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-brand-cream p-4 rounded-full">
              <img 
                src="/lovable-uploads/00f39f0e-8157-4f8a-81d2-67a47dc5ebbe.png" 
                alt="Calendar" 
                className="h-12 w-12"
              />
            </div>
          </div>
          <CardTitle className="text-3xl mb-2 text-brand-charcoal">Never Miss Another Birthday or Event</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-700 font-medium">Connection Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="text-red-700 border-red-200 hover:bg-red-50"
              >
                Retry
              </Button>
            </div>
          )}

          {manuallyAddedRecipient ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-brand-cream p-3 rounded-full">
                  <Check className="h-8 w-8 text-brand-charcoal" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2 text-brand-charcoal">Perfect!</h3>
                <p className="text-brand-charcoal/70">
                  {manuallyAddedRecipient.name} has been added. Let's schedule your first gift for them!
                </p>
              </div>
            </div>
          ) : showManualAdd ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-brand-cream p-3 rounded-full">
                    <Check className="h-8 w-8 text-brand-charcoal" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-brand-charcoal">Calendar Connected!</h3>
                  <p className="text-brand-charcoal/70">We didn't find any important dates in your calendar, but that's okay! Let's add your first recipient manually.</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                  onClick={handleManualAdd}
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Your First Recipient
                </Button>

                <Button 
                  variant="outline"
                  size="lg" 
                  className="w-full text-lg py-6 border-brand-charcoal text-brand-charcoal hover:bg-brand-cream-light"
                  onClick={handleContinueWithoutDates}
                >
                  Continue Without Adding Recipients
                </Button>
              </div>
            </>
          ) : upcomingDates.length > 0 ? (
            <>
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-brand-cream p-3 rounded-full">
                    <Check className="h-8 w-8 text-brand-charcoal" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-brand-charcoal">Great! We found {foundDates.length} important dates</h3>
                  <p className="text-brand-charcoal/70">Select someone to schedule your first gift for:</p>
                </div>
              </div>

              <div className="space-y-3">
                {upcomingDates.map((event, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                      selectedEvent?.personName === event.personName 
                        ? 'border-brand-charcoal bg-brand-cream/20' 
                        : 'border-brand-cream hover:border-brand-charcoal/30'
                    }`}
                    onClick={() => handleEventSelect(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-brand-charcoal text-lg">{event.personName}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="h-4 w-4 text-brand-charcoal/60" />
                            <span className="text-sm text-brand-charcoal/70 capitalize">{event.type}</span>
                            <span className="text-sm text-brand-charcoal/70">• {formatDate(event.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-brand-gold" />
                          <span className="text-sm font-medium text-brand-charcoal">
                            {getDaysUntilText(event.daysUntil!)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedEvent && (
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                  onClick={handleContinueWithSelection}
                >
                  Continue with {selectedEvent.personName}
                  <ArrowDown className="h-4 w-4 ml-2" />
                </Button>
              )}

              <div className="text-center">
                <p className="text-sm text-brand-charcoal/60 mb-2">
                  We'll automatically add all {foundDates.length} people to your dashboard after onboarding
                </p>
              </div>
            </>
          ) : !foundDates.length ? (
            <>
              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                onClick={handleGoogleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-cream mr-2"></div>
                    Connecting to Google Calendar...
                  </>
                ) : (
                  <>
                    <img 
                      src="/lovable-uploads/00f39f0e-8157-4f8a-81d2-67a47dc5ebbe.png" 
                      alt="Calendar" 
                      className="h-5 w-5 mr-2"
                    />
                    Connect Google Calendar
                  </>
                )}
              </Button>

              <div className="bg-white p-4 rounded-lg border border-brand-cream">
                <p className="font-medium mb-2 text-brand-charcoal">We only scan for birthdays and anniversaries.</p>
               <p className="font-medium mb-2 text-brand-charcoal">We never access your emails or meeting details.</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <AddRecipientModal
        isOpen={showAddRecipientModal}
        onClose={() => setShowAddRecipientModal(false)}
        onRecipientAdded={handleRecipientAdded}
      />
    </>
  );
};

export default CalendarStep;
