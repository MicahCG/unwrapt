import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Calendar, CheckCircle2, Gift, Heart, Users } from "lucide-react";
import HeroGiftCanvasLazy from "@/components/landing/HeroGiftCanvasLazy";

const softEase = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    number: "01",
    icon: Users,
    title: "Tell us who matters most",
    description:
      "We map the important people in your life: family, friends, clients. We remember their special dates for you.",
  },
  {
    number: "02",
    icon: Calendar,
    title: "We fetch every important date",
    description:
      "Birthdays, anniversaries, milestones — pulled from your calendar or added once, kept warm every year.",
  },
  {
    number: "03",
    icon: Gift,
    title: "We curate meaningful gifts",
    description:
      "Handmade, rare, carefully selected pieces that feel personal — not mass-produced.",
  },
  {
    number: "04",
    icon: CheckCircle2,
    title: "You approve. We deliver on time.",
    description:
      "Nothing ships without you. We prepare, schedule, and send with your say at every step.",
  },
];

const trustStats = [
  { icon: Heart, value: "Always", label: "Moments remembered" },
  { icon: Calendar, value: "< 1 min", label: "Typical approval" },
  { icon: Gift, value: "You decide", label: "Before anything ships" },
];

/**
 * Pinned scroll chapter: people → dates → curate → approve,
 * with scroll-linked gift lid reveal (P1 + P2).
 */
const PinnedJourney: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNarrow, setIsNarrow] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    restDelta: 0.001,
  });

  const revealProgress = useTransform(smoothProgress, [0.15, 0.92], [0, 1]);
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    return revealProgress.on("change", (v) => setReveal(v));
  }, [revealProgress]);

  useEffect(() => {
    return smoothProgress.on("change", (latest) => {
      const step = Math.min(3, Math.floor(latest * 4));
      setCurrentStep(step);
    });
  }, [smoothProgress]);

  // Mobile / reduced-motion: static stacked list, no pin scrub
  if (isNarrow || reduceMotion) {
    return (
      <section
        id="journey"
        className="px-6 py-24"
        style={{ backgroundColor: "#F8F1E6" }}
        itemScope
        itemType="https://schema.org/HowTo"
      >
        <div className="mx-auto max-w-3xl text-center mb-14">
          <p className="mb-4 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
            How it works
          </p>
          <h2 className="font-serif text-4xl" style={{ color: "#3D3428" }} itemProp="name">
            Your gifting journey, <span style={{ color: "#8B7355" }}>Unwrapt</span>
          </h2>
        </div>
        <ol className="mx-auto max-w-xl space-y-10">
          {steps.map((step) => (
            <li key={step.number} className="text-center" itemProp="step" itemScope itemType="https://schema.org/HowToStep">
              <p className="mb-3 text-sm tracking-[0.3em]" style={{ color: "#8B7355" }}>
                {step.number}
              </p>
              <h3 className="mb-2 font-serif text-2xl" style={{ color: "#3D3428" }} itemProp="name">
                {step.title}
              </h3>
              <p className="text-base leading-relaxed" style={{ color: "#6B5D4D" }} itemProp="text">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-4">
          {trustStats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon className="mx-auto mb-2 h-4 w-4" style={{ color: "#B59A77" }} strokeWidth={1.5} />
              <p className="font-serif text-xl" style={{ color: "#3D3428" }}>{s.value}</p>
              <p className="text-[11px]" style={{ color: "#8B7355" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="journey"
      ref={containerRef}
      className="relative h-[420vh]"
      style={{ backgroundColor: "#F8F1E6" }}
      itemScope
      itemType="https://schema.org/HowTo"
    >
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* Gift sculpture — scroll-linked unwrap */}
          <div className="relative mx-auto h-[42vh] w-full max-w-md lg:h-[58vh] lg:max-w-none">
            <HeroGiftCanvasLazy
              className="h-full w-full"
              revealProgress={reveal}
              active
            />
            <div
              className="pointer-events-none absolute inset-x-8 bottom-0 h-24"
              style={{
                background:
                  "linear-gradient(180deg, transparent, rgba(248,241,230,0.9))",
              }}
            />
          </div>

          {/* Story + pager */}
          <div className="relative min-h-[280px]">
            <p className="mb-3 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
              How it works
            </p>
            <h2
              className="mb-8 font-serif text-3xl md:text-4xl"
              style={{ color: "#3D3428" }}
              itemProp="name"
            >
              We unwrap the work{" "}
              <span style={{ color: "#8B7355" }}>for you</span>
            </h2>

            <div className="relative min-h-[200px]">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.number}
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    opacity: currentStep === idx ? 1 : 0,
                    y: currentStep === idx ? 0 : 18,
                    pointerEvents: currentStep === idx ? "auto" : "none",
                  }}
                  transition={{ duration: 0.55, ease: softEase }}
                  itemProp="step"
                  itemScope
                  itemType="https://schema.org/HowToStep"
                >
                  <meta itemProp="position" content={String(idx + 1)} />
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="font-serif text-sm tracking-[0.2em]"
                      style={{ color: "#8B7355" }}
                    >
                      {step.number}
                    </span>
                    <step.icon className="h-5 w-5" style={{ color: "#B59A77" }} strokeWidth={1.5} />
                  </div>
                  <h3
                    className="mb-3 font-serif text-2xl md:text-3xl leading-snug"
                    style={{ color: "#3D3428" }}
                    itemProp="name"
                  >
                    {step.title}
                  </h3>
                  <p
                    className="max-w-md text-base leading-relaxed"
                    style={{ color: "#6B5D4D" }}
                    itemProp="text"
                  >
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Vertical pager */}
            <div className="mt-10 flex items-center gap-4" aria-hidden="true">
              <div className="flex flex-col gap-2">
                {steps.map((s, idx) => (
                  <span
                    key={s.number}
                    className="font-serif text-sm transition-opacity duration-300"
                    style={{
                      color: "#8B7355",
                      opacity: currentStep === idx ? 1 : 0.28,
                    }}
                  >
                    {s.number}
                  </span>
                ))}
              </div>
              <div className="relative h-28 w-px overflow-hidden" style={{ backgroundColor: "rgba(212,175,122,0.25)" }}>
                <motion.div
                  className="absolute left-0 w-px"
                  style={{ height: "25%", backgroundColor: "#D4AF7A" }}
                  animate={{ top: `${currentStep * 25}%` }}
                  transition={{ duration: 0.45, ease: softEase }}
                />
              </div>
            </div>

            {/* Trust strip — moved out of hero */}
            <div className="mt-12 flex flex-wrap gap-8 border-t pt-8" style={{ borderColor: "rgba(232,220,200,0.8)" }}>
              {trustStats.map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-xl" style={{ color: "#3D3428" }}>{s.value}</p>
                  <p className="text-xs tracking-wide" style={{ color: "#8B7355" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PinnedJourney;
