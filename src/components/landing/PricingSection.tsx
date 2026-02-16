import React from "react";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { motion } from "framer-motion";

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

  const handleGetStarted = () => {
    localStorage.setItem("shouldShowOnboardingIntro", "true");
    signInWithGoogle();
  };

  return (
    <section id="pricing" className="py-28 px-6 scroll-mt-20" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.35em] mb-4" style={{ color: "#B59A77" }}>
            Pricing
          </p>
          <h2 className="font-serif text-4xl md:text-5xl mb-4 tracking-tight" style={{ color: "#3D3428" }}>
            Simple, Transparent Pricing
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: "#6B5D4D" }}>
            Start free. Upgrade when you're ready to automate everything.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <motion.div
            className="rounded-2xl p-8 flex flex-col"
            style={{
              backgroundColor: "rgba(255,255,255,0.4)",
              border: "1px solid #E8DCC8",
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="font-serif text-2xl mb-1" style={{ color: "#3D3428" }}>
              Free
            </h3>
            <p className="text-sm mb-6" style={{ color: "#8B7355" }}>
              Perfect for getting started
            </p>
            <div className="mb-8">
              <span className="font-serif text-4xl" style={{ color: "#3D3428" }}>$0</span>
              <span className="text-sm ml-1" style={{ color: "#8B7355" }}>/month</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#B59A77" }} />
                  <span className="text-sm" style={{ color: "#4B3B2A" }}>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleGetStarted}
              className="w-full py-3 rounded-full font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
              style={{ border: "1px solid #8B7355", color: "#8B7355" }}
            >
              Get Started Free
            </button>
          </motion.div>

          {/* VIP Tier */}
          <motion.div
            className="relative rounded-2xl p-8 flex flex-col"
            style={{
              backgroundColor: "rgba(139, 115, 85, 0.08)",
              border: "1.5px solid #8B7355",
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div
              className="absolute -top-3 left-8 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 text-white"
              style={{ backgroundColor: "#8B7355" }}
            >
              <Sparkles className="w-3 h-3" /> Most Popular
            </div>
            <h3 className="font-serif text-2xl mb-1" style={{ color: "#3D3428" }}>VIP</h3>
            <p className="text-sm mb-6" style={{ color: "#8B7355" }}>Set it and forget it</p>
            <div className="mb-2">
              <span className="font-serif text-4xl" style={{ color: "#3D3428" }}>$4.99</span>
              <span className="text-sm ml-1" style={{ color: "#8B7355" }}>/month</span>
            </div>
            <p className="text-xs mb-8" style={{ color: "#B59A77" }}>
              Less than the cost of one late apology gift
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              {vipFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#8B7355" }} />
                  <span className="text-sm" style={{ color: "#4B3B2A" }}>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleGetStarted}
              className="w-full py-3 rounded-full font-medium text-sm text-white transition-all duration-300 hover:scale-[1.02]"
              style={{
                backgroundColor: "#8B7355",
                boxShadow: "0 4px 16px rgba(139, 115, 85, 0.3)",
              }}
            >
              Start VIP
            </button>
          </motion.div>
        </div>

        <p className="text-center text-sm mt-10" style={{ color: "#B59A77" }}>
          Gifts range from $25 to $75. You only pay for gifts when they ship.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
