import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Calendar, Users, Gift, CheckCircle2 } from 'lucide-react';

const AnimatedGiftingJourney = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const steps = [
    {
      number: "01",
      icon: Users,
      title: "Tell us who matters most",
      description: "We map the important people in your life — family, friends, clients — and remember their special dates for you.",
    },
    {
      number: "02",
      icon: Calendar,
      title: "We fetch every important date",
      description: "Birthdays, anniversaries, milestones… automatically pulled from your contacts, calendar, or added manually.",
    },
    {
      number: "03",
      icon: Gift,
      title: "We curate meaningful gifts",
      description: "Handmade, rare, and carefully selected items that feel personal — not mass-produced.",
    },
    {
      number: "04",
      icon: CheckCircle2,
      title: "Everything is scheduled for you",
      description: "We prepare, schedule, and send each gift at the perfect time, with your approval every step of the way.",
    },
  ];

  useEffect(() => {
    const unsubscribe = smoothProgress.on('change', (latest) => {
      // Map progress to steps: 0-0.25 = step 0, 0.25-0.5 = step 1, etc.
      const step = Math.floor(latest * 4);
      setCurrentStep(Math.min(step, 3));
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[300vh] px-6 bg-gradient-to-b from-[hsl(var(--soft-almond))]/30 to-[hsl(var(--champagne))]"
      itemScope
      itemType="https://schema.org/HowTo"
    >
      {/* Sticky Container */}
      <div className="sticky top-0 h-screen flex items-center justify-center">
        <div className="max-w-6xl w-full mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2
              className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))]"
              itemProp="name"
            >
              Your Gifting Journey, Unwrapped
            </h2>
          </div>

          {/* Main Content - Centered */}
          <div className="max-w-2xl mx-auto">
            <div className="relative min-h-[400px] flex items-center justify-center">
              <div className="relative w-full">
                {steps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{
                      opacity: currentStep === idx ? 1 : 0,
                      y: currentStep === idx ? 0 : 30,
                      pointerEvents: currentStep === idx ? 'auto' : 'none',
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    itemProp="step"
                    itemScope
                    itemType="https://schema.org/HowToStep"
                  >
                    <meta itemProp="position" content={String(idx + 1)} />

                    {/* Step Number Badge */}
                    <div className="text-sm font-medium text-[hsl(var(--soft-gold))] tracking-[0.3em] mb-8 uppercase">
                      Step {step.number}
                    </div>

                    {/* Icon Circle */}
                    <motion.div
                      className="w-24 h-24 mb-10 rounded-full flex items-center justify-center border-2"
                      style={{
                        backgroundColor: 'hsl(var(--soft-gold))',
                        borderColor: 'hsl(var(--warm-gold))',
                        boxShadow: '0 8px 32px hsl(var(--soft-gold))/30'
                      }}
                      animate={{
                        scale: [1, 1.08, 1],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <step.icon
                        className="w-12 h-12"
                        style={{
                          color: 'hsl(var(--espresso))'
                        }}
                      />
                    </motion.div>

                    {/* Step Title */}
                    <h3
                      className="font-serif text-4xl md:text-5xl text-[hsl(var(--warm-brown))] mb-6 leading-tight"
                      itemProp="name"
                    >
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p
                      className="text-lg text-[hsl(var(--warm-brown))] opacity-80 leading-relaxed max-w-lg mx-auto"
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
          <div className="text-center mt-12">
            <div className="flex items-center justify-center gap-3">
              {steps.map((_, idx) => (
                <motion.div
                  key={idx}
                  className="h-2 rounded-full"
                  animate={{
                    width: currentStep === idx ? 48 : 8,
                    backgroundColor: currentStep >= idx
                      ? 'hsl(var(--soft-gold))'
                      : 'hsl(var(--soft-gold) / 0.2)',
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
