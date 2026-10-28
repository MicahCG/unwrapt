import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/logo";
import LandingHero from "@/components/landing/LandingHero";
import PinnedJourney from "@/components/landing/PinnedJourney";
import OccasionPortal from "@/components/landing/OccasionPortal";
import LuxuryGiftShowcase from "@/components/LuxuryGiftShowcase";
import FinalCta from "@/components/landing/FinalCta";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import { useAuth } from "@/components/auth/AuthProvider";
import SEOHead from "@/components/seo/SEOHead";
import {
  getExperimentVariant,
  isExperimentEnabled,
  trackExperimentExposure,
} from "@/lib/experiments";
import { trackProductEvent } from "@/lib/productAnalytics";

const Divider = () => (
  <div
    className="h-px w-full"
    style={{ background: "linear-gradient(90deg, transparent, #D4C4A8, transparent)" }}
  />
);

const Landing = () => {
  const { signInWithGoogle } = useAuth();
  const [showNav, setShowNav] = useState(false);
  const [ctaVariant] = useState(() =>
    getExperimentVariant("landing_primary_cta_copy_v1"),
  );
  const ctaExperiment = isExperimentEnabled("landing_primary_cta_copy_v1")
    ? { key: "landing_primary_cta_copy_v1", variant: ctaVariant }
    : undefined;
  const primaryCta =
    ctaVariant === "plan_first_gift" ? "Plan My First Gift" : "Get Started Free";

  useEffect(() => {
    // Mark intro as seen so legacy gates do not re-trigger typewriter flows.
    localStorage.setItem("hasSeenIntro", "true");
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowNav(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    trackExperimentExposure("landing_primary_cta_copy_v1", ctaVariant);
  }, [ctaVariant]);

  const handleGetStarted = (placement: string) => {
    void trackProductEvent("landing_cta_clicked", { placement }, ctaExperiment);
    void trackProductEvent(
      "auth_started",
      { provider: "google", placement },
      ctaExperiment,
    );
    localStorage.setItem("shouldShowOnboardingIntro", "true");
    signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--ivory))]" style={{ color: "#4B3B2A" }}>
      <SEOHead
        title="Automatic Gift Scheduling & Thoughtful Gift Ideas"
        description="Never forget special occasions. Unwrapt automatically schedules and delivers personalized, premium gifts for birthdays, anniversaries, and holidays. Smart reminders, curated gifts, effortless planning."
        canonical="https://unwrapt.io/"
      />

      <nav className="fixed left-0 right-0 top-0 z-50">
        <div
          className={`border-b backdrop-blur-xl transition-colors duration-500 ${
            showNav
              ? "border-[hsl(var(--cream-border))] bg-white/80"
              : "border-transparent bg-[hsl(var(--ivory))]/70"
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Logo size="md" />
            <div className="flex items-center gap-8">
              <a
                href="#pricing"
                className="hidden text-sm tracking-wide transition-opacity hover:opacity-70 sm:inline"
                style={{ color: "#8B7355" }}
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="hidden text-sm tracking-wide transition-opacity hover:opacity-70 sm:inline"
                style={{ color: "#8B7355" }}
              >
                FAQ
              </a>
              <button
                type="button"
                onClick={() => handleGetStarted("navigation")}
                className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition-transform duration-500 hover:-translate-y-0.5 active:scale-[0.97]"
                style={{
                  backgroundColor: "#8B7355",
                  transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {ctaVariant === "plan_first_gift" ? "Plan a Gift" : "Get Started"}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <LandingHero
        primaryCta={primaryCta}
        onGetStarted={() => handleGetStarted("hero")}
      />

      <Divider />
      <PinnedJourney />
      <Divider />
      <OccasionPortal />
      <Divider />
      <LuxuryGiftShowcase />
      <Divider />
      <PricingSection ctaVariant={ctaVariant} experiment={ctaExperiment} />
      <Divider />
      <FAQSection />
      <FinalCta
        primaryCta={primaryCta}
        onGetStarted={() => handleGetStarted("final")}
      />

      <footer
        className="px-6 py-16"
        style={{ borderTop: "1px solid #E8DCC8", backgroundColor: "#F3EDE4" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8">
          <Logo size="md" />
          <div className="flex gap-8 text-sm" style={{ color: "#8B7355" }}>
            <Link to="/privacy" className="underline-offset-4 transition-colors hover:underline">
              Privacy
            </Link>
            <Link to="/terms" className="underline-offset-4 transition-colors hover:underline">
              Terms
            </Link>
            <a
              href="mailto:support@unwrapt.io"
              className="underline-offset-4 transition-colors hover:underline"
            >
              Contact
            </a>
          </div>
          <p className="text-xs" style={{ color: "#B59A77" }}>
            © 2026 Unwrapt. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
