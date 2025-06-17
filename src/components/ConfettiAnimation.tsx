
import React, { useEffect, useState } from 'react';

interface ConfettiAnimationProps {
  isActive: boolean;
  duration?: number;
}

const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ 
  isActive, 
  duration = 3000 
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (!showConfetti) return null;

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className="absolute w-3 h-3 opacity-100 animate-bounce"
      style={{
        left: `${Math.random() * 100}%`,
        top: '-10px',
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
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
