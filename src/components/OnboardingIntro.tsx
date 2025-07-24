import React, { useState, useEffect } from 'react';

interface OnboardingIntroProps {
  onComplete: () => void;
}

const OnboardingIntro: React.FC<OnboardingIntroProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  
  const [isVisible, setIsVisible] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  const screens = [
    "Life is busy.",
    "Special moments get missed.",
    "We make gifting easy for you."
  ];

  useEffect(() => {
    if (isCompleting || currentScreen >= screens.length) {
      return;
    }

    const currentText = screens[currentScreen];
    let currentIndex = 0;
    setDisplayedText('');

    const typewriterInterval = setInterval(() => {
      if (currentIndex < currentText.length) {
        setDisplayedText(currentText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        
        // If this is the last screen, complete after a brief pause
        if (currentScreen === screens.length - 1) {
          setTimeout(() => {
            setIsCompleting(true);
            setIsVisible(false);
            setTimeout(onComplete, 500);
          }, 1200);
        } else {
          // Move to next screen after text completion + pause
          const pauseTime = currentScreen === 0 ? 1000 : 2000;
          setTimeout(() => {
            setCurrentScreen(prev => prev + 1);
          }, pauseTime);
        }
      }
    }, 60);

    return () => clearInterval(typewriterInterval);
  }, [currentScreen, onComplete, isCompleting]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="text-center max-w-2xl px-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-brand-charcoal tracking-tight leading-tight whitespace-pre-line">
          {displayedText}
          <span className="animate-pulse">|</span>
        </h1>
      </div>
    </div>
  );
};

export default OnboardingIntro;