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

  // Calculate gift box unwrap stage based on current step
  const getBoxTransform = () => {
    switch (currentStep) {
      case 0:
        return { rotation: 0, lidOpen: 0, ribbonLoose: 0, glowIntensity: 0.3 };
      case 1:
        return { rotation: 3, lidOpen: 15, ribbonLoose: 10, glowIntensity: 0.5 };
      case 2:
        return { rotation: 5, lidOpen: 40, ribbonLoose: 25, glowIntensity: 0.7 };
      case 3:
        return { rotation: 8, lidOpen: 70, ribbonLoose: 45, glowIntensity: 1 };
      default:
        return { rotation: 0, lidOpen: 0, ribbonLoose: 0, glowIntensity: 0.3 };
    }
  };

  const boxTransform = getBoxTransform();

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
              className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] mb-4"
              itemProp="name"
            >
              Your Gifting Journey, Unwrapped
            </h2>
            <p className="text-lg text-[hsl(var(--charcoal-body))] max-w-2xl mx-auto">
              Scroll to reveal each step
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Side: Gift Box Animation */}
            <div className="relative h-[500px] flex items-center justify-center">
              <motion.div
                className="relative w-80 h-80"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-full blur-3xl"
                  style={{
                    background: `radial-gradient(circle, hsl(var(--soft-gold))/${boxTransform.glowIntensity * 0.4} 0%, transparent 70%)`,
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Gift Box */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{
                    rotate: boxTransform.rotation,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ perspective: '1200px' }}
                >
                  <div className="relative" style={{ width: '220px', height: '240px', transformStyle: 'preserve-3d' }}>
                    {/* Box Body - Left Side Panel (3D depth) */}
                    <motion.div
                      className="absolute"
                      style={{
                        left: '20px',
                        bottom: '30px',
                        width: '20px',
                        height: '140px',
                        background: 'linear-gradient(90deg, #C9A870 0%, #B89660 100%)',
                        borderRadius: '4px 0 0 4px',
                        boxShadow: 'inset -3px 0 8px rgba(0,0,0,0.2)',
                      }}
                    >
                      {/* Side panel texture */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 3px,
                            rgba(0,0,0,0.02) 3px,
                            rgba(0,0,0,0.02) 6px
                          )`,
                        }}
                      />
                    </motion.div>

                    {/* Box Body - Main Front Face */}
                    <motion.div
                      className="absolute"
                      style={{
                        left: '40px',
                        bottom: '30px',
                        width: '150px',
                        height: '140px',
                        background: 'linear-gradient(135deg, #F0D4A8 0%, #E6C896 25%, #D4AF7A 60%, #C9A870 100%)',
                        borderRadius: '2px',
                        boxShadow: '0 25px 50px rgba(107, 84, 68, 0.25), inset -3px -3px 12px rgba(0,0,0,0.08), inset 2px 2px 8px rgba(255,255,255,0.1)',
                      }}
                    >
                      {/* Paper texture overlay */}
                      <div
                        className="absolute inset-0 rounded"
                        style={{
                          background: `
                            repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 8px,
                              rgba(255,255,255,0.02) 8px,
                              rgba(255,255,255,0.02) 16px
                            ),
                            repeating-linear-gradient(
                              -45deg,
                              transparent,
                              transparent 8px,
                              rgba(0,0,0,0.01) 8px,
                              rgba(0,0,0,0.01) 16px
                            )
                          `,
                        }}
                      />
                      {/* Light reflection */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1/3 rounded-t"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                        }}
                      />
                      {/* Shadow gradient */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2/3 rounded-b"
                        style={{
                          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.08) 100%)',
                        }}
                      />
                      {/* Corner highlights */}
                      <div
                        className="absolute top-1 left-1 w-8 h-8 rounded-tl"
                        style={{
                          background: 'radial-gradient(circle at top left, rgba(255,255,255,0.2) 0%, transparent 70%)',
                        }}
                      />
                    </motion.div>

                    {/* Box Body - Right Side Panel (3D depth) */}
                    <motion.div
                      className="absolute"
                      style={{
                        right: '30px',
                        bottom: '30px',
                        width: '18px',
                        height: '140px',
                        background: 'linear-gradient(270deg, #B89660 0%, #C9A870 100%)',
                        borderRadius: '0 4px 4px 0',
                        boxShadow: 'inset 3px 0 8px rgba(0,0,0,0.25)',
                      }}
                    >
                      {/* Side panel texture */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 3px,
                            rgba(0,0,0,0.03) 3px,
                            rgba(0,0,0,0.03) 6px
                          )`,
                        }}
                      />
                    </motion.div>

                    {/* Box Lid - Top Surface */}
                    <motion.div
                      className="absolute"
                      style={{
                        left: '28px',
                        top: '28px',
                        width: '164px',
                        height: '54px',
                        background: 'linear-gradient(135deg, #F0D4A8 0%, #E6C896 20%, #D4AF7A 55%, #C9A870 90%, #B89660 100%)',
                        borderRadius: '4px',
                        boxShadow: '0 18px 40px rgba(107, 84, 68, 0.3), inset -2px -2px 10px rgba(0,0,0,0.1), inset 2px 2px 6px rgba(255,255,255,0.15)',
                        transformOrigin: 'bottom center',
                        transformStyle: 'preserve-3d',
                      }}
                      animate={{
                        rotateX: -boxTransform.lidOpen,
                        y: -boxTransform.lidOpen * 0.6,
                        z: boxTransform.lidOpen * 0.5,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      {/* Paper texture */}
                      <div
                        className="absolute inset-0 rounded"
                        style={{
                          background: `
                            repeating-linear-gradient(
                              50deg,
                              transparent,
                              transparent 9px,
                              rgba(255,255,255,0.03) 9px,
                              rgba(255,255,255,0.03) 18px
                            ),
                            repeating-linear-gradient(
                              -50deg,
                              transparent,
                              transparent 9px,
                              rgba(0,0,0,0.015) 9px,
                              rgba(0,0,0,0.015) 18px
                            )
                          `,
                        }}
                      />
                      {/* Top surface highlight */}
                      <div
                        className="absolute inset-0 rounded"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%, rgba(0,0,0,0.05) 100%)',
                        }}
                      />
                      {/* Specular highlight */}
                      <div
                        className="absolute top-2 left-4 w-16 h-8 rounded-full"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 70%)',
                          filter: 'blur(4px)',
                        }}
                      />
                      {/* Lid rim/edge - thicker and more detailed */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-3 rounded-b"
                        style={{
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.25) 100%)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      />
                      {/* Lid edge highlight strip */}
                      <div
                        className="absolute bottom-2.5 left-0 right-0 h-0.5"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                        }}
                      />
                    </motion.div>

                    {/* Vertical Ribbon */}
                    <motion.div
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '26px',
                        width: '26px',
                        height: '146px',
                        marginLeft: '-13px',
                        background: 'linear-gradient(90deg, #3A2D22 0%, #4A3D32 15%, #6B5444 50%, #4A3D32 85%, #3A2D22 100%)',
                        borderRadius: '3px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.4), inset 2px 0 4px rgba(255,255,255,0.12), inset -2px 0 4px rgba(0,0,0,0.2)',
                        zIndex: 5,
                      }}
                      animate={{
                        opacity: currentStep >= 2 ? 0.2 : 1,
                        scaleY: currentStep >= 2 ? 1.1 : 1,
                        y: boxTransform.ribbonLoose * 0.5,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      {/* Fabric texture */}
                      <div
                        className="absolute inset-0 rounded"
                        style={{
                          background: `
                            repeating-linear-gradient(
                              0deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.03) 1px,
                              rgba(0,0,0,0.03) 2px
                            )
                          `,
                        }}
                      />
                      {/* Center highlight stripe */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-2 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                        }}
                      />
                      {/* Left edge shadow */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l"
                        style={{
                          background: 'linear-gradient(90deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
                        }}
                      />
                      {/* Right edge shadow */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 rounded-r"
                        style={{
                          background: 'linear-gradient(270deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
                        }}
                      />
                      {/* Satin sheen effect */}
                      <div
                        className="absolute left-2 top-0 bottom-0 w-1 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.15) 100%)',
                        }}
                      />
                    </motion.div>

                    {/* Horizontal Ribbon */}
                    <motion.div
                      className="absolute"
                      style={{
                        left: '28px',
                        top: '93px',
                        width: '164px',
                        height: '26px',
                        background: 'linear-gradient(180deg, #3A2D22 0%, #4A3D32 15%, #6B5444 50%, #4A3D32 85%, #3A2D22 100%)',
                        borderRadius: '3px',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.12), inset 0 -2px 4px rgba(0,0,0,0.2)',
                        transformOrigin: 'center',
                        zIndex: 4,
                      }}
                      animate={{
                        rotate: boxTransform.ribbonLoose * 0.5,
                        y: -boxTransform.ribbonLoose * 0.3,
                        opacity: currentStep >= 2 ? 0.2 : 1,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      {/* Fabric texture */}
                      <div
                        className="absolute inset-0 rounded"
                        style={{
                          background: `
                            repeating-linear-gradient(
                              90deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.03) 1px,
                              rgba(0,0,0,0.03) 2px
                            )
                          `,
                        }}
                      />
                      {/* Center highlight stripe */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 rounded-full"
                        style={{
                          background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                        }}
                      />
                      {/* Top edge shadow */}
                      <div
                        className="absolute left-0 right-0 top-0 h-1.5 rounded-t"
                        style={{
                          background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
                        }}
                      />
                      {/* Bottom edge shadow */}
                      <div
                        className="absolute left-0 right-0 bottom-0 h-1.5 rounded-b"
                        style={{
                          background: 'linear-gradient(0deg, rgba(0,0,0,0.25) 0%, transparent 100%)',
                        }}
                      />
                      {/* Satin sheen effect */}
                      <div
                        className="absolute left-0 right-0 top-2 h-1 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 100%)',
                        }}
                      />
                    </motion.div>

                    {/* Bow on Top */}
                    <motion.div
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '8px',
                        marginLeft: '-40px',
                        width: '80px',
                        height: '60px',
                        zIndex: 10,
                        filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))',
                      }}
                      animate={{
                        y: -boxTransform.lidOpen * 0.8,
                        rotate: boxTransform.lidOpen * 0.3,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      {/* Left bow loop */}
                      <div
                        className="absolute"
                        style={{
                          left: '-2px',
                          top: '10px',
                          width: '32px',
                          height: '32px',
                          background: 'radial-gradient(ellipse at 35% 35%, #7A6655 0%, #6B5444 40%, #4A3D32 100%)',
                          borderRadius: '50% 0 55% 50%',
                          transform: 'rotate(-50deg)',
                          boxShadow: 'inset -2px -2px 6px rgba(0,0,0,0.4), inset 1px 1px 3px rgba(255,255,255,0.1)',
                        }}
                      >
                        {/* Loop inner shadow for depth */}
                        <div
                          className="absolute inset-1 rounded-full"
                          style={{
                            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)',
                          }}
                        />
                        {/* Fabric texture on loop */}
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.04) 1px,
                              rgba(0,0,0,0.04) 2px
                            )`,
                          }}
                        />
                      </div>

                      {/* Right bow loop */}
                      <div
                        className="absolute"
                        style={{
                          right: '-2px',
                          top: '10px',
                          width: '32px',
                          height: '32px',
                          background: 'radial-gradient(ellipse at 65% 35%, #7A6655 0%, #6B5444 40%, #4A3D32 100%)',
                          borderRadius: '0 50% 50% 55%',
                          transform: 'rotate(50deg)',
                          boxShadow: 'inset 2px -2px 6px rgba(0,0,0,0.4), inset -1px 1px 3px rgba(255,255,255,0.1)',
                        }}
                      >
                        {/* Loop inner shadow for depth */}
                        <div
                          className="absolute inset-1 rounded-full"
                          style={{
                            background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)',
                          }}
                        />
                        {/* Fabric texture on loop */}
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `repeating-linear-gradient(
                              -45deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.04) 1px,
                              rgba(0,0,0,0.04) 2px
                            )`,
                          }}
                        />
                      </div>

                      {/* Bow center knot */}
                      <div
                        className="absolute"
                        style={{
                          left: '50%',
                          top: '18px',
                          marginLeft: '-12px',
                          width: '24px',
                          height: '24px',
                          background: 'radial-gradient(circle at 40% 40%, #7A6655 0%, #6B5444 35%, #4A3D32 80%, #3A2D22 100%)',
                          borderRadius: '50%',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.15)',
                        }}
                      >
                        {/* Knot highlight */}
                        <div
                          className="absolute top-1 left-1 w-3 h-3 rounded-full"
                          style={{
                            background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
                          }}
                        />
                        {/* Fabric texture on knot */}
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `repeating-linear-gradient(
                              60deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.05) 1px,
                              rgba(0,0,0,0.05) 2px
                            )`,
                          }}
                        />
                      </div>

                      {/* Left ribbon tail */}
                      <div
                        className="absolute"
                        style={{
                          left: '18px',
                          top: '38px',
                          width: '14px',
                          height: '24px',
                          background: 'linear-gradient(180deg, #6B5444 0%, #5A4536 50%, #4A3D32 100%)',
                          borderRadius: '2px 2px 7px 7px',
                          transform: 'rotate(-8deg)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset 1px 0 2px rgba(255,255,255,0.1), inset -1px 0 2px rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Tail center highlight */}
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1"
                          style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                          }}
                        />
                        {/* Fabric texture */}
                        <div
                          className="absolute inset-0 rounded"
                          style={{
                            background: `repeating-linear-gradient(
                              0deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.04) 1px,
                              rgba(0,0,0,0.04) 2px
                            )`,
                          }}
                        />
                      </div>

                      {/* Right ribbon tail */}
                      <div
                        className="absolute"
                        style={{
                          right: '18px',
                          top: '38px',
                          width: '14px',
                          height: '24px',
                          background: 'linear-gradient(180deg, #6B5444 0%, #5A4536 50%, #4A3D32 100%)',
                          borderRadius: '2px 2px 7px 7px',
                          transform: 'rotate(8deg)',
                          boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset -1px 0 2px rgba(255,255,255,0.1), inset 1px 0 2px rgba(0,0,0,0.2)',
                        }}
                      >
                        {/* Tail center highlight */}
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1"
                          style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                          }}
                        />
                        {/* Fabric texture */}
                        <div
                          className="absolute inset-0 rounded"
                          style={{
                            background: `repeating-linear-gradient(
                              0deg,
                              transparent,
                              transparent 1px,
                              rgba(0,0,0,0.04) 1px,
                              rgba(0,0,0,0.04) 2px
                            )`,
                          }}
                        />
                      </div>
                    </motion.div>

                    {/* Inner Glow (visible when opening) */}
                    {currentStep >= 2 && (
                      <motion.div
                        className="absolute"
                        style={{
                          left: '50%',
                          top: '80px',
                          marginLeft: '-60px',
                          width: '120px',
                          height: '120px',
                          background: 'radial-gradient(circle, rgba(212, 175, 122, 0.8) 0%, rgba(212, 175, 122, 0.4) 40%, transparent 70%)',
                          borderRadius: '50%',
                          filter: 'blur(20px)',
                          zIndex: 3,
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                          opacity: boxTransform.glowIntensity * 0.8,
                          scale: 0.8 + (currentStep * 0.15)
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    )}
                  </div>
                </motion.div>

                {/* Sparkle particles */}
                {currentStep === 3 && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          background: 'hsl(var(--soft-gold))',
                          left: '50%',
                          top: '50%',
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1.5, 0],
                          x: [0, (Math.cos(i * 45 * Math.PI / 180) * 100)],
                          y: [0, (Math.sin(i * 45 * Math.PI / 180) * 100)],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeOut"
                        }}
                      />
                    ))}
                  </>
                )}
              </motion.div>
            </div>

            {/* Right Side: Step Content */}
            <div className="relative h-[500px] flex items-center">
              <div className="relative w-full">
                {steps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    className="absolute inset-0 flex flex-col justify-center"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{
                      opacity: currentStep === idx ? 1 : 0,
                      x: currentStep === idx ? 0 : 50,
                      pointerEvents: currentStep === idx ? 'auto' : 'none',
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    itemProp="step"
                    itemScope
                    itemType="https://schema.org/HowToStep"
                  >
                    <meta itemProp="position" content={String(idx + 1)} />

                    {/* Step Number Badge */}
                    <div className="inline-flex items-center gap-3 mb-6">
                      <div className="text-lg font-medium text-[hsl(var(--soft-gold))] tracking-widest">
                        {step.number}
                      </div>
                      <div className="h-px flex-1 bg-[hsl(var(--soft-gold))]/30" />
                    </div>

                    {/* Icon Circle */}
                    <motion.div
                      className="w-20 h-20 mb-8 rounded-full flex items-center justify-center border-2"
                      style={{
                        backgroundColor: 'hsl(var(--soft-gold))',
                        borderColor: 'hsl(var(--warm-gold))',
                        boxShadow: '0 8px 24px hsl(var(--soft-gold))/25'
                      }}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <step.icon
                        className="w-10 h-10"
                        style={{
                          color: 'hsl(var(--espresso))'
                        }}
                      />
                    </motion.div>

                    {/* Step Title */}
                    <h3
                      className="font-serif text-3xl md:text-4xl text-[hsl(var(--espresso))] mb-6 leading-tight"
                      itemProp="name"
                    >
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p
                      className="text-lg text-[hsl(var(--charcoal-body))] leading-relaxed max-w-md"
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
                      : 'hsl(var(--soft-gold))/20',
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              ))}
            </div>
            <p className="text-sm text-[hsl(var(--charcoal-body))]/60 tracking-wide mt-4">
              Step {currentStep + 1} of 4
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnimatedGiftingJourney;
