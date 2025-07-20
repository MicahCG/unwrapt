import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Clock, Heart, CheckCircle, Star, Calendar, Users, TrendingUp, Sparkles, Coffee, Book, Music } from 'lucide-react';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeGiftType, setActiveGiftType] = useState(0);
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

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

  // Animated background shapes
  const AnimatedShape = ({ delay = 0, duration = 20, className = "" }) => (
    <div 
      className={`absolute opacity-10 animate-pulse ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`
      }}
    />
  );

  // Gift categories with rotating content
  const giftCategories = [
    { icon: Coffee, name: "Coffee & Tea", desc: "Premium blends for the caffeine lover" },
    { icon: Book, name: "Books", desc: "Bestsellers and personalized reads" },
    { icon: Music, name: "Experiences", desc: "Concert tickets and unique adventures" },
    { icon: Sparkles, name: "Jewelry", desc: "Thoughtful pieces for special moments" },
  ];

  // Statistics about gift giving
  const giftStats = [
    { value: "12 hours", label: "Average time spent gift shopping per year", icon: Clock },
    { value: "73%", label: "Of people forget important dates annually", icon: Calendar },
    { value: "4.2 billion", label: "Missed moments due to busy schedules", icon: Heart },
    { value: "89%", label: "Feel stressed about gift giving", icon: TrendingUp },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveGiftType((prev) => (prev + 1) % giftCategories.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-white via-brand-cream/30 to-white relative overflow-hidden">
      {/* Abstract Animated Background Shapes */}
      <AnimatedShape 
        delay={0} 
        duration={25} 
        className="w-32 h-32 bg-gradient-to-br from-brand-gold/20 to-brand-peach/20 rounded-full top-20 left-10 animate-bounce" 
      />
      <AnimatedShape 
        delay={2} 
        duration={30} 
        className="w-20 h-20 bg-gradient-to-r from-brand-peach/15 to-brand-gold/15 rounded-lg top-40 right-20 rotate-45 animate-spin" 
      />
      <AnimatedShape 
        delay={4} 
        duration={35} 
        className="w-24 h-24 bg-gradient-to-bl from-brand-gold/10 to-brand-cream/20 rounded-full bottom-40 left-1/4 animate-pulse" 
      />
      <AnimatedShape 
        delay={1} 
        duration={28} 
        className="w-16 h-16 bg-brand-peach/10 top-1/3 right-1/3 transform rotate-12 animate-bounce" 
      />
      <AnimatedShape 
        delay={3} 
        duration={32} 
        className="w-28 h-28 bg-gradient-to-tr from-brand-gold/8 to-brand-peach/8 rounded-full top-1/2 left-1/2 animate-pulse" 
      />
      <AnimatedShape 
        delay={5} 
        duration={22} 
        className="w-40 h-40 bg-brand-cream/15 rounded-full bottom-20 right-10 animate-bounce" 
      />
      <AnimatedShape 
        delay={2.5} 
        duration={27} 
        className="w-12 h-12 bg-brand-gold/20 top-60 left-20 rotate-45 animate-spin" 
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-brand-charcoal mb-6 animate-fade-in">
              Never forget a special
              <span className="text-brand-gold block animate-slide-in-right">moment again</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-fade-in">
              Unwrapt automatically schedules and delivers personalized gifts for birthdays, 
              anniversaries, and holidays. Be thoughtful without the stress.
            </p>
            
            <form onSubmit={handleGetStarted} className="max-w-md mx-auto mb-8">
              <div className="flex gap-4">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 transition-all duration-300 focus:scale-105"
                />
                <Button 
                  type="submit"
                  className="bg-brand-gold hover:bg-brand-gold/90 text-white px-8 hover:scale-105 transition-transform duration-200"
                >
                  Get Started
                </Button>
              </div>
            </form>
            
            <div className="mb-12">
              <Button 
                onClick={() => window.location.href = 'https://app.unwrapt.io'}
                variant="outline"
                className="text-brand-charcoal border-brand-charcoal hover:bg-brand-cream hover:scale-105 transition-all duration-200"
              >
                Automate Your Gifting
              </Button>
            </div>

            {/* Interactive Gift Categories Carousel */}
            <div className="mt-16">
              <h3 className="text-2xl font-semibold text-brand-charcoal mb-8">Popular Gift Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {giftCategories.map((category, index) => {
                  const IconComponent = category.icon;
                  return (
                    <Card 
                      key={index}
                      className={`p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2 ${
                        activeGiftType === index 
                          ? 'border-brand-gold bg-brand-gold/10 shadow-lg' 
                          : 'border-gray-200 hover:border-brand-gold/50'
                      }`}
                      onClick={() => setActiveGiftType(index)}
                    >
                      <CardContent className="text-center space-y-3 p-0">
                        <IconComponent className={`w-8 h-8 mx-auto transition-colors duration-300 ${
                          activeGiftType === index ? 'text-brand-gold' : 'text-brand-charcoal'
                        }`} />
                        <h4 className="font-semibold text-brand-charcoal">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.desc}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-white/80 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              The Gift-Giving Challenge
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See why thousands trust Unwrapt to handle their special moments
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {giftStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card 
                  key={index}
                  className={`text-center p-8 border-none shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 ${
                    hoveredStat === index ? 'bg-brand-gold/10 shadow-xl' : ''
                  }`}
                  onMouseEnter={() => setHoveredStat(index)}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <CardContent className="space-y-4 p-0">
                    <IconComponent className={`w-12 h-12 mx-auto transition-colors duration-300 ${
                      hoveredStat === index ? 'text-brand-gold' : 'text-brand-charcoal'
                    }`} />
                    <div className="text-3xl font-bold text-brand-gold">{stat.value}</div>
                    <p className="text-gray-600 text-sm leading-relaxed">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
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