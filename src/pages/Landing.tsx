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
import { VIP_WEB_PRICE_LABEL } from "@/seo/site";

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
      <section id="about" className="scroll-mt-24 px-6 py-24 md:py-28" style={{ backgroundColor: "#F8F1E6" }}>
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#8B7355]">About</p>
          <h2 className="font-serif text-4xl tracking-tight text-[#3D3428] md:text-5xl">
            For the dates you mean to keep
          </h2>
          <p className="mt-6 text-base leading-relaxed text-[#3D3428] md:text-lg">
            Unwrapt is for people who want birthdays handled before the last minute. You save who matters. Thea suggests a gift and checks with you before it is purchased.
          </p>
          <p className="mt-4 text-base leading-relaxed text-[#6B5D4D]">
            {`VIP is ${VIP_WEB_PRICE_LABEL} a month on the web. Gifts are priced separately and ship to a street address in the United States.`}
          </p>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-[#3D3428]">
            <li>
              <Link to="/how-it-works" className="underline decoration-[#D2B887] underline-offset-4">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="underline decoration-[#D2B887] underline-offset-4">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/faq" className="underline decoration-[#D2B887] underline-offset-4">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/guides/never-forget-birthdays" className="underline decoration-[#D2B887] underline-offset-4">
                Birthday guide
              </Link>
            </li>
          </ul>
        </div>
      </section>
      <Divider />
      <PricingSection onCtaClick={() => trackCta("pricing")} />
      <Divider />
      <FAQSection />
      <FinalCta onCtaClick={() => trackCta("final")} />
    </PublicChrome>
  );
};

export default Landing;
