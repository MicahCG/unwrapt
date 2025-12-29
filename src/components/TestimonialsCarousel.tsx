import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = [
  {
    quote:
      "Unwrapt has saved me countless hours and strengthened my client relationships. It's like having a personal concierge.",
    author: "Sarah M.",
    role: "Management Consultant",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
  {
    quote:
      "I never realized how much I was missing until Unwrapt started handling my gifting. Game changer for my team culture.",
    author: "David L.",
    role: "Tech Founder",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    quote:
      "The perfect solution for busy professionals. Every gift feels personal and arrives exactly when it should.",
    author: "Michelle R.",
    role: "Partner at Law Firm",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
  {
    quote:
      "My clients are always impressed. Unwrapt makes me look thoughtful without the stress of remembering every detail.",
    author: "James K.",
    role: "Financial Advisor",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  },
];

const TestimonialsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-32 px-6" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="max-w-4xl mx-auto">
        <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] text-center mb-16">
          Loved by Professionals
        </h2>

        {/* Carousel Container */}
        <div className="relative min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-2xl p-10 text-center"
            >
              <p className="text-lg md:text-xl text-[hsl(var(--charcoal-body))] italic mb-8 leading-relaxed max-w-2xl mx-auto">
                "{testimonials[currentIndex].quote}"
              </p>
              <div className="flex items-center justify-center gap-4">
                <img
                  src={testimonials[currentIndex].avatar}
                  alt={testimonials[currentIndex].author}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/60"
                />
                <div className="text-left">
                  <div className="font-medium text-[hsl(var(--espresso))]">
                    {testimonials[currentIndex].author}
                  </div>
                  <div className="text-sm text-[hsl(var(--charcoal-body))]">
                    {testimonials[currentIndex].role}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Thumbnail Indicators */}
        <div className="flex justify-center gap-4 mt-8">
          {testimonials.map((testimonial, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative transition-all duration-300 ${
                currentIndex === idx
                  ? "scale-110"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={testimonial.avatar}
                alt={testimonial.author}
                className={`w-12 h-12 rounded-full object-cover border-2 transition-all duration-300 ${
                  currentIndex === idx
                    ? "border-[hsl(var(--soft-gold))]"
                    : "border-white/40"
                }`}
              />
              {currentIndex === idx && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "hsl(var(--soft-gold))" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
