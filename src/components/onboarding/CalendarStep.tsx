
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Check, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CalendarStepProps {
  onNext: (data: any) => void;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [foundDates, setFoundDates] = useState<any[]>([]);

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Get Google OAuth URL
      const clientId = 'YOUR_GOOGLE_CLIENT_ID'; // This should be configured in environment
      const redirectUri = `${window.location.origin}/__/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar.readonly';
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_type=code&` +
        `access_type=offline`;

      // For demo purposes, we'll simulate the calendar connection
      // In production, this would redirect to Google OAuth
      setTimeout(async () => {
        // Simulate fetching real calendar data
        const mockDates = [
          { summary: "Mom's Birthday", date: "2024-03-15", type: "birthday" },
          { summary: "Wedding Anniversary", date: "2024-06-22", type: "anniversary" },
          { summary: "Dad's Birthday", date: "2024-08-08", type: "birthday" },
          { summary: "Sister's Birthday", date: "2024-11-03", type: "birthday" },
          { summary: "Parents' Anniversary", date: "2024-09-14", type: "anniversary" }
        ];
        
        setFoundDates(mockDates);
        setIsConnecting(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setIsConnecting(false);
    }
  };

  const handleContinue = () => {
    onNext({ 
      calendarConnected: foundDates.length > 0,
      importedDates: foundDates 
    });
  };

  const handleSkip = () => {
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
                  Connecting to Google Calendar...
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
              <Button variant="ghost" onClick={handleSkip} className="text-brand-charcoal hover:bg-brand-cream-light">
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
