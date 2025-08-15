
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

  // Generate confetti pieces with more variety and dynamic start positions
  const confettiPieces = Array.from({ length: 80 }, (_, i) => {
    const shapes = ['square', 'circle', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = 2 + Math.random() * 4; // 2-6px size variation
    const colors = [
      'hsl(45, 93%, 70%)', // gold
      'hsl(120, 60%, 50%)', // green  
      'hsl(210, 100%, 60%)', // blue
      'hsl(0, 84%, 60%)', // red
      'hsl(270, 50%, 60%)', // purple
      'hsl(25, 90%, 55%)', // orange
      'hsl(300, 70%, 60%)', // magenta
      'hsl(180, 70%, 50%)', // cyan
    ];
    
    return (
      <div
        key={i}
        className={`absolute transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        style={{
          left: `${Math.random() * 100}%`,
          top: `${-50 - Math.random() * 100}px`, // Start from different heights above screen
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: `${Math.random() * 2}s`, // Reduced delay for more immediate action
          animationDuration: `${3 + Math.random() * 4}s`, // 3-7s variation
          animationName: 'confettiFall',
          animationTimingFunction: 'ease-in',
          animationIterationCount: 'infinite',
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          borderRadius: shape === 'circle' ? '50%' : shape === 'triangle' ? '0' : '2px',
          transform: shape === 'triangle' ? 'rotate(45deg)' : 'none',
          clipPath: shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
        }}
      />
    );
  });

  return (
    <>
      <style>
        {`
          @keyframes confettiFall {
            0% {
              transform: translateY(-20vh) rotate(0deg) scale(1);
              opacity: 1;
            }
            15% {
              opacity: 1;
              transform: translateY(10vh) rotate(180deg) scale(1.1);
            }
            50% {
              opacity: 0.8;
              transform: translateY(50vh) rotate(360deg) scale(0.9);
            }
            100% {
              transform: translateY(120vh) rotate(720deg) scale(0.7);
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
