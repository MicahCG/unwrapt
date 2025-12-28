import React, { useState, useEffect } from 'react';
import { Clock, Heart, Gift } from 'lucide-react';

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

  const slide = ONBOARDING_SLIDES[index];

  // Use localhost when in development, production URL otherwise
  const getAppUrl = () => {
    return window.location.hostname === 'localhost'
      ? 'http://localhost:8080'
      : 'https://app.unwrapt.io';
  };

  // Typewriter effect
  useEffect(() => {
    setTypedText('');
    setIsTypingDone(false);
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

  // Auto-advance after typing is done
  useEffect(() => {
    if (!isTypingDone) return;
    
    const timeout = setTimeout(() => {
      if (index < ONBOARDING_SLIDES.length - 1) {
        setIndex(index + 1);
      } else {
        // On last slide, auto-advance to onboarding
        handleGetStarted();
      }
    }, 2500);
    
    return () => clearTimeout(timeout);
  }, [isTypingDone, index]);

  const handleSkip = () => {
    // Mark as seen and redirect to app subdomain
    localStorage.setItem('hasSeenIntro', 'true');
    window.location.href = getAppUrl();
  };

  const handleGetStarted = () => {
    // Mark as seen and proceed to onboarding
    localStorage.setItem('hasSeenIntro', 'true');
    onComplete();
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

      </div>
    </div>
  );
};

export default OnboardingIntro;
