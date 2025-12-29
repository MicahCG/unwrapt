import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Calendar, Users, Gift, CheckCircle2 } from "lucide-react";

const AnimatedGiftingJourney = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

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
        "Birthdays, anniversaries, milestones. Automatically pulled from your contacts, calendar, or added manually.",
    },
    {
      number: "03",
      icon: Gift,
      title: "We curate meaningful gifts",
      description: "Handmade, rare, and carefully selected items that feel personal, not mass-produced.",
    },
    {
      number: "04",
      icon: CheckCircle2,
      title: "Everything is scheduled for you",
      description:
        "We prepare, schedule, and send each gift at the perfect time, with your approval every step of the way.",
    },
  ];

  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (latest) => {
      // Map progress to steps: 0-0.25 = step 0, 0.25-0.5 = step 1, etc.
      const step = Math.floor(latest * 4);
      setCurrentStep(Math.min(step, 3));
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[300vh] px-6"
      style={{ backgroundColor: "#F8F1E6" }}
      itemScope
      itemType="https://schema.org/HowTo"
    >
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen flex items-center justify-center py-12">
        {/* Floating Card Container */}
        <div
          className="max-w-4xl w-full mx-auto rounded-[32px] p-12 md:p-16"
          style={{
            backgroundColor: "#F8F1E6",
            border: "1px solid #E8DCC8",
            boxShadow: "0 24px 72px rgba(139, 115, 85, 0.20)",
          }}
        >
          {/* Section Header */}
          <div className="text-center mb-10">
            <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))]" itemProp="name">
              Your Gifting Journey, <span className="text-[hsl(var(--warm-brown))]">Unwrapt</span>
            </h2>
          </div>

          {/* Main Content - Centered */}
          <div className="max-w-2xl mx-auto">
            <div className="relative min-h-[320px] flex items-center justify-center">
              <div className="relative w-full">
                {steps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{
                      opacity: currentStep === idx ? 1 : 0,
                      y: currentStep === idx ? 0 : 30,
                      pointerEvents: currentStep === idx ? "auto" : "none",
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    itemProp="step"
                    itemScope
                    itemType="https://schema.org/HowToStep"
                  >
                    <meta itemProp="position" content={String(idx + 1)} />

                    {/* Step Number Badge */}
                    <div className="text-sm font-medium tracking-[0.3em] mb-6 uppercase" style={{ color: "#8B7355" }}>
                      Step {step.number}
                    </div>

                    {/* Icon Circle */}
                    <motion.div
                      className="w-16 h-16 mb-8 rounded-full flex items-center justify-center border"
                      style={{
                        backgroundColor: "#F3EDE4",
                        borderColor: "#E8DCC8",
                      }}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <step.icon
                        className="w-7 h-7"
                        style={{
                          color: "#8B7355",
                        }}
                      />
                    </motion.div>

                    {/* Step Title */}
                    <h3
                      className="font-serif text-3xl md:text-4xl mb-4 leading-tight"
                      style={{ color: "#3D3428" }}
                      itemProp="name"
                    >
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p
                      className="text-base leading-relaxed max-w-md mx-auto"
                      style={{ color: "#6B5D4D" }}
                      itemProp="text"
                    >
                      {step.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="text-center mt-8">
            <div className="flex items-center justify-center gap-3">
              {steps.map((_, idx) => (
                <motion.div
                  key={idx}
                  className="h-2 rounded-full"
                  animate={{
                    width: currentStep === idx ? 48 : 8,
                    backgroundColor: currentStep >= idx ? "#D4AF7A" : "rgba(212, 175, 122, 0.2)",
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedGiftingJourney;
