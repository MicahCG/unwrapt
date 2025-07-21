import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Clock, Heart, CheckCircle, Star, Calendar, Users, TrendingUp, Sparkles, Coffee, Book, Music, ArrowRight, Zap, Shield } from 'lucide-react';
import AnimatedBackground3D from '@/components/AnimatedBackground3D';
import AnimatedGiftDrawing from '@/components/AnimatedGiftDrawing';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeGiftType, setActiveGiftType] = useState(0);
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);
  const [typewriterText, setTypewriterText] = useState('');
  const [showContent, setShowContent] = useState(false);

  const fullText = "Never forget a special moment again";

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

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypewriterText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
        // Show rest of content after typewriter is complete
        setTimeout(() => {
          setShowContent(true);
        }, 500);
      }
    }, 80);

    return () => clearInterval(timer);
  }, []);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Animated Background */}
      <AnimatedBackground3D />
      
      {/* Animated Background with Muted Confetti */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-brand-cream/20 to-brand-peach/10" />
      
      {/* Abstract Animated Background Shapes */}
      <AnimatedShape 
        delay={0} 
        duration={25} 
        className="w-32 h-32 bg-gradient-to-br from-brand-gold/15 to-brand-peach/15 rounded-full top-20 left-10 animate-bounce" 
      />
      <AnimatedShape 
        delay={2} 
        duration={30} 
        className="w-20 h-20 bg-gradient-to-r from-brand-peach/10 to-brand-gold/10 rounded-lg top-40 right-20 rotate-45 animate-spin" 
      />
      <AnimatedShape 
        delay={4} 
        duration={35} 
        className="w-24 h-24 bg-gradient-to-bl from-brand-gold/8 to-brand-cream/15 rounded-full bottom-40 left-1/4 animate-pulse" 
      />
      <AnimatedShape 
        delay={1} 
        duration={28} 
        className="w-16 h-16 bg-brand-peach/8 top-1/3 right-1/3 transform rotate-12 animate-bounce" 
      />
      <AnimatedShape 
        delay={3} 
        duration={32} 
        className="w-28 h-28 bg-gradient-to-tr from-brand-gold/6 to-brand-peach/6 rounded-full top-1/2 left-1/2 animate-pulse" 
      />
      <AnimatedShape 
        delay={5} 
        duration={22} 
        className="w-40 h-40 bg-brand-cream/10 rounded-full bottom-20 right-10 animate-bounce" 
      />

      {/* 1. Full-Screen Hero Section */}
      <section className="min-h-screen flex items-center relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center">
            {/* Typewriter Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-brand-charcoal mb-6 min-h-[200px] md:min-h-[280px] flex items-center justify-center">
              <span className="block text-center">
                {typewriterText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>
            
            {showContent && (
              <>
                <p className="text-xl md:text-2xl text-slate-800 mb-12 max-w-3xl mx-auto animate-fade-in">
                  Unwrapt automatically schedules and delivers personalized gifts for birthdays, 
                  anniversaries, and holidays. Be thoughtful without the stress.
                </p>
                
                {/* Email Input with CTA */}
                <form onSubmit={handleGetStarted} className="max-w-lg mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <div className="flex gap-4">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex-1 h-14 text-lg transition-all duration-300 focus:scale-105 focus:shadow-lg"
                    />
                    <Button 
                      type="submit"
                      className="bg-slate-700 hover:bg-slate-600 text-white px-8 h-14 text-lg hover:scale-105 transition-all duration-300 group hover:shadow-2xl hover:shadow-slate-500/25"
                    >
                      Get Started
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </div>
                </form>
                
                {/* Skip Button for Logged Users */}
                <div className="animate-fade-in" style={{ animationDelay: '1s' }}>
                  <Button 
                    onClick={() => window.location.href = 'https://app.unwrapt.io'}
                    variant="ghost"
                    className="text-brand-charcoal hover:text-brand-gold transition-colors duration-200"
                  >
                    Skip to App →
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 2. Gift Categories Grid */}
      <section className="py-20 bg-white/90 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              Perfect Gifts for Every Occasion
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Curated categories to make every moment special
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: Coffee, name: "Coffee & Tea", desc: "Premium blends" },
              { icon: Book, name: "Books", desc: "Bestsellers" },
              { icon: Music, name: "Experiences", desc: "Adventures" },
              { icon: Sparkles, name: "Jewelry", desc: "Special pieces" },
              { icon: Gift, name: "Personalized", desc: "Custom gifts" },
              { icon: Star, name: "Luxury", desc: "Premium items" },
            ].map((category, index) => {
              const IconComponent = category.icon;
              return (
                <Card 
                  key={index}
                  className="group p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 border-gray-100 hover:border-brand-gold/30 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => setActiveGiftType(index)}
                >
                  <CardContent className="text-center space-y-3 p-0">
                    <div className="w-12 h-12 mx-auto bg-brand-gold/10 rounded-full flex items-center justify-center group-hover:bg-brand-gold/20 transition-colors duration-300">
                      <IconComponent className="w-6 h-6 text-brand-gold" />
                    </div>
                    <h4 className="font-semibold text-brand-charcoal">{category.name}</h4>
                    <p className="text-sm text-gray-600">{category.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Problem Stats */}
      <section className="py-20 bg-gradient-to-r from-brand-peach/10 to-brand-gold/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              The Gift-Giving Challenge
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real statistics that show why automation matters
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {giftStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card 
                  key={index}
                  className={`group text-center p-8 bg-white/80 backdrop-blur-sm border-none shadow-lg cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-xl animate-fade-in ${
                    hoveredStat === index ? 'bg-white shadow-2xl' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                  onMouseEnter={() => setHoveredStat(index)}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <CardContent className="space-y-4 p-0">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                      hoveredStat === index ? 'bg-brand-gold/20 scale-110' : 'bg-brand-gold/10'
                    }`}>
                      <IconComponent className={`w-8 h-8 transition-colors duration-300 ${
                        hoveredStat === index ? 'text-brand-gold' : 'text-brand-charcoal'
                      }`} />
                    </div>
                    <div className="text-4xl font-bold text-brand-charcoal group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium">{stat.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to never miss another special occasion
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: "Add Your People",
                description: "Tell us about the important people in your life and their special dates",
                bgColor: "bg-brand-peach/20"
              },
              {
                icon: Zap,
                title: "Set & Forget",
                description: "We automatically schedule thoughtful gifts based on their interests",
                bgColor: "bg-brand-gold/20"
              },
              {
                icon: Gift,
                title: "Perfect Delivery",
                description: "Gifts arrive right on time, making you look thoughtful and caring",
                bgColor: "bg-brand-cream"
              }
            ].map((step, index) => {
              const IconComponent = step.icon;
              return (
                <Card 
                  key={index} 
                  className="group text-center p-8 border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <CardContent className="space-y-6 p-0">
                    <div className={`w-20 h-20 ${step.bgColor} rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <IconComponent className="w-10 h-10 text-brand-charcoal" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-brand-charcoal">{step.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. About Unwrapt */}
      <section className="py-20 bg-gradient-to-r from-brand-peach/10 to-brand-gold/10 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-light text-brand-charcoal mb-8">
            About Unwrapt
          </h2>
          
          {/* Animated Gift Drawing */}
          <div className="mb-12">
            <AnimatedGiftDrawing />
          </div>
          
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed font-light">
            <p>Life gets busy, and it's easy to forget the small gestures that mean the most.</p>
            <p>Unwrapt was born from the idea that technology should help us be more human, not less.</p>
            <p>We believe staying connected to the people you care about shouldn't require perfect memory.</p>
            <p>Our mission: help you be the thoughtful person you want to be, even when life gets overwhelming.</p>
          </div>
        </div>
      </section>

      {/* 6. Final CTA */}
      <section className="py-24 bg-brand-charcoal relative overflow-hidden">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-brand-gold rounded-full animate-pulse" />
          <div className="absolute bottom-10 right-10 w-24 h-24 bg-brand-peach rounded-full animate-bounce" />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to become the most 
            <span className="text-brand-gold">thoughtful person</span> you know?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands who never miss a special moment
          </p>
          
          <Button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoal text-xl px-12 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-pulse"
          >
            Start Your Journey Today
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
          </Button>
          
          <p className="text-sm text-gray-400 mt-6">No credit card required • Free to start</p>
        </div>
      </section>
    </div>
  );
};

export default Landing;