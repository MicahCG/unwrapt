import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Heart, Gift } from 'lucide-react';

const AppStart = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get email from landing page if available
    const email = sessionStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  const steps = [
    {
      title: "Life is busy",
      content: "Between work, family, and everything in between, it's easy to forget the moments that matter most.",
      icon: Clock,
      gradient: "from-brand-cream to-brand-peach"
    },
    {
      title: "But love shouldn't be forgotten",
      content: "The people in your life deserve to feel remembered, appreciated, and celebrated on their special days.",
      icon: Heart,
      gradient: "from-brand-peach to-brand-gold/20"
    },
    {
      title: "Let us help you be thoughtful",
      content: "Unwrapt makes it effortless to show you care, automatically scheduling the perfect gifts at the perfect time.",
      icon: Gift,
      gradient: "from-brand-gold/20 to-brand-cream"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Redirect to registration/login
      window.location.href = '/auth';
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentStepData.gradient} flex items-center justify-center transition-all duration-1000`}>
      <div className="max-w-2xl mx-auto px-4 text-center">
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12">
            <div className="mb-8">
              <div className="w-24 h-24 bg-brand-charcoal/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon className="w-12 h-12 text-brand-charcoal" />
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-brand-charcoal mb-6">
                {currentStepData.title}
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                {currentStepData.content}
              </p>
            </div>

            <div className="flex justify-center items-center space-x-3 mb-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'bg-brand-gold' 
                      : index < currentStep 
                        ? 'bg-brand-gold/60' 
                        : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button 
              onClick={handleNext}
              className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white text-lg px-8 py-3 w-full sm:w-auto"
            >
              {currentStep < steps.length - 1 ? 'Continue' : 'Get Started'}
            </Button>

            {userEmail && (
              <p className="text-sm text-gray-500 mt-4">
                Welcome back, {userEmail}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppStart;