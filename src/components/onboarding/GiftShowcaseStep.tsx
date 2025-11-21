import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Wine, Coffee, Heart, Sparkles, Package } from 'lucide-react';

interface GiftShowcaseStepProps {
  onComplete: () => void;
}

const GIFT_OPTIONS = [
  {
    id: 1,
    name: 'Premium Wine',
    image: 'https://images.unsplash.com/photo-1482938289607-e9573fc25ebb?w=600&h=600&fit=crop',
    icon: Wine,
    description: 'Curated selections from around the world'
  },
  {
    id: 2,
    name: 'Artisan Coffee',
    image: 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=600&h=600&fit=crop',
    icon: Coffee,
    description: 'Small-batch roasts for coffee lovers'
  },
  {
    id: 3,
    name: 'Luxury Tea',
    image: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&h=600&fit=crop',
    icon: Sparkles,
    description: 'Premium blends from tea gardens'
  },
  {
    id: 4,
    name: 'Sweet Treats',
    image: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=600&h=600&fit=crop',
    icon: Heart,
    description: 'Handcrafted chocolates and confections'
  },
  {
    id: 5,
    name: 'Self Care',
    image: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=600&h=600&fit=crop',
    icon: Sparkles,
    description: 'Spa-quality pampering essentials'
  },
  {
    id: 6,
    name: 'Luxury Candles',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop',
    icon: Package,
    description: 'Hand-poured with premium fragrances'
  }
];

const GiftShowcaseStep: React.FC<GiftShowcaseStepProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    // Show title for 2 seconds, then start carousel
    const titleTimer = setTimeout(() => {
      setShowTitle(false);
    }, 2000);

    return () => clearTimeout(titleTimer);
  }, []);

  useEffect(() => {
    if (!showTitle) {
      // Carousel interval - 800ms per gift
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= GIFT_OPTIONS.length) {
            // All gifts shown, complete after a short delay
            setTimeout(() => {
              onComplete();
            }, 1000);
            return prevIndex;
          }
          return nextIndex;
        });
      }, 800);

      return () => clearInterval(interval);
    }
  }, [showTitle, onComplete]);

  const currentGift = GIFT_OPTIONS[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-cream via-brand-cream to-brand-charcoal/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {showTitle ? (
            <motion.div
              key="title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                className="inline-block mb-6 p-6 bg-white/80 backdrop-blur-sm rounded-full shadow-lg"
              >
                <Sparkles className="h-16 w-16 text-brand-charcoal" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-4xl md:text-5xl font-bold text-brand-charcoal leading-tight"
              >
                Time to become the most
                <br />
                <span className="bg-gradient-to-r from-brand-charcoal to-brand-charcoal/60 bg-clip-text text-transparent">
                  thoughtful person you know
                </span>
              </motion.h1>
            </motion.div>
          ) : (
            <motion.div
              key="carousel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="overflow-hidden bg-white/90 backdrop-blur-md border-none shadow-2xl">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Image Side */}
                    <div className="relative h-64 md:h-96 overflow-hidden bg-gradient-to-br from-brand-charcoal/5 to-brand-charcoal/10">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentGift.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.1 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0"
                        >
                          <img
                            src={currentGift.image}
                            alt={currentGift.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Content Side */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentGift.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.5 }}
                          className="space-y-6"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: "spring" }}
                            className="inline-block p-4 bg-brand-charcoal/10 rounded-full"
                          >
                            <currentGift.icon className="h-10 w-10 text-brand-charcoal" />
                          </motion.div>

                          <div>
                            <motion.h2
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="text-3xl md:text-4xl font-bold text-brand-charcoal mb-3"
                            >
                              {currentGift.name}
                            </motion.h2>
                            <motion.p
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="text-lg text-brand-charcoal/70"
                            >
                              {currentGift.description}
                            </motion.p>
                          </div>

                          {/* Progress Dots */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex gap-2 pt-4"
                          >
                            {GIFT_OPTIONS.map((_, index) => (
                              <div
                                key={index}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  index === currentIndex
                                    ? 'w-8 bg-brand-charcoal'
                                    : index < currentIndex
                                    ? 'w-2 bg-brand-charcoal/40'
                                    : 'w-2 bg-brand-charcoal/20'
                                }`}
                              />
                            ))}
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GiftShowcaseStep;
