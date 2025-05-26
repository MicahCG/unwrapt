
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Check, ArrowDown, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarStepProps {
  onNext: (data: any) => void;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [foundDates, setFoundDates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGoogleConnect = async () => {
    console.log('Starting Google Calendar connection...');
    setIsConnecting(true);
    setError(null);
    
    try {
      // Get Google OAuth URL
      const { data: authData, error: authError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'get_auth_url' }
      });

      console.log('Auth URL response:', { authData, authError });

      if (authError) {
        console.error('Error getting auth URL:', authError);
        throw authError;
      }

      if (!authData?.authUrl) {
        throw new Error('No auth URL received from server');
      }

      console.log('Redirecting to Google OAuth:', authData.authUrl);
      // Redirect to Google OAuth
      window.location.href = authData.authUrl;
      
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Google Calendar');
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Google Calendar. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check for OAuth callback code from sessionStorage
  React.useEffect(() => {
    const code = sessionStorage.getItem('google_oauth_code');
    
    if (code) {
      console.log('Found OAuth code in sessionStorage, processing...');
      // Clear the code from sessionStorage
      sessionStorage.removeItem('google_oauth_code');
      handleOAuthCallback(code);
    }
  }, []);

  const handleOAuthCallback = async (code: string) => {
    console.log('Processing OAuth callback with code:', code);
    setIsConnecting(true);
    setError(null);
    
    try {
      // Exchange code for token
      console.log('Exchanging code for token...');
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'exchange_code', code }
      });

      console.log('Token exchange response:', { tokenData, tokenError });

      if (tokenError) {
        console.error('Token exchange error:', tokenError);
        throw tokenError;
      }

      if (!tokenData?.access_token) {
        throw new Error('No access token received');
      }

      // Fetch calendar events
      console.log('Fetching calendar events...');
      const { data: eventsData, error: eventsError } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'fetch_events', access_token: tokenData.access_token }
      });

      console.log('Events fetch response:', { eventsData, eventsError });

      if (eventsError) {
        console.error('Events fetch error:', eventsError);
        throw eventsError;
      }

      const events = eventsData?.events || [];
      console.log('Successfully fetched events:', events.length, 'events found');
      
      setFoundDates(events);
      setIsConnecting(false);

      // Show success toast
      toast({
        title: "Calendar Connected!",
        description: `Found ${events.length} important dates from your calendar.`,
      });

      // Auto-advance to next step after a short delay to show the success state
      setTimeout(() => {
        console.log('Auto-advancing to next step with data:', { 
          calendarConnected: true,
          importedDates: events 
        });
        onNext({ 
          calendarConnected: true,
          importedDates: events 
        });
      }, 2000);

    } catch (error) {
      console.error('Error processing OAuth callback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process calendar connection';
      setError(errorMessage);
      setIsConnecting(false);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleContinue = () => {
    console.log('Manual continue with found dates:', foundDates.length);
    onNext({ 
      calendarConnected: foundDates.length > 0,
      importedDates: foundDates 
    });
  };

  const handleSkip = () => {
    console.log('Skipping calendar connection');
    onNext({ 
      calendarConnected: false,
      importedDates: [] 
    });
  };

  return (
    <Card className="animate-fadeInUp border-brand-cream shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-cream-light p-4 rounded-full">
            <Calendar className="h-12 w-12 text-brand-charcoal" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2 text-brand-charcoal">Connect your calendar to never miss important dates</CardTitle>
        <p className="text-brand-charcoal/70">
          We'll automatically find birthdays, anniversaries, and holidays from your Google Calendar
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-700 font-medium">Connection Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!foundDates.length ? (
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
                  {isConnecting ? 'Connecting to Google Calendar...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>

            <div className="bg-white/80 p-4 rounded-lg border border-brand-cream">
              <h4 className="font-medium mb-2 text-brand-charcoal">What we'll find:</h4>
              <ul className="space-y-1 text-sm text-brand-charcoal/70">
                <li>• Birthdays from your contacts</li>
                <li>• Anniversary dates</li>
                <li>• Holiday reminders</li>
                <li>• Custom recurring events</li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <Button variant="ghost" onClick={handleSkip} className="text-brand-charcoal hover:bg-brand-cream-light" disabled={isConnecting}>
                I'll add dates manually
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-brand-gold/20 p-3 rounded-full">
                  <Check className="h-8 w-8 text-brand-gold" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2 text-brand-charcoal">Great! We found {foundDates.length} important dates</h3>
                <p className="text-brand-charcoal/70">Here's what we imported from your calendar:</p>
              </div>
            </div>

            <div className="bg-white border border-brand-cream rounded-lg max-h-48 overflow-y-auto">
              {foundDates.map((date, index) => (
                <div key={index} className="flex items-center p-3 border-b border-brand-cream last:border-b-0">
                  <Calendar className="h-4 w-4 text-brand-charcoal mr-3" />
                  <span className="text-sm text-brand-charcoal">{date.summary} - {new Date(date.date).toLocaleDateString()}</span>
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
  );
};

export default CalendarStep;
