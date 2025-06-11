import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowDown, AlertCircle, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import AddRecipientModal from '@/components/AddRecipientModal';

interface CalendarStepProps {
  onNext: (data: any) => void;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [foundDates, setFoundDates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
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

  const extractPersonFromEvent = (eventSummary: string) => {
    // Extract person's name from event summary
    // Common patterns: "John's Birthday", "John Doe Birthday", "Birthday - John", etc.
    const summary = eventSummary.toLowerCase();
    let personName = '';
    
    if (summary.includes("'s birthday")) {
      personName = eventSummary.split("'s")[0].trim();
    } else if (summary.includes("'s anniversary")) {
      personName = eventSummary.split("'s")[0].trim();
    } else if (summary.includes(" birthday")) {
      personName = eventSummary.replace(/birthday/i, '').trim();
    } else if (summary.includes(" anniversary")) {
      personName = eventSummary.replace(/anniversary/i, '').trim();
    } else if (summary.includes("birthday -")) {
      personName = eventSummary.split("birthday -")[1].trim();
    } else if (summary.includes("anniversary -")) {
      personName = eventSummary.split("anniversary -")[1].trim();
    } else {
      // Fallback: try to extract any name-like pattern
      const words = eventSummary.split(' ');
      personName = words.find(word => 
        word.length > 2 && 
        word[0] === word[0].toUpperCase() &&
        !['Birthday', 'Anniversary', 'The', 'And', 'Or'].includes(word)
      ) || '';
    }
    
    return personName;
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
      
      // Enhanced event processing to extract person names
      const processedEvents = events.map((event: any) => ({
        ...event,
        personName: extractPersonFromEvent(event.summary)
      }));
      
      console.log('📅 CalendarStep: Successfully fetched and processed events:', processedEvents.length, 'events found');
      
      setFoundDates(processedEvents);
      setIsConnecting(false);

      if (processedEvents.length === 0) {
        // No dates found, show manual add option
        setShowManualAdd(true);
        toast({
          title: "Calendar Connected Successfully!",
          description: "No important dates found in your calendar. Let's add your first recipient manually.",
        });
      } else {
        // Show success toast for found dates
        toast({
          title: "Calendar Connected Successfully!",
          description: `Found ${processedEvents.length} important dates from your calendar.`,
        });

        // Auto-advance to next step after showing success
        setTimeout(() => {
          console.log('📅 CalendarStep: Auto-advancing to next step with calendar data:', { 
            calendarConnected: true,
            importedDates: processedEvents 
          });
          onNext({ 
            calendarConnected: true,
            importedDates: processedEvents 
          });
        }, 6000);
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

  const handleContinue = () => {
    console.log('📅 CalendarStep: Manual continue with found dates:', foundDates.length);
    onNext({ 
      calendarConnected: foundDates.length > 0,
      importedDates: foundDates 
    });
  };

  const handleSkip = () => {
    console.log('📅 CalendarStep: Skipping calendar connection');
    onNext({ 
      calendarConnected: false,
      importedDates: [] 
    });
  };

  const handleRetry = () => {
    console.log('📅 CalendarStep: Retrying calendar connection...');
    setError(null);
    setIsConnecting(false);
    setFoundDates([]);
    setShowManualAdd(false);
  };

  const handleManualAdd = () => {
    setShowAddRecipientModal(true);
  };

  const handleRecipientAdded = () => {
    setShowAddRecipientModal(false);
    toast({
      title: "Recipient Added!",
      description: "Great! You've added your first recipient. Let's continue with the setup.",
    });
    
    // Continue to next step with calendar connected but no imported dates
    setTimeout(() => {
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
      importedDates: [] 
    });
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
          <CardTitle className="text-3xl mb-2 text-brand-charcoal">Sync to Never Miss Important Dates</CardTitle>
          <p className="text-brand-charcoal/70">
            We'll help you schedule birthdays, anniversaries, and holidays.
          </p>
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

          {showManualAdd ? (
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  <strong>Tip:</strong> You can always add more recipients later from your dashboard. Starting with one person will help you get familiar with the gift scheduling process!
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
                <h4 className="font-medium mb-2 text-brand-charcoal">We take your privacy seriously and only identify events that help with your gift giving.</h4>
              </div>

              <div className="text-center pt-4">
                <Button 
                  variant="ghost" 
                  onClick={handleSkip} 
                  className="text-brand-charcoal hover:bg-brand-cream" 
                  disabled={isConnecting}
                >
                  I'll add dates manually
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-brand-cream p-3 rounded-full">
                    <Check className="h-8 w-8 text-brand-charcoal" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-brand-charcoal">Great! We found {foundDates.length} dates</h3>
                  <p className="text-brand-charcoal/70">Here's what we imported:</p>
                </div>
              </div>

              <div className="bg-white border border-brand-cream rounded-lg max-h-48 overflow-y-auto">
                {foundDates.map((date, index) => (
                  <div key={index} className="flex items-center p-3 border-b border-brand-cream last:border-b-0">
                    <img 
                      src="/lovable-uploads/00f39f0e-8157-4f8a-81d2-67a47dc5ebbe.png" 
                      alt="Calendar" 
                      className="h-4 w-4 mr-3"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-brand-charcoal font-medium">{date.summary}</span>
                      {date.personName && (
                        <span className="text-xs text-brand-charcoal/60 ml-2">({date.personName})</span>
                      )}
                      <div className="text-xs text-brand-charcoal/50">
                        {new Date(date.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                size="lg" 
                className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
                onClick={handleContinue}
              >
                Continue with {foundDates.length} dates
                <ArrowDown className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
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
