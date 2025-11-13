import React, { useState, useEffect } from 'react';

export const LuxuryGiftBox = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isHovering) {
        const rect = document.getElementById('gift-box')?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
          const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
          setMousePosition({ x: x * 12, y: y * -12 });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovering]);

  return (
    <div 
      id="gift-box"
      className="relative w-full max-w-md mx-auto"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMousePosition({ x: 0, y: 0 });
      }}
    >
      {/* Vignette glow behind box */}
      <div className="absolute inset-0 bg-gradient-radial from-[hsl(var(--soft-gold))]/20 to-transparent blur-3xl -z-10" />
      
      {/* Gift box container with 3D transform */}
      <div 
        className="relative transition-all duration-500 ease-out"
        style={{
          transform: `perspective(1000px) rotateY(${mousePosition.x}deg) rotateX(${mousePosition.y}deg)`,
          animation: 'float 3s ease-in-out infinite'
        }}
      >
        {/* Gift box image */}
        <img 
          src="/lovable-uploads/06605ca2-e67b-4de3-a587-8dc2cb96206d.png"
          alt="Luxury Gift Box"
          className="w-full h-auto drop-shadow-2xl"
        />
        
        {/* Soft shimmer overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700 rounded-lg"
        />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};
