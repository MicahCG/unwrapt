
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Gift, Calendar, Clock, Mail } from 'lucide-react';

interface WelcomeStepProps {
  onNext: (data: any) => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <Card className="animate-fadeInUp">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="bg-primary/10 p-4 rounded-full">
            <Gift className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Never miss another important moment</h1>
        <p className="text-xl text-muted-foreground">
          Set up thoughtful gift-giving on autopilot in under 5 minutes
        </p>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Features Preview */}
          <div className="grid gap-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <div className="font-medium">Smart Calendar Integration</div>
                <div className="text-sm text-muted-foreground">Auto-import birthdays and special dates</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
              <Gift className="h-6 w-6 text-accent" />
              <div>
                <div className="font-medium">Curated Gift Selection</div>
                <div className="text-sm text-muted-foreground">Personalized gifts based on interests</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
              <div>
                <div className="font-medium">Perfect Timing</div>
                <div className="text-sm text-muted-foreground">Delivered right on time, every time</div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Trusted by thoughtful people everywhere</p>
            <p className="font-semibold">Join 1,000+ people who never forget to show they care</p>
          </div>

          {/* CTA */}
          <Button 
            size="lg" 
            className="w-full text-lg py-6"
            onClick={() => onNext({})}
          >
            Get Started - It's Free
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            Free tier includes up to 3 recipients • No credit card required
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeStep;
