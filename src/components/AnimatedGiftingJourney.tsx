import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Calendar, Users, Gift, CheckCircle2 } from 'lucide-react';

const AnimatedGiftingJourney = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
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
      const step = Math.floor(latest * 5);
      setCurrentStep(Math.min(step, 4));
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // Calculate gift box unwrap stage based on current step
  const getBoxTransform = () => {
    switch (currentStep) {
      case 0:
        return { rotation: 0, lidOpen: 0, opacity: 1 };
      case 1:
        return { rotation: 2, lidOpen: 5, opacity: 0.95 };
      case 2:
        return { rotation: 4, lidOpen: 15, opacity: 0.9 };
      case 3:
        return { rotation: 6, lidOpen: 35, opacity: 0.85 };
      case 4:
        return { rotation: 8, lidOpen: 60, opacity: 0.8 };
      default:
        return { rotation: 0, lidOpen: 0, opacity: 1 };
    }
  };

  const boxTransform = getBoxTransform();

  return (
    <section
      ref={containerRef}
      className="relative py-32 px-6 bg-gradient-to-b from-[hsl(var(--soft-almond))]/30 to-[hsl(var(--champagne))]"
      itemScope
      itemType="https://schema.org/HowTo"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-24">
          <h2 
            className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] mb-4"
            itemProp="name"
          >
            Your Gifting Journey, Unwrapped
          </h2>
          <p className="text-lg text-[hsl(var(--charcoal-body))] max-w-2xl mx-auto">
            How Your Gifts Are Thoughtfully Scheduled
          </p>
        </div>

        {/* Timeline and Steps Container */}
        <div className="relative">
          {/* Horizontal Timeline */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-[hsl(var(--soft-gold))]/20">
            <motion.div
              className="h-full bg-gradient-to-r from-[hsl(var(--soft-gold))] to-[hsl(var(--warm-gold))]"
              style={{
                width: useTransform(smoothProgress, [0, 1], ['0%', '100%'])
              }}
            />
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-12 mb-24">
            {steps.map((step, idx) => {
              const isActive = currentStep > idx;
              const isCurrent = currentStep === idx + 1;
              
              return (
                <motion.div
                  key={idx}
                  className="relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  itemProp="step"
                  itemScope
                  itemType="https://schema.org/HowToStep"
                >
                  <meta itemProp="position" content={String(idx + 1)} />
                  
                  {/* Icon Circle */}
                  <motion.div
                    className="relative w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center border-2 transition-all duration-500"
                    style={{
                      backgroundColor: isActive ? 'hsl(var(--soft-gold))' : 'white',
                      borderColor: isActive ? 'hsl(var(--warm-gold))' : 'hsl(var(--soft-gold))/30',
                      scale: isCurrent ? 1.15 : 1,
                      boxShadow: isActive ? '0 8px 24px hsl(var(--soft-gold))/25' : 'none'
                    }}
                  >
                    <step.icon 
                      className="w-7 h-7 transition-colors duration-500"
                      style={{
                        color: isActive ? 'hsl(var(--espresso))' : 'hsl(var(--soft-gold))'
                      }}
                    />
                  </motion.div>

                  {/* Step Number */}
                  <div className="text-xs font-medium text-[hsl(var(--soft-gold))] text-center mb-3 tracking-widest">
                    {step.number}
                  </div>

                  {/* Step Content */}
                  <h3 
                    className="font-serif text-xl text-[hsl(var(--espresso))] text-center mb-3 leading-snug"
                    itemProp="name"
                  >
                    {step.title}
                  </h3>
                  <p 
                    className="text-sm text-[hsl(var(--charcoal-body))] text-center leading-relaxed"
                    itemProp="text"
                  >
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Gift Box Unwrapping Animation */}
          <motion.div
            className="relative w-64 h-64 mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, hsl(var(--soft-gold))/${boxTransform.opacity * 0.3} 0%, transparent 70%)`,
                scale: 1 + (currentStep * 0.1),
              }}
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Gift Box Base */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                rotate: boxTransform.rotation,
              }}
            >
              <div className="relative w-48 h-48">
                {/* Box Body */}
                <motion.div
                  className="absolute inset-x-8 bottom-0 h-32 rounded-sm"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--warm-gold)) 0%, hsl(var(--soft-gold)) 100%)',
                    boxShadow: '0 20px 40px hsl(var(--espresso))/10'
                  }}
                />

                {/* Vertical Ribbon */}
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 top-8 w-4 h-32 rounded-sm"
                  style={{
                    background: 'linear-gradient(180deg, hsl(var(--espresso)) 0%, hsl(var(--charcoal-body)) 100%)',
                  }}
                />

                {/* Horizontal Ribbon */}
                <motion.div
                  className="absolute top-1/2 left-8 right-8 h-4 rounded-sm"
                  style={{
                    background: 'linear-gradient(90deg, hsl(var(--espresso)) 0%, hsl(var(--charcoal-body)) 100%)',
                    rotate: boxTransform.lidOpen * 0.5,
                    transformOrigin: 'center',
                  }}
                  animate={{
                    y: currentStep > 2 ? -10 : 0,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />

                {/* Box Lid */}
                <motion.div
                  className="absolute inset-x-8 top-8 h-12 rounded-sm"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--warm-gold)) 0%, hsl(var(--soft-gold)) 50%, hsl(var(--warm-gold)) 100%)',
                    boxShadow: '0 10px 30px hsl(var(--espresso))/15',
                    transformOrigin: 'bottom',
                  }}
                  animate={{
                    rotateX: -boxTransform.lidOpen,
                    y: -boxTransform.lidOpen * 0.8,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />

                {/* Inner Glow (visible when opening) */}
                {currentStep >= 3 && (
                  <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, hsl(var(--soft-gold))/60 0%, transparent 70%)',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                )}

                {/* Bow on Top */}
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 top-2 w-12 h-8"
                  animate={{
                    y: -boxTransform.lidOpen * 1.2,
                    rotate: boxTransform.lidOpen * 0.3,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {/* Left bow loop */}
                  <div
                    className="absolute left-0 top-0 w-5 h-6 rounded-full border-4"
                    style={{
                      borderColor: 'hsl(var(--espresso))',
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                      transform: 'rotate(-45deg)',
                    }}
                  />
                  {/* Right bow loop */}
                  <div
                    className="absolute right-0 top-0 w-5 h-6 rounded-full border-4"
                    style={{
                      borderColor: 'hsl(var(--espresso))',
                      borderLeftColor: 'transparent',
                      borderBottomColor: 'transparent',
                      transform: 'rotate(45deg)',
                    }}
                  />
                  {/* Bow center knot */}
                  <div
                    className="absolute left-1/2 top-1 -translate-x-1/2 w-3 h-3 rounded-full"
                    style={{
                      background: 'hsl(var(--espresso))',
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Subtle sparkle particles */}
            {currentStep === 4 && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      background: 'hsl(var(--soft-gold))',
                      left: '50%',
                      top: '50%',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                      x: [0, (Math.cos(i * 60 * Math.PI / 180) * 80)],
                      y: [0, (Math.sin(i * 60 * Math.PI / 180) * 80)],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>

          {/* Progress Indicator */}
          <div className="text-center mt-12">
            <p className="text-sm text-[hsl(var(--charcoal-body))]/60 tracking-wide">
              Step {Math.min(currentStep, 4)} of 4
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedGiftingJourney;
