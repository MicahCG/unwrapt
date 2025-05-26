
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Calendar, Clock, Mail } from 'lucide-react';
import OnboardingFlow from '@/components/OnboardingFlow';

const Index = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (showOnboarding) {
    return <OnboardingFlow onBack={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Gift className="h-10 w-10 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-foreground">Unwrapt</h1>
          </div>

          {/* Main Headline */}
          <div className="animate-fadeInUp">
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Never miss another
              <span className="text-primary block">important moment</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              Set up thoughtful gift-giving on autopilot in under 5 minutes
            </p>
            
            <p className="text-lg text-accent-foreground font-medium mb-8">
              Thoughtfulness, on autopilot.
            </p>
          </div>

          {/* CTA Button */}
          <div className="animate-slideInRight">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 mb-6 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => setShowOnboarding(true)}
            >
              Get Started - It's Free
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Join 1,000+ people who never forget to show they care
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How it works</h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Connect Your Calendar</h4>
                <p className="text-muted-foreground">
                  We'll automatically import birthdays, anniversaries, and special dates
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <Gift className="h-12 w-12 text-accent mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Add Recipients</h4>
                <p className="text-muted-foreground">
                  Tell us about the people you care about and their interests
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">Relax & Enjoy</h4>
                <p className="text-muted-foreground">
                  We'll send thoughtful gifts automatically, right on time
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">1,000+</div>
                <div className="text-muted-foreground">Happy users</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">5,000+</div>
                <div className="text-muted-foreground">Gifts sent</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary mb-2">99.5%</div>
                <div className="text-muted-foreground">On-time delivery</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            <Gift className="h-5 w-5 mr-2" />
            <span>© 2024 Unwrapt. Thoughtfulness, on autopilot.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
