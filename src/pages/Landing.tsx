import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Gift, Clock, Heart, Star, Calendar, TrendingUp, Sparkles, Coffee, Book, Music, ArrowRight, Zap } from 'lucide-react';

const Landing = () => {
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);
  const [typewriterText, setTypewriterText] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [cyclingText, setCyclingText] = useState('');

  const fullText = "Automate your gifts. Celebrate every moment.";
  const cyclingPhrases = [
    "Be thoughtful without the stress",
    "Automate your gift giving", 
    "Find niche gifts for people you love"
  ];

  const handleGetStarted = () => {
    window.location.href = 'https://app.unwrapt.io';
  };

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

  // Cycling typewriter effect
  useEffect(() => {
    if (!showContent) return;
    
    let timeoutId: NodeJS.Timeout;
    let charIndex = 0;
    let isDeleting = false;
    let currentPhraseIndex = 0;
    
    const typeSpeed = 80;
    const deleteSpeed = 40;
    const pauseTime = 3000;
    
    const typeEffect = () => {
      const currentPhrase = cyclingPhrases[currentPhraseIndex];
      
      if (isDeleting) {
        setCyclingText(currentPhrase.substring(0, charIndex));
        charIndex--;
        
        if (charIndex < 0) {
          isDeleting = false;
          charIndex = 0;
          currentPhraseIndex = (currentPhraseIndex + 1) % cyclingPhrases.length;
          timeoutId = setTimeout(typeEffect, typeSpeed);
        } else {
          timeoutId = setTimeout(typeEffect, deleteSpeed);
        }
      } else {
        setCyclingText(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
        
        if (charIndex > currentPhrase.length) {
          isDeleting = true;
          charIndex = currentPhrase.length;
          timeoutId = setTimeout(typeEffect, pauseTime);
        } else {
          timeoutId = setTimeout(typeEffect, typeSpeed);
        }
      }
    };
    
    timeoutId = setTimeout(typeEffect, 1000);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showContent]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* Subtle light accents */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-slate-50 rounded-full opacity-30 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute top-40 right-20 w-64 h-64 bg-blue-50 rounded-full opacity-40 animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute bottom-32 left-1/4 w-80 h-80 bg-purple-50 rounded-full opacity-20 animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />

      {/* 1. Full-Screen Hero Section */}
      <section className="min-h-screen flex items-center relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
          {/* Clean container */}
          <div className="p-12">
            {/* Typewriter Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 min-h-[200px] md:min-h-[280px] flex items-center justify-center">
              <span className="block text-center">
                {typewriterText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>
            
            {showContent && (
              <>
                <div className="mb-12 max-w-3xl mx-auto">
                  <div className="flex items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <Sparkles className="w-5 h-5 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
                    <p className="text-xl md:text-2xl text-slate-600 font-medium min-h-[40px] flex items-center">
                      {cyclingText}
                      <span className="animate-pulse ml-1">|</span>
                    </p>
                    <Heart className="w-5 h-5 text-pink-600 animate-pulse" />
                  </div>
                </div>
                
                {/* Single CTA Button */}
                <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <Button 
                    onClick={handleGetStarted}
                    className="bg-slate-900 text-white hover:bg-slate-800 px-12 py-6 text-xl font-bold rounded-full hover:scale-105 transition-all duration-300 group hover:shadow-xl"
                  >
                    Automate Your Gifts
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" />
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
          
          {/* Premium Gift Box Image */}
          <div className="mb-12 flex justify-center">
            <img 
              src="/lovable-uploads/c47adb17-4c8f-490e-b3ae-dbe289573fe8.png" 
              alt="Premium Unwrapt gift box"
              className="max-w-md w-full h-auto animate-fade-in"
            />
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
            Ready to become the most{" "}
            <span className="text-brand-gold">thoughtful person</span> you know?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands who never miss a special moment
          </p>
          
          <Button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group bg-brand-gold hover:bg-brand-gold/90 text-brand-charcoal text-xl px-12 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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