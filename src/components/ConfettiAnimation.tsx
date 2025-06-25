
import React, { useEffect, useState } from 'react';

interface ConfettiAnimationProps {
  isActive: boolean;
  duration?: number;
  startDelay?: number;
}

const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ 
  isActive, 
  duration = 3000,
  startDelay = 0
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isActive) {
      const startTimer = setTimeout(() => {
        setShowConfetti(true);
        setFadeOut(false);
        
        // Start fade out 500ms before the end
        const fadeTimer = setTimeout(() => {
          setFadeOut(true);
        }, duration - 500);

        // Hide completely after fade out
        const hideTimer = setTimeout(() => {
          setShowConfetti(false);
          setFadeOut(false);
        }, duration);

        return () => {
          clearTimeout(fadeTimer);
          clearTimeout(hideTimer);
        };
      }, startDelay);

      return () => clearTimeout(startTimer);
    }
  }, [isActive, duration, startDelay]);

  if (!showConfetti) return null;

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className={`absolute w-3 h-3 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{
        left: `${Math.random() * 100}%`,
        top: '-10px',
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${5 + Math.random() * 2}s`, // Slower falling (was 3 + Math.random() * 2)
        animationName: 'confettiFall',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        backgroundColor: [
          '#F4D03F', // gold
          '#52C41A', // green
          '#1890FF', // blue
          '#FF4D4F', // red
          '#722ED1', // purple
          '#FA8C16', // orange
        ][Math.floor(Math.random() * 6)],
      }}
    />
  ));

  return (
    <>
      <style>
        {`
          @keyframes confettiFall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}
      </style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {confettiPieces}
      </div>
    </>
  );
};

export default ConfettiAnimation;
