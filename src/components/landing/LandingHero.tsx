import React from "react";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import PaperDust from "@/components/landing/PaperDust";

const softEase = [0.22, 1, 0.36, 1] as const;

type LandingHeroProps = {
  primaryCta: string;
  onGetStarted: () => void;
};

const LandingHero: React.FC<LandingHeroProps> = ({
  primaryCta,
  onGetStarted,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative min-h-[100svh] flex items-center justify-center overflow-hidden px-6 pt-24 pb-20"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 35%, #FFF9F0 0%, #F8F1E6 45%, #F0E6D6 100%)",
      }}
      itemScope
      itemType="https://schema.org/Service"
    >
      <meta itemProp="name" content="Unwrapt - Automatic Gift Scheduling Service" />
      <meta itemProp="serviceType" content="Automatic gift scheduling and delivery" />
      <meta
        itemProp="description"
        content="Premium gift scheduling service with smart reminders, personalized gift ideas, and automatic delivery"
      />

      {!reduceMotion && <PaperDust density={22} />}

      <div className="relative z-10 mx-auto w-full max-w-[920px]">
        <div className="flex flex-col items-center text-center">
          <motion.p
            className="mb-6 font-serif text-3xl tracking-tight sm:text-4xl md:text-5xl"
            style={{ color: "#3D3428" }}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.05, ease: softEase }}
          >
            Unwrapt
          </motion.p>

          <motion.h1
            className="font-serif text-5xl tracking-tight sm:text-6xl md:text-7xl lg:text-[5.75rem] leading-[1.02] mb-6"
            style={{ color: "#3D3428" }}
            itemProp="headline"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: softEase }}
          >
            Never Miss
            <br />
            <span style={{ color: "#8B7355" }}>a Moment</span>
          </motion.h1>

          <motion.p
            className="mb-10 max-w-md text-base leading-relaxed md:text-lg"
            style={{ color: "#6B5D4D" }}
            itemProp="description"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: softEase }}
          >
            Tell us who matters most. We&apos;ll handle the perfect gift, every
            time, delivered right on time.
          </motion.p>

          <motion.button
            type="button"
            onClick={onGetStarted}
            className="group mb-14 rounded-full px-12 py-4 text-lg font-medium text-white transition-transform duration-500 hover:-translate-y-0.5 active:scale-[0.97]"
            style={{
              backgroundColor: "#8B7355",
              boxShadow: "0 8px 32px rgba(139, 115, 85, 0.25)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.42, ease: softEase }}
          >
            {primaryCta}
            <ArrowRight className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>

          <a
            href="#journey"
            className="text-xs tracking-[0.28em] uppercase opacity-45 transition-opacity hover:opacity-80"
            style={{ color: "#8B7355" }}
            aria-label="Scroll to how Unwrapt works"
          >
            Scroll
          </a>
        </div>
      </div>

      <div className="sr-only" itemProp="offers" itemScope itemType="https://schema.org/Offer">
        <meta itemProp="price" content="0" />
        <meta itemProp="priceCurrency" content="USD" />
      </div>
    </section>
  );
};

export default LandingHero;
