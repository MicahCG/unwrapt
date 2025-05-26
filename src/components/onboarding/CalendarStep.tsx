
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Check, ArrowDown } from 'lucide-react';

interface CalendarStepProps {
  onNext: (data: any) => void;
}

const CalendarStep: React.FC<CalendarStepProps> = ({ onNext }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [foundDates, setFoundDates] = useState<string[]>([]);

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate Google Calendar integration
    setTimeout(() => {
      const mockDates = [
        "Mom's Birthday - March 15",
        "Wedding Anniversary - June 22",
        "Dad's Birthday - August 8",
        "Sister's Birthday - November 3",
        "Valentine's Day - February 14",
        "Mother's Day - May 12"
      ];
      setFoundDates(mockDates);
      setIsConnecting(false);
    }, 2000);
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
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
        </div>
        <CardTitle className="text-3xl mb-2">Connect your calendar to never miss important dates</CardTitle>
        <p className="text-muted-foreground">
          We'll automatically find birthdays, anniversaries, and holidays from your Google Calendar
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!foundDates.length ? (
          <>
            {/* Google Calendar Connect Button */}
            <Button 
              size="lg" 
              className="w-full text-lg py-6"
              onClick={handleGoogleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connecting to Google Calendar...
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>

            {/* Benefits */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">What we'll find:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Birthdays from your contacts</li>
                <li>• Anniversary dates</li>
                <li>• Holiday reminders</li>
                <li>• Custom recurring events</li>
              </ul>
            </div>

            {/* Skip Option */}
            <div className="text-center pt-4">
              <Button variant="ghost" onClick={handleSkip}>
                I'll add dates manually
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 p-3 rounded-full">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-2">Great! We found {foundDates.length} important dates</h3>
                <p className="text-muted-foreground">Here's what we imported from your calendar:</p>
              </div>
            </div>

            {/* Found Dates */}
            <div className="bg-white border rounded-lg max-h-48 overflow-y-auto">
              {foundDates.map((date, index) => (
                <div key={index} className="flex items-center p-3 border-b last:border-b-0">
                  <Calendar className="h-4 w-4 text-primary mr-3" />
                  <span className="text-sm">{date}</span>
                </div>
              ))}
            </div>

            {/* Continue Button */}
            <Button 
              size="lg" 
              className="w-full text-lg py-6"
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
