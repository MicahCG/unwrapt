import React, { useState, useEffect } from 'react';

interface OnboardingIntroProps {
  onComplete: () => void;
}

const OnboardingIntro: React.FC<OnboardingIntroProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [showEffortlessly, setShowEffortlessly] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const screens = [
    "Life is busy.",
    "Special moments get missed.",
    "We help you plan gifts they'll never forget."
  ];

  useEffect(() => {
    if (currentScreen >= screens.length) {
      // All screens completed, fade out and show registration
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500); // Wait for fade out animation
      }, 1500);
      return;
    }

    const currentText = screens[currentScreen];
    let currentIndex = 0;
    setDisplayedText('');
    setShowEffortlessly(false);

    const typewriterInterval = setInterval(() => {
      if (currentIndex < currentText.length) {
        setDisplayedText(currentText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        
        // If this is the last screen, show "Effortlessly" after a brief pause
        if (currentScreen === screens.length - 1) {
          setTimeout(() => {
            setShowEffortlessly(true);
          }, 800);
          
          // Then move to completion after showing "Effortlessly"
          setTimeout(() => {
            setCurrentScreen(prev => prev + 1);
          }, 3000);
        } else {
          // Move to next screen after text completion + pause
          const pauseTime = currentScreen === 0 ? 1000 : 2000;
          setTimeout(() => {
            setCurrentScreen(prev => prev + 1);
          }, pauseTime);
        }
      }
    }, 60); // Typewriter speed

    return () => clearInterval(typewriterInterval);
  }, [currentScreen]);

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
        {currentScreen === screens.length - 1 && (
          <div className={`mt-8 transition-opacity duration-1000 ${showEffortlessly ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-charcoal tracking-tight">
              Effortlessly.
            </h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingIntro;