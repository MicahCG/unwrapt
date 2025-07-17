import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ onComplete }) => {
  const { data: profile } = useUserProfile();
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const fullText = `Welcome back, ${firstName}`;

  useEffect(() => {
    let currentIndex = 0;
    const typewriterInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        // Start fade out after text is complete + small delay
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(onComplete, 500); // Wait for fade out animation
        }, 1000);
      }
    }, 80); // Typewriter speed

    return () => clearInterval(typewriterInterval);
  }, [fullText, onComplete]);

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
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-brand-charcoal tracking-tight">
          {displayedText}
          <span className="animate-pulse">|</span>
        </h1>
      </div>
    </div>
  );
};

export default WelcomeOverlay;