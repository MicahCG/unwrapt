import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Calendar, Users, Briefcase, TrendingUp, Gift, Heart, Clock, Sparkles } from "lucide-react";
import { GlassButton } from "@/components/GlassButton";
import { Logo } from "@/components/ui/logo";
import giftBoxImage from "@/assets/unwrapt-gift-box.png";
import GiftBoxOpeningIntro from "@/components/GiftBoxOpeningIntro";
import GiftingScenesScroll from "@/components/GiftingScenesScroll";
import AnimatedGiftingJourney from "@/components/AnimatedGiftingJourney";
import LuxuryGiftShowcase from "@/components/LuxuryGiftShowcase";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";

import { useAuth } from "@/components/auth/AuthProvider";

const Landing = () => {
  const { signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showNav, setShowNav] = useState(false);
  // Clear any old localStorage and always show intro on unwrapt.io
  const [showIntro, setShowIntro] = useState(() => {
    localStorage.removeItem("hasSeenLandingIntro");
    localStorage.removeItem("hasSeenIntro");
    return true;
  });

  // Use localhost when in development, production URL otherwise
  const getAppUrl = () => {
    return window.location.hostname === "localhost" ? "http://localhost:8080" : "https://app.unwrapt.io";
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      try {
        sessionStorage.setItem("userEmail", email);

        const webhookUrl = "https://hook.us2.make.com/cjsyb77bay61w4lrcauvbno5dmvdo7ca";
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "no-cors",
          body: JSON.stringify({ email }),
        });

        // Redirect immediately to app
        window.location.href = getAppUrl();
      } catch (error) {
        console.error("Error:", error);
        // Still redirect even on error
        window.location.href = getAppUrl();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--champagne))] text-[hsl(var(--espresso))]">
      {showIntro && <GiftBoxOpeningIntro />}
      {/* Sticky Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showNav ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="bg-white/25 backdrop-blur-[16px] border-b border-white/60">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Logo size="md" />
            <GlassButton
              variant="primary"
              onClick={() => {
                localStorage.setItem("shouldShowOnboardingIntro", "true");
                signInWithGoogle();
              }}
            >
              Get Started
            </GlassButton>
          </div>
        </div>
      </nav>

      {/* Subtle texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden"
        style={{ backgroundColor: "#F8F1E6" }}
        itemScope
        itemType="https://schema.org/Service"
      >
        <meta itemProp="name" content="Unwrapt - Automatic Gift Scheduling Service" />
        <meta itemProp="serviceType" content="Automatic gift scheduling and delivery" />
        <meta
          itemProp="description"
          content="Premium gift scheduling service with smart reminders, personalized gift ideas, and automatic delivery for birthdays, anniversaries, and special occasions"
        />

        <div className="relative z-10 w-full max-w-[900px] mx-auto">
          <article className="hero-frame flex flex-col items-center text-center space-y-8">
            {/* Hero Headline */}
            <h1
              className="font-serif text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight"
              style={{ color: "#8B7355" }}
              itemProp="headline"
            >
              Never Miss a Moment
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl leading-relaxed max-w-2xl"
              style={{ color: "#8B7355" }}
              itemProp="description"
            >
              We remember every occasion, find the perfect gift, and deliver it so you become the most thoughtful person
              you know.
            </p>

            {/* Hidden SEO Content for AI Crawlers */}
            <div className="sr-only" itemProp="offers" itemScope itemType="https://schema.org/Offer">
              Unwrapt provides automatic gift scheduling, thoughtful gift ideas and premium quality so you can be the
              most thoughtful person you know.
              <meta itemProp="price" content="0" />
              <meta itemProp="priceCurrency" content="USD" />
            </div>

            {/* Benefit Cards */}
            <div className="grid grid-cols-3 gap-4 pt-8 w-full max-w-lg">
              <div className="flex flex-col items-center p-4 bg-white/30 backdrop-blur-sm border border-white/50 rounded-xl">
                <Heart className="w-6 h-6 mb-2" style={{ color: "#D4AF7A" }} />
                <span className="text-2xl font-serif font-semibold" style={{ color: "#8B7355" }}>9,451</span>
                <span className="text-xs text-center" style={{ color: "#8B7355" }}>Moments Remembered</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/30 backdrop-blur-sm border border-white/50 rounded-xl">
                <Clock className="w-6 h-6 mb-2" style={{ color: "#D4AF7A" }} />
                <span className="text-2xl font-serif font-semibold" style={{ color: "#8B7355" }}>500 hrs</span>
                <span className="text-xs text-center" style={{ color: "#8B7355" }}>Saved</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white/30 backdrop-blur-sm border border-white/50 rounded-xl">
                <Gift className="w-6 h-6 mb-2" style={{ color: "#D4AF7A" }} />
                <span className="text-2xl font-serif font-semibold" style={{ color: "#8B7355" }}>821</span>
                <span className="text-xs text-center" style={{ color: "#8B7355" }}>Gifts Delivered</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-6">
              <button
                onClick={() => {
                  localStorage.setItem("shouldShowOnboardingIntro", "true");
                  signInWithGoogle();
                }}
                className="px-10 py-4 rounded-full font-medium text-lg text-white transition-all duration-300
                          hover:scale-[1.02]"
                style={{
                  backgroundColor: "#D4AF7A",
                  boxShadow: "0 4px 14px rgba(212, 175, 122, 0.25)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(212, 175, 122, 0.45)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(212, 175, 122, 0.25)";
                }}
              >
                Get Started Free
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Gifting Scenes Scroll Section */}
      <GiftingScenesScroll />

      {/* Animated Gifting Journey Section */}
      <AnimatedGiftingJourney />

      {/* Luxury Gift Showcase Section */}
      <LuxuryGiftShowcase />

      {/* Pricing Section */}
      <PricingSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA */}
      <section className="py-32 px-6" style={{ backgroundColor: "#F8F1E6" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] mb-10">
            Set up your gifting concierge in 2 minutes
          </h2>
          <GlassButton
            variant="primary"
            onClick={() => {
              localStorage.setItem("shouldShowOnboardingIntro", "true");
              signInWithGoogle();
            }}
          >
            Get Started Free <ArrowRight className="w-5 h-5 ml-2 inline" />
          </GlassButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-[hsl(var(--soft-gold))]/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-center items-center gap-6">
            <div className="flex gap-8 text-sm text-[hsl(var(--charcoal-body))]">
              <Link to="/privacy" className="hover:text-[hsl(var(--soft-gold))] transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-[hsl(var(--soft-gold))] transition-colors">
                Terms
              </Link>
              <a href="mailto:support@unwrapt.io" className="hover:text-[hsl(var(--soft-gold))] transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-[hsl(var(--charcoal-body))]/60">
            © 2026 Unwrapt. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
