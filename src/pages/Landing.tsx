import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Calendar, Users, Briefcase, TrendingUp, Gift, Heart, Clock, Sparkles } from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';
import { Logo } from '@/components/ui/logo';
import giftBoxImage from '@/assets/unwrapt-gift-box.png';
import GiftBoxOpeningIntro from '@/components/GiftBoxOpeningIntro';
import GiftingScenesScroll from '@/components/GiftingScenesScroll';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    return !localStorage.getItem('hasSeenLandingIntro');
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      try {
        sessionStorage.setItem('userEmail', email);
        
        const webhookUrl = 'https://hook.us2.make.com/cjsyb77bay61w4lrcauvbno5dmvdo7ca';
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'no-cors',
          body: JSON.stringify({ email }),
        });
        
        // Redirect immediately to app
        window.location.href = 'https://app.unwrapt.io';
      } catch (error) {
        console.error('Error:', error);
        // Still redirect even on error
        window.location.href = 'https://app.unwrapt.io';
      }
    }
  };

  useEffect(() => {
    if (showIntro) {
      localStorage.setItem('hasSeenLandingIntro', 'true');
    }
  }, [showIntro]);

  return (
    <div className="min-h-screen bg-[hsl(var(--champagne))] text-[hsl(var(--espresso))]">
      {showIntro && <GiftBoxOpeningIntro />}
      {/* Sticky Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="bg-white/25 backdrop-blur-[16px] border-b border-white/60">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Logo size="md" />
            <GlassButton variant="primary" href="/app">
              Get Started
            </GlassButton>
          </div>
        </div>
      </nav>

      {/* Subtle texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden" style={{ backgroundColor: '#F8F1E6' }} itemScope itemType="https://schema.org/Service">
        <meta itemProp="name" content="Unwrapt - Automatic Gift Scheduling Service" />
        <meta itemProp="serviceType" content="Automatic gift scheduling and delivery" />
        <meta itemProp="description" content="Premium gift scheduling service with smart reminders, personalized gift ideas, and automatic delivery for birthdays, anniversaries, and special occasions" />
        
        <div className="relative z-10 w-full max-w-[900px] mx-auto">
          <article className="hero-frame flex flex-col items-center text-center space-y-8">
            {/* Hero Headline */}
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight" style={{ color: '#8B7355' }} itemProp="headline">
              Effortless Gifting for Busy Professionals
            </h1>
            
            {/* Subheadline */}
            <p className="text-lg md:text-xl leading-relaxed max-w-2xl" style={{ color: '#8B7355' }} itemProp="description">
              Unwrapt remembers every occasion, finds the perfect gift, and delivers it — so you can stay connected without the stress
            </p>
            
            {/* Hidden SEO Content for AI Crawlers */}
            <div className="sr-only" itemProp="offers" itemScope itemType="https://schema.org/Offer">
              Unwrapt provides automatic gift scheduling, thoughtful gift ideas, premium curated gifts, smart occasion reminders for birthdays, anniversaries, holidays. Perfect for finding unique gifts, last-minute gift ideas, personalized gifts, luxury gifts, and high-end gift delivery. Never forget special occasions again with our intelligent gift planning service.
              <meta itemProp="price" content="0" />
              <meta itemProp="priceCurrency" content="USD" />
            </div>
            
            {/* Gift Icon */}
            <img 
              src={giftBoxImage} 
              alt="Unwrapt premium gift box - automatic gift scheduling and thoughtful gift delivery service for birthdays, anniversaries, and special occasions" 
              className="gift-bow w-40 md:w-48 lg:w-52 object-contain"
              itemProp="image"
            />

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
              <button
                onClick={() => window.location.href = '/app'}
                className="px-10 py-4 rounded-full font-medium text-lg text-white transition-all duration-300
                          hover:scale-[1.02]"
                style={{ 
                  backgroundColor: '#D4AF7A',
                  boxShadow: '0 4px 14px rgba(212, 175, 122, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 175, 122, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(212, 175, 122, 0.25)';
                }}
              >
                Get Started Free
              </button>
              
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 rounded-full font-medium text-lg transition-all duration-300
                          hover:scale-[1.02]"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  color: '#6B5444'
                }}
              >
                Learn More
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Gifting Scenes Scroll Section */}
      <GiftingScenesScroll />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 px-6 bg-[hsl(var(--soft-almond))]/30" itemScope itemType="https://schema.org/HowTo">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] text-center mb-20" itemProp="name">
            How Automatic Gift Scheduling Works
          </h2>
          
          <meta itemProp="description" content="Three simple steps to never forget special occasions: add recipients, set preferences, and let Unwrapt handle gift selection and delivery automatically" />
          
          <div className="space-y-16">
            {[
              {
                step: "01",
                icon: Users,
                title: "Tell Unwrapt who matters to you",
                description: "Add friends, family, colleagues, and clients with their important dates and preferences.",
                keywords: "add recipients, gift reminders, birthday reminders, anniversary tracking"
              },
              {
                step: "02",
                icon: Gift,
                title: "Set budgets and preferences",
                description: "Choose your gifting style, budget ranges, and let us know any special considerations.",
                keywords: "gift preferences, budget settings, personalized gifts, curated gift selection"
              },
              {
                step: "03",
                icon: Sparkles,
                title: "We remember, choose, and ship the perfect gifts",
                description: "Sit back while we handle everything — from selection to delivery, with your approval.",
                keywords: "automatic gift delivery, gift scheduling, thoughtful gifts, premium gift shipping"
              }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-8 items-start group" itemProp="step" itemScope itemType="https://schema.org/HowToStep">
                <meta itemProp="position" content={String(idx + 1)} />
                <meta itemProp="keywords" content={item.keywords} />
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-white/25 backdrop-blur-sm border border-white/60 flex items-center justify-center group-hover:bg-white/35 transition-all duration-300">
                    <item.icon className="w-8 h-8 text-[hsl(var(--soft-gold))]" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[hsl(var(--soft-gold))] mb-2 tracking-wider">{item.step}</div>
                  <h3 className="font-serif text-2xl text-[hsl(var(--espresso))] mb-3" itemProp="name">{item.title}</h3>
                  <p className="text-[hsl(var(--charcoal-body))] leading-relaxed" itemProp="text">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] text-center mb-6">
            Built for Professionals
          </h2>
          <p className="text-center text-[hsl(var(--charcoal-body))] text-lg mb-20 max-w-2xl mx-auto">
            Unwrapt is designed for high-achieving professionals who value relationships but lack the time for traditional gift shopping.
          </p>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Briefcase, title: "Executives", description: "Maintain client relationships effortlessly" },
              { icon: Users, title: "Consultants", description: "Show appreciation to key stakeholders" },
              { icon: TrendingUp, title: "Founders", description: "Build team culture and client loyalty" },
              { icon: Heart, title: "Client-Facing Professionals", description: "Never miss an important milestone" }
            ].map((persona, idx) => (
              <div key={idx} className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center group-hover:bg-white/30 transition-all duration-300">
                  <persona.icon className="w-7 h-7 text-[hsl(var(--soft-gold))]" />
                </div>
                <h3 className="font-serif text-xl text-[hsl(var(--espresso))] mb-3">{persona.title}</h3>
                <p className="text-sm text-[hsl(var(--charcoal-body))]">{persona.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 px-6 bg-[hsl(var(--soft-almond))]/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] text-center mb-20">
            Loved by Professionals
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                quote: "Unwrapt has saved me countless hours and strengthened my client relationships. It's like having a personal concierge.",
                author: "Sarah M.",
                role: "Management Consultant"
              },
              {
                quote: "I never realized how much I was missing until Unwrapt started handling my gifting. Game changer for my team culture.",
                author: "David L.",
                role: "Tech Founder"
              }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-white/30 backdrop-blur-sm border border-white/50 rounded-2xl p-8 hover:bg-white/40 transition-all duration-300">
                <p className="text-[hsl(var(--charcoal-body))] italic mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[hsl(var(--soft-gold))]/20 flex items-center justify-center text-[hsl(var(--soft-gold))] font-serif text-lg">
                    {testimonial.author[0]}
                  </div>
                  <div>
                    <div className="font-medium text-[hsl(var(--espresso))]">{testimonial.author}</div>
                    <div className="text-sm text-[hsl(var(--charcoal-body))]">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-b from-[hsl(var(--champagne))] to-[hsl(var(--soft-almond))]/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] mb-6">
            Start your gifting concierge — it only takes 2 minutes
          </h2>
          <p className="text-lg text-[hsl(var(--charcoal-body))] mb-10">
            Join professionals who never miss an important moment
          </p>
          <GlassButton variant="primary" href="/app">
            Get Started Free <ArrowRight className="w-5 h-5 ml-2 inline" />
          </GlassButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-[hsl(var(--soft-gold))]/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-center items-center gap-6">
            <div className="flex gap-8 text-sm text-[hsl(var(--charcoal-body))]">
              <Link to="/privacy" className="hover:text-[hsl(var(--soft-gold))] transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-[hsl(var(--soft-gold))] transition-colors">Terms</Link>
              <a href="mailto:support@unwrapt.io" className="hover:text-[hsl(var(--soft-gold))] transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-[hsl(var(--charcoal-body))]/60">
            © 2024 Unwrapt. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;