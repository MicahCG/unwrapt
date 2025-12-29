import React, { useState, useEffect } from 'react';
import { Clock, Heart, Gift, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingIntroProps {
  onComplete: () => void;
}

const ONBOARDING_SLIDES = [
  {
    id: 1,
    icon: 'clock',
    headline: 'Life moves fast.',
    body: "Between work, family, and everything in between, it's easy to lose track of the moments that matter most."
  },
  {
    id: 2,
    icon: 'heart',
    headline: "But the people you love shouldn't fade into the background.",
    body: "Birthdays, anniversaries, and quiet milestones deserve to be remembered, celebrated, and felt — not rushed or forgotten."
  },
  {
    id: 3,
    icon: 'gift',
    headline: 'Unwrapt remembers, so they always feel cherished.',
    body: "We quietly track the important dates, curate beautiful gifts, and schedule everything for you — so showing up thoughtfully feels effortless."
  }
];

const OnboardingIntro: React.FC<OnboardingIntroProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCalendarButton, setShowCalendarButton] = useState(false);

  const slide = ONBOARDING_SLIDES[index];
  const isLastSlide = index === ONBOARDING_SLIDES.length - 1;

  // Typewriter effect
  useEffect(() => {
    setTypedText('');
    setIsTypingDone(false);
    setShowCalendarButton(false);
    const full = slide.headline;
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      setTypedText(full.slice(0, current));
      if (current === full.length) {
        clearInterval(interval);
        setIsTypingDone(true);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [index, slide.headline]);

  // Auto-advance after typing is done (except on last slide)
  useEffect(() => {
    if (!isTypingDone) return;
    
    if (isLastSlide) {
      // On last slide, show the calendar button after a short delay
      const buttonTimeout = setTimeout(() => {
        setShowCalendarButton(true);
      }, 800);
      return () => clearTimeout(buttonTimeout);
    }
    
    // Auto-advance to next slide
    const timeout = setTimeout(() => {
      setIndex(index + 1);
    }, 2500);
    
    return () => clearTimeout(timeout);
  }, [isTypingDone, index, isLastSlide]);

  const handleSkip = () => {
    // Mark as seen and proceed to onboarding (skip calendar connect)
    localStorage.setItem('hasSeenIntro', 'true');
    onComplete();
  };

  const connectGoogleCalendar = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        setIsConnecting(false);
        return;
      }

      // Store that we're in the onboarding calendar flow
      sessionStorage.setItem('calendarOAuthFlow', 'onboarding');

      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { 
          action: 'get_auth_url',
          redirectPath: '/'  // Redirect back to home after OAuth
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      setIsConnecting(false);
    }
  };

  const handleConnectCalendar = () => {
    connectGoogleCalendar();
  };

  const renderIcon = () => {
    const iconProps = { size: 28, strokeWidth: 1.5 };
    switch (slide.icon) {
      case 'clock':
        return <Clock {...iconProps} />;
      case 'heart':
        return <Heart {...iconProps} />;
      case 'gift':
        return <Gift {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className={`onb-root onb-bg-${index + 1}`}>
      <div className="onb-card">
        <button className="onb-skip" onClick={handleSkip}>
          Skip intro
        </button>

        <div className="onb-icon-circle">
          <span className="onb-icon">
            {renderIcon()}
          </span>
        </div>

        <h1 className="onb-headline">
          <span>{typedText}</span>
          <span className="onb-cursor">{isTypingDone ? ' ' : '|'}</span>
        </h1>

        <p className={`onb-body ${isTypingDone ? 'onb-body-visible' : ''}`}>
          {slide.body}
        </p>

        <div className="onb-dots">
          {ONBOARDING_SLIDES.map((s, i) => (
            <span
              key={s.id}
              className={`onb-dot ${i === index ? 'onb-dot-active' : ''}`}
            />
          ))}
        </div>

        {/* Calendar connect button on last slide */}
        {isLastSlide && showCalendarButton && (
          <div className="mt-8 animate-fade-in space-y-3">
            <Button
              size="lg"
              className="w-full text-lg py-6 bg-brand-gold text-white hover:bg-brand-gold/90 transition-colors"
              onClick={handleConnectCalendar}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-3" />
                  Connect Google Calendar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-brand-charcoal/70 hover:text-brand-charcoal hover:bg-transparent"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default OnboardingIntro;
