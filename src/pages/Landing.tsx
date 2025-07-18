import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Clock, Heart, CheckCircle } from 'lucide-react';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Store email for later use in app
      sessionStorage.setItem('userEmail', email);
      setIsSubmitted(true);
      
      // Redirect to app subdomain
      setTimeout(() => {
        window.location.href = 'https://app.unwrapt.io';
      }, 1500);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-peach flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center p-8">
          <CardContent className="space-y-4">
            <CheckCircle className="w-16 h-16 text-brand-gold mx-auto" />
            <h2 className="text-2xl font-bold text-brand-charcoal">Almost there!</h2>
            <p className="text-gray-600">Redirecting you to get started...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-peach">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-brand-charcoal mb-6">
              Never forget a special
              <span className="text-brand-gold block">moment again</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Unwrapt automatically schedules and delivers personalized gifts for birthdays, 
              anniversaries, and holidays. Be thoughtful without the stress.
            </p>
            
            <form onSubmit={handleGetStarted} className="max-w-md mx-auto">
              <div className="flex gap-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button 
                  type="submit"
                  className="bg-brand-gold hover:bg-brand-gold/90 text-white px-8"
                >
                  Get Started
                </Button>
              </div>
            </form>
            
            <div className="mt-6">
              <Button 
                onClick={() => window.location.href = 'https://app.unwrapt.io'}
                variant="outline"
                className="text-brand-charcoal border-brand-charcoal hover:bg-brand-cream"
              >
                Automate Your Gifting
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              How Unwrapt Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to never miss another special occasion
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-8 border-none shadow-lg">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-brand-peach rounded-full flex items-center justify-center mx-auto">
                  <Heart className="w-8 h-8 text-brand-charcoal" />
                </div>
                <h3 className="text-xl font-semibold text-brand-charcoal">Add Your People</h3>
                <p className="text-gray-600">
                  Tell us about the important people in your life and their special dates
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 border-none shadow-lg">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-brand-gold/20 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-brand-charcoal" />
                </div>
                <h3 className="text-xl font-semibold text-brand-charcoal">Set & Forget</h3>
                <p className="text-gray-600">
                  We automatically schedule thoughtful gifts based on their interests
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-8 border-none shadow-lg">
              <CardContent className="space-y-4">
                <div className="w-16 h-16 bg-brand-cream rounded-full flex items-center justify-center mx-auto">
                  <Gift className="w-8 h-8 text-brand-charcoal" />
                </div>
                <h3 className="text-xl font-semibold text-brand-charcoal">Perfect Delivery</h3>
                <p className="text-gray-600">
                  Gifts arrive right on time, making you look thoughtful and caring
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gradient-to-r from-brand-peach/20 to-brand-gold/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-6">
            About Unwrapt
          </h2>
          <p className="text-lg text-gray-700 mb-8 leading-relaxed">
            Life gets busy, and it's easy to forget the small gestures that mean the most. 
            Unwrapt was born from the idea that technology should help us be more human, 
            not less. We believe that staying connected to the people you care about 
            shouldn't require perfect memory or endless to-do lists.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Our mission is simple: help you be the thoughtful person you want to be, 
            even when life gets overwhelming. Because the people you love deserve to 
            feel remembered, appreciated, and celebrated.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand-charcoal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to become the most thoughtful person you know?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands who never miss a special moment
          </p>
          <Button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-brand-gold hover:bg-brand-gold/90 text-white text-lg px-8 py-3"
          >
            Get Started Today
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;