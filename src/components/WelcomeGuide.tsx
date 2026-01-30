import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Calendar, Sparkles, ChevronRight, X, Heart, Clock, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeGuideProps {
  userName?: string;
  onAddRecipient: () => void;
  onDismiss: () => void;
}

const WELCOME_STEPS = [
  {
    icon: Gift,
    title: "Add someone special",
    description: "Start by adding a recipient—a friend, family member, or anyone you want to remember.",
    action: "Add First Recipient",
  },
  {
    icon: Calendar,
    title: "Set their important dates",
    description: "Enter birthdays, anniversaries, or any occasion worth celebrating.",
    action: null,
  },
  {
    icon: Wand2,
    title: "We handle the rest",
    description: "Unwrapt curates the perfect gift and delivers it on time. You just show up as the hero.",
    action: null,
  },
];

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ 
  userName, 
  onAddRecipient,
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const firstName = userName?.split(' ')[0] || 'there';

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissal in localStorage
    localStorage.setItem('welcomeGuideDismissed', 'true');
    onDismiss();
  };

  const handleAddRecipient = () => {
    onAddRecipient();
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-[#FAF8F3] to-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.08)] relative overflow-hidden">
          {/* Subtle decorative element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D2B887]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70 transition-colors z-10"
            aria-label="Dismiss welcome guide"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6 relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#D2B887]" />
              <span className="text-sm font-medium text-[#D2B887] uppercase tracking-wide">
                Getting Started
              </span>
            </div>
            <h2 className="text-2xl font-display text-[#1A1A1A] mb-1">
              Welcome, {firstName}!
            </h2>
            <p className="text-[#1A1A1A]/60 text-sm">
              Let's set up your first recipient in under a minute.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            {WELCOME_STEPS.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (index + 1), duration: 0.3 }}
                className={`flex items-start gap-4 p-3 rounded-xl ${
                  index === 0 
                    ? 'bg-[#D2B887]/10 border border-[#D2B887]/30' 
                    : 'bg-white/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  index === 0 
                    ? 'bg-[#D2B887] text-white' 
                    : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/40'
                }`}>
                  <step.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${
                    index === 0 ? 'text-[#1A1A1A]' : 'text-[#1A1A1A]/50'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`text-sm ${
                    index === 0 ? 'text-[#1A1A1A]/70' : 'text-[#1A1A1A]/40'
                  }`}>
                    {step.description}
                  </p>
                </div>
                {index === 0 && (
                  <ChevronRight className="w-5 h-5 text-[#D2B887] flex-shrink-0 mt-2" />
                )}
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <Button
              onClick={handleAddRecipient}
              className="w-full bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A] font-medium py-3 rounded-xl"
              size="lg"
            >
              <Gift className="w-5 h-5 mr-2" />
              Add Your First Recipient
            </Button>
          </motion.div>

          {/* Value proposition footer */}
          <div className="mt-4 pt-4 border-t border-[#E4DCD2] flex items-center justify-center gap-6 text-xs text-[#1A1A1A]/50">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>2-min setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              <span>Curated gifts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Never miss a date</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeGuide;
