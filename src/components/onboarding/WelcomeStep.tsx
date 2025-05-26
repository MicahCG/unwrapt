
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { Calendar, Clock, Mail } from 'lucide-react';

interface WelcomeStepProps {
  onNext: (data: any) => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <Card className="animate-fadeInUp border-brand-cream shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="bg-brand-cream-light p-4 rounded-full">
            <Logo variant="icon" size="lg" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-brand-charcoal">Never miss another important moment</h1>
        <p className="text-xl text-brand-charcoal/70">
          Set up thoughtful gift-giving on autopilot in under 5 minutes
        </p>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Features Preview */}
          <div className="grid gap-4">
            <div className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg border border-brand-cream">
              <Calendar className="h-6 w-6 text-brand-charcoal" />
              <div>
                <div className="font-medium text-brand-charcoal">Smart Calendar Integration</div>
                <div className="text-sm text-brand-charcoal/70">Auto-import birthdays and special dates</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg border border-brand-cream">
              <Logo variant="icon" size="sm" className="h-6 w-6" />
              <div>
                <div className="font-medium text-brand-charcoal">Curated Gift Selection</div>
                <div className="text-sm text-brand-charcoal/70">Personalized gifts based on interests</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-white/80 rounded-lg border border-brand-cream">
              <Clock className="h-6 w-6 text-brand-gold" />
              <div>
                <div className="font-medium text-brand-charcoal">Perfect Timing</div>
                <div className="text-sm text-brand-charcoal/70">Delivered right on time, every time</div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="text-center p-4 bg-brand-cream-light rounded-lg border border-brand-cream">
            <p className="text-sm text-brand-charcoal/70 mb-2">Trusted by thoughtful people everywhere</p>
            <p className="font-semibold text-brand-charcoal">Join 1,000+ people who never forget to show they care</p>
          </div>

          {/* CTA */}
          <Button 
            size="lg" 
            className="w-full text-lg py-6 bg-brand-charcoal text-brand-cream hover:bg-brand-charcoal/90"
            onClick={() => onNext({})}
          >
            Get Started - It's Free
          </Button>
          
          <p className="text-center text-sm text-brand-charcoal/60">
            Free tier includes up to 3 recipients • No credit card required
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeStep;
