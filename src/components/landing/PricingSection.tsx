import React from "react";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const freeFeatures = [
  "Up to 3 recipients",
  "Manual gift scheduling",
  "Curated gift catalog access",
  "Birthday and occasion reminders",
];

const vipFeatures = [
  "Unlimited recipients",
  "Fully automated gifting",
  "Smart calendar sync",
  "Gift wallet with auto-reload",
  "Priority gift selection",
  "14-day advance gift preview",
];

const PricingSection = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <section id="pricing" className="py-28 px-6 scroll-mt-20" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="max-w-4xl mx-auto">
        <h2
          className="font-serif text-4xl md:text-5xl text-center mb-4 tracking-tight"
          style={{ color: "#8B7355" }}
        >
          Simple, Transparent Pricing
        </h2>
        <p
          className="text-center text-lg mb-16 max-w-xl mx-auto"
          style={{ color: "#8B7355", opacity: 0.8 }}
        >
          Start free. Upgrade when you're ready to automate everything.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl p-8 flex flex-col">
            <h3 className="font-serif text-2xl mb-1" style={{ color: "#8B7355" }}>
              Free
            </h3>
            <p className="text-sm mb-6" style={{ color: "#8B7355", opacity: 0.7 }}>
              Perfect for getting started
            </p>
            <div className="mb-8">
              <span className="font-serif text-4xl" style={{ color: "#8B7355" }}>
                $0
              </span>
              <span className="text-sm ml-1" style={{ color: "#8B7355", opacity: 0.6 }}>
                /month
              </span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#D4AF7A" }} />
                  <span className="text-sm" style={{ color: "#8B7355" }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                localStorage.setItem("shouldShowOnboardingIntro", "true");
                signInWithGoogle();
              }}
              className="w-full py-3 rounded-full font-medium text-sm border transition-all duration-300 hover:scale-[1.02]"
              style={{
                borderColor: "#D4AF7A",
                color: "#8B7355",
                backgroundColor: "transparent",
              }}
            >
              Get Started Free
            </button>
          </div>

          {/* VIP Tier */}
          <div
            className="relative border rounded-2xl p-8 flex flex-col"
            style={{
              backgroundColor: "rgba(212, 175, 122, 0.12)",
              borderColor: "#D4AF7A",
            }}
          >
            <div
              className="absolute -top-3 left-8 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
              style={{ backgroundColor: "#D4AF7A", color: "#fff" }}
            >
              <Sparkles className="w-3 h-3" /> Most Popular
            </div>
            <h3 className="font-serif text-2xl mb-1" style={{ color: "#8B7355" }}>
              VIP
            </h3>
            <p className="text-sm mb-6" style={{ color: "#8B7355", opacity: 0.7 }}>
              Set it and forget it
            </p>
            <div className="mb-2">
              <span className="font-serif text-4xl" style={{ color: "#8B7355" }}>
                $4.99
              </span>
              <span className="text-sm ml-1" style={{ color: "#8B7355", opacity: 0.6 }}>
                /month
              </span>
            </div>
            <p className="text-xs mb-8" style={{ color: "#8B7355", opacity: 0.6 }}>
              Less than the cost of one late apology gift
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              {vipFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#D4AF7A" }} />
                  <span className="text-sm" style={{ color: "#8B7355" }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                localStorage.setItem("shouldShowOnboardingIntro", "true");
                signInWithGoogle();
              }}
              className="w-full py-3 rounded-full font-medium text-sm text-white transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: "#D4AF7A",
                boxShadow: "0 4px 14px rgba(212, 175, 122, 0.25)",
              }}
            >
              Start VIP
            </button>
          </div>
        </div>

        {/* Gift price range note */}
        <p
          className="text-center text-sm mt-10"
          style={{ color: "#8B7355", opacity: 0.6 }}
        >
          Gifts range from $25 to $75. You only pay for gifts when they ship.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
