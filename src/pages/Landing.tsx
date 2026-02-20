import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Clock, Gift } from "lucide-react";
import { GlassButton } from "@/components/GlassButton";
import { Logo } from "@/components/ui/logo";
import ceramicCollection from "@/assets/ceramic-collection.png";
import GiftBoxOpeningIntro from "@/components/GiftBoxOpeningIntro";
import GiftingScenesScroll from "@/components/GiftingScenesScroll";
import AnimatedGiftingJourney from "@/components/AnimatedGiftingJourney";
import LuxuryGiftShowcase from "@/components/LuxuryGiftShowcase";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import { useAuth } from "@/components/auth/AuthProvider";
import { motion } from "framer-motion";
import SEOHead from "@/components/seo/SEOHead";

const Landing = () => {
  const { signInWithGoogle } = useAuth();
  const [showNav, setShowNav] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    localStorage.removeItem("hasSeenLandingIntro");
    localStorage.removeItem("hasSeenIntro");
    return true;
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem("shouldShowOnboardingIntro", "true");
    signInWithGoogle();
  };

  const stats = [
    { icon: Heart, value: "2,340+", label: "Occasions Tracked" },
    { icon: Clock, value: "120 hrs", label: "Shopping Time Saved" },
    { icon: Gift, value: "680+", label: "Gifts Delivered" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--ivory))]" style={{ color: "#4B3B2A" }}>
      <SEOHead
        title="Automatic Gift Scheduling & Thoughtful Gift Ideas"
        description="Never forget special occasions. Unwrapt automatically schedules and delivers personalized, premium gifts for birthdays, anniversaries, and holidays. Smart reminders, curated gifts, effortless planning."
        canonical="https://unwrapt.io/"
      />
      {showIntro && <GiftBoxOpeningIntro />}

      {/* Sticky Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          showNav ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="bg-white/60 backdrop-blur-xl border-b border-[hsl(var(--cream-border))]">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <Logo size="md" />
            <div className="flex items-center gap-8">
              <a href="#pricing" className="hidden sm:inline text-sm tracking-wide hover:opacity-70 transition-opacity" style={{ color: "#8B7355" }}>Pricing</a>
              <a href="#faq" className="hidden sm:inline text-sm tracking-wide hover:opacity-70 transition-opacity" style={{ color: "#8B7355" }}>FAQ</a>
              <button
                onClick={handleGetStarted}
                className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02]"
                style={{ backgroundColor: "#8B7355" }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center px-6 pt-12 pb-24 overflow-hidden"
        style={{ backgroundColor: "#F8F1E6" }}
        itemScope
        itemType="https://schema.org/Service"
      >
        <meta itemProp="name" content="Unwrapt - Automatic Gift Scheduling Service" />
        <meta itemProp="serviceType" content="Automatic gift scheduling and delivery" />
        <meta itemProp="description" content="Premium gift scheduling service with smart reminders, personalized gift ideas, and automatic delivery" />

        {/* Background product image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <motion.img
            src={ceramicCollection}
            alt=""
            aria-hidden="true"
            className="w-[700px] md:w-[900px] max-w-none opacity-[0.07] object-cover rounded-full blur-[2px]"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.07, scale: 1 }}
            transition={{ duration: 1.5, delay: 2.4, ease: "easeOut" }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[880px] mx-auto">
          <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.2, ease: "easeOut" }}
          >
            {/* Eyebrow */}
            <p
              className="text-xs uppercase tracking-[0.35em] mb-8"
              style={{ color: "#B59A77" }}
            >
              Your Personal Gifting Concierge
            </p>

            {/* Hero Headline */}
            <h1
              className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] tracking-tight leading-[1.05] mb-8"
              style={{ color: "#3D3428" }}
              itemProp="headline"
            >
              Never Miss
              <br />
              <span style={{ color: "#8B7355" }}>a Moment</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl leading-relaxed max-w-lg mb-12"
              style={{ color: "#6B5D4D" }}
              itemProp="description"
            >
              Tell us who matters most. We'll handle the perfect gift,
              every time, delivered right on time.
            </p>

            {/* CTA */}
            <button
              onClick={handleGetStarted}
              className="group px-12 py-4 rounded-full font-medium text-lg text-white transition-all duration-300 hover:scale-[1.02] mb-16"
              style={{
                backgroundColor: "#8B7355",
                boxShadow: "0 8px 32px rgba(139, 115, 85, 0.25)",
              }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2 inline transition-transform group-hover:translate-x-1" />
            </button>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4 sm:gap-5 w-full max-w-lg">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="flex flex-col items-center py-6 px-3 rounded-2xl backdrop-blur-sm"
                  style={{
                    backgroundColor: "rgba(248, 241, 230, 0.7)",
                    boxShadow: "0 2px 16px rgba(139, 115, 85, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
                    border: "1px solid rgba(228, 220, 210, 0.6)",
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 2.6 + i * 0.12, ease: "easeOut" }}
                >
                  <stat.icon className="w-5 h-5 mb-3" style={{ color: "#B59A77" }} strokeWidth={1.5} />
                  <span className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight" style={{ color: "#3D3428" }}>
                    {stat.value}
                  </span>
                  <span className="text-[11px] sm:text-xs text-center mt-1 tracking-wide" style={{ color: "#8B7355" }}>
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Scroll indicator */}
            <motion.a
              href="#pricing"
              className="mt-12 opacity-40 hover:opacity-80 transition-opacity"
              aria-label="Scroll down"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </motion.a>
          </motion.div>
        </div>

        {/* Hidden SEO Content */}
        <div className="sr-only" itemProp="offers" itemScope itemType="https://schema.org/Offer">
          <meta itemProp="price" content="0" />
          <meta itemProp="priceCurrency" content="USD" />
        </div>
      </section>

      {/* Section divider */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #D4C4A8, transparent)" }} />

      {/* Gifting Scenes Scroll Section */}
      <GiftingScenesScroll />

      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #D4C4A8, transparent)" }} />

      {/* Animated Gifting Journey Section */}
      <AnimatedGiftingJourney />

      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #D4C4A8, transparent)" }} />

      {/* Luxury Gift Showcase Section */}
      <LuxuryGiftShowcase />

      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #D4C4A8, transparent)" }} />

      {/* Pricing Section */}
      <PricingSection />

      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #D4C4A8, transparent)" }} />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA */}
      <section className="py-32 px-6" style={{ backgroundColor: "#F8F1E6" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.35em] mb-6" style={{ color: "#B59A77" }}>
            Ready?
          </p>
          <h2 className="font-serif text-4xl md:text-5xl mb-6" style={{ color: "#3D3428" }}>
            Set up your gifting concierge
            <br />
            <span style={{ color: "#8B7355" }}>in 2 minutes</span>
          </h2>
          <p className="text-base mb-10 max-w-md mx-auto" style={{ color: "#6B5D4D" }}>
            Add your people, connect your calendar, and let Unwrapt handle the rest.
          </p>
          <button
            onClick={handleGetStarted}
            className="group px-12 py-4 rounded-full font-medium text-lg text-white transition-all duration-300 hover:scale-[1.02]"
            style={{
              backgroundColor: "#8B7355",
              boxShadow: "0 8px 32px rgba(139, 115, 85, 0.25)",
            }}
          >
            Get Started Free <ArrowRight className="w-5 h-5 ml-2 inline transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6" style={{ borderTop: "1px solid #E8DCC8", backgroundColor: "#F3EDE4" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-8">
            <Logo size="md" />
            <div className="flex gap-8 text-sm" style={{ color: "#8B7355" }}>
              <Link to="/privacy" className="hover:underline underline-offset-4 transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:underline underline-offset-4 transition-colors">
                Terms
              </Link>
              <a href="mailto:support@unwrapt.io" className="hover:underline underline-offset-4 transition-colors">
                Contact
              </a>
            </div>
            <p className="text-xs" style={{ color: "#B59A77" }}>
              © 2026 Unwrapt. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
