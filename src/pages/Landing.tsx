import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Calendar, Users, Briefcase, TrendingUp, Gift, Heart, Clock, Sparkles } from 'lucide-react';
import { GlassButton } from '@/components/GlassButton';
import { LuxuryGiftBox } from '@/components/LuxuryGiftBox';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

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
        
        setIsSubmitted(true);
        setTimeout(() => {
          window.location.href = 'https://app.unwrapt.io';
        }, 1500);
      } catch (error) {
        console.error('Error:', error);
        setIsSubmitted(true);
        setTimeout(() => {
          window.location.href = 'https://app.unwrapt.io';
        }, 1500);
      }
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--champagne))]">
        <div className="text-center space-y-6 px-4">
          <div className="w-20 h-20 mx-auto bg-[hsl(var(--soft-gold))]/20 rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-[hsl(var(--soft-gold))]" />
          </div>
          <h2 className="font-serif text-4xl text-[hsl(var(--espresso))]">Welcome to Unwrapt</h2>
          <p className="text-[hsl(var(--charcoal-body))] text-lg">Redirecting you to the app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--champagne))] text-[hsl(var(--espresso))]">
      {/* Subtle texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--champagne))] via-[hsl(var(--soft-almond))]/30 to-[hsl(var(--champagne))]" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-12">
          {/* Hero visual - centered premium gift box */}
          <div className="mb-16">
            <LuxuryGiftBox />
          </div>

          {/* Hero copy */}
          <div className="space-y-6">
            <h1 className="font-serif text-5xl md:text-7xl text-[hsl(var(--espresso))] tracking-tight leading-tight">
              Effortless Gifting for<br />Busy Professionals
            </h1>
            <p className="font-sans text-lg md:text-xl text-[hsl(var(--charcoal-body))] max-w-2xl mx-auto leading-relaxed">
              Unwrapt remembers every occasion, chooses thoughtful gifts, and sends them automatically — so you deepen relationships without lifting a finger.
            </p>
          </div>

          {/* Hero buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <GlassButton variant="primary" href="/app">
              Get Started Free
            </GlassButton>
            <GlassButton variant="secondary" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              How It Works
            </GlassButton>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: "Never Forget Another Occasion",
                description: "Birthdays, anniversaries, holidays — we track them all so you never miss a moment that matters."
              },
              {
                title: "Thoughtful Gifts, Automatically Chosen",
                description: "Our AI selects personalized gifts based on preferences, interests, and your relationship."
              },
              {
                title: "Perfect for Clients, Teams, and Loved Ones",
                description: "Strengthen professional relationships and personal bonds with effortless, timely gifting."
              }
            ].map((item, idx) => (
              <div key={idx} className="group">
                <div className="h-px w-12 bg-[hsl(var(--soft-gold))] mb-6 group-hover:w-24 transition-all duration-300" />
                <h3 className="font-serif text-2xl text-[hsl(var(--espresso))] mb-4">{item.title}</h3>
                <p className="text-[hsl(var(--charcoal-body))] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 px-6 bg-[hsl(var(--soft-almond))]/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] text-center mb-20">
            How It Works
          </h2>
          
          <div className="space-y-16">
            {[
              {
                step: "01",
                icon: Users,
                title: "Tell Unwrapt who matters to you",
                description: "Add friends, family, colleagues, and clients with their important dates and preferences."
              },
              {
                step: "02",
                icon: Gift,
                title: "Set budgets and preferences",
                description: "Choose your gifting style, budget ranges, and let us know any special considerations."
              },
              {
                step: "03",
                icon: Sparkles,
                title: "We remember, choose, and ship the perfect gifts",
                description: "Sit back while we handle everything — from selection to delivery, with your approval."
              }
            ].map((item, idx) => (
              <div key={idx} className="flex gap-8 items-start group">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-white/25 backdrop-blur-sm border border-white/60 flex items-center justify-center group-hover:bg-white/35 transition-all duration-300">
                    <item.icon className="w-8 h-8 text-[hsl(var(--soft-gold))]" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[hsl(var(--soft-gold))] mb-2 tracking-wider">{item.step}</div>
                  <h3 className="font-serif text-2xl text-[hsl(var(--espresso))] mb-3">{item.title}</h3>
                  <p className="text-[hsl(var(--charcoal-body))] leading-relaxed">{item.description}</p>
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

      {/* Pricing Section */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] text-center mb-6">
            Choose Your Plan
          </h2>
          <p className="text-center text-[hsl(var(--charcoal-body))] text-lg mb-20">
            Flexible pricing for individuals and teams
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Essential",
                price: "$29",
                period: "/month",
                features: [
                  "Up to 10 recipients",
                  "Automated reminders",
                  "Basic gift curation",
                  "Email support"
                ]
              },
              {
                name: "Professional",
                price: "$79",
                period: "/month",
                features: [
                  "Up to 50 recipients",
                  "Advanced AI curation",
                  "Priority shipping",
                  "Priority support",
                  "Custom branding"
                ],
                featured: true
              },
              {
                name: "Concierge",
                price: "$199",
                period: "/month",
                features: [
                  "Unlimited recipients",
                  "White-glove service",
                  "Dedicated account manager",
                  "Custom gift sourcing",
                  "Team collaboration"
                ]
              }
            ].map((tier, idx) => (
              <div 
                key={idx} 
                className={`relative bg-white/25 backdrop-blur-sm border rounded-2xl p-8 hover:bg-white/35 transition-all duration-300 ${
                  tier.featured ? 'border-[hsl(var(--soft-gold))]/60 shadow-[0_0_40px_rgba(200,164,106,0.2)]' : 'border-white/50'
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[hsl(var(--soft-gold))] text-white text-sm rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-serif text-2xl text-[hsl(var(--espresso))] mb-2">{tier.name}</h3>
                <div className="mb-6">
                  <span className="font-serif text-4xl text-[hsl(var(--espresso))]">{tier.price}</span>
                  <span className="text-[hsl(var(--charcoal-body))]">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[hsl(var(--soft-gold))] flex-shrink-0 mt-0.5" />
                      <span className="text-[hsl(var(--charcoal-body))]">{feature}</span>
                    </li>
                  ))}
                </ul>
                <GlassButton variant={tier.featured ? 'primary' : 'secondary'} href="/app" className="w-full">
                  Get Started
                </GlassButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 bg-gradient-to-b from-[hsl(var(--champagne))] to-[hsl(var(--soft-almond))]/50">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))]">
            Start your gifting concierge — it only takes 2 minutes
          </h2>
          <p className="text-lg text-[hsl(var(--charcoal-body))]">
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="font-serif text-2xl text-[hsl(var(--espresso))]">Unwrapt</div>
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