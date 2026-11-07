import { useEffect } from "react";
import { Link } from "react-router-dom";
import LandingHero from "@/components/landing/LandingHero";
import TheaStory from "@/components/landing/TheaStory";
import FinalCta from "@/components/landing/FinalCta";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import SEOHead from "@/components/seo/SEOHead";
import { PublicChrome } from "@/components/marketing/PublicChrome";
import { trackProductEvent } from "@/lib/productAnalytics";

const Divider = () => (
  <div
    className="h-px w-full"
    style={{ background: "linear-gradient(90deg, transparent, #D2B887, transparent)" }}
  />
);

const Landing = () => {
  useEffect(() => {
    localStorage.setItem("hasSeenIntro", "true");
  }, []);

  const trackCta = (placement: string) => {
    void trackProductEvent("landing_cta_clicked", { placement });
  };

  return (
    <PublicChrome overlay>
      <SEOHead
        title="Thea remembers birthdays and helps send gifts"
        description="Unwrapt helps you remember birthdays and send a gift before the last minute. Thea suggests a gift, you approve the purchase, and it ships in the United States."
        path="/"
      />
      <LandingHero onCtaClick={() => trackCta("hero")} />
      <Divider />
      <TheaStory />
      <Divider />
      <PricingSection onCtaClick={() => trackCta("pricing")} />
      <Divider />
      <FAQSection />
      <section className="px-6 py-16" style={{ backgroundColor: "#F8F1E6" }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif text-3xl text-[#3D3428] md:text-4xl">Keep reading</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#6B5D4D]">
            The short version is on this page. The longer answers live on their own URLs, with the same facts.
          </p>
          <ul className="mt-8 flex flex-col items-center gap-3 text-[#3D3428]">
            <li>
              <Link to="/how-it-works" className="underline decoration-[#D2B887] underline-offset-4">
                How Unwrapt and Thea send a gift
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="underline decoration-[#D2B887] underline-offset-4">
                What VIP costs, and what the gift costs
              </Link>
            </li>
            <li>
              <Link to="/faq" className="underline decoration-[#D2B887] underline-offset-4">
                Delivery, approval, and cancellation
              </Link>
            </li>
            <li>
              <Link to="/guides/never-forget-birthdays" className="underline decoration-[#D2B887] underline-offset-4">
                How to stop forgetting birthdays
              </Link>
            </li>
          </ul>
        </div>
      </section>
      <FinalCta onCtaClick={() => trackCta("final")} />
    </PublicChrome>
  );
};

export default Landing;
