import React, { useEffect, useState } from 'react';

const AnimatedGiftDrawing = () => {
  const [startAnimation, setStartAnimation] = useState(false);

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => {
      setStartAnimation(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      <svg
        viewBox="0 0 800 600"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gift giving illustration */}
        <path
          d="M150 550 Q150 400 200 350 Q250 300 280 280 Q300 260 320 240 Q340 220 360 200 Q380 180 400 160 Q420 140 440 120 Q460 100 480 80 Q500 60 520 50 Q540 40 560 50 Q580 60 600 80 Q620 100 640 120 Q660 140 680 160 Q700 180 720 200 Q740 220 760 240 Q780 260 800 280 Q820 300 850 350 Q900 400 900 550"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2000"
          strokeDashoffset={startAnimation ? "0" : "2000"}
          style={{
            transition: 'stroke-dashoffset 4s ease-in-out'
          }}
        />
        
        {/* Left person */}
        <path
          d="M200 200 Q220 180 240 200 Q260 220 250 250 Q240 280 230 310 Q220 340 210 370 Q200 400 190 430"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="800"
          strokeDashoffset={startAnimation ? "0" : "800"}
          style={{
            transition: 'stroke-dashoffset 3s ease-in-out 1s'
          }}
        />
        
        {/* Left person body */}
        <path
          d="M190 430 Q200 460 210 490 Q220 520 230 550"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="400"
          strokeDashoffset={startAnimation ? "0" : "400"}
          style={{
            transition: 'stroke-dashoffset 2s ease-in-out 2s'
          }}
        />
        
        {/* Left arm extending */}
        <path
          d="M230 350 Q280 340 330 350 Q380 360 420 370"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="600"
          strokeDashoffset={startAnimation ? "0" : "600"}
          style={{
            transition: 'stroke-dashoffset 2.5s ease-in-out 2.5s'
          }}
        />
        
        {/* Gift box */}
        <path
          d="M420 350 L480 350 L480 390 L420 390 Z M420 340 L480 340 M440 340 L440 320 Q440 310 450 310 Q460 310 460 320 L460 340 M450 310 Q450 300 460 300 Q470 300 470 310"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="800"
          strokeDashoffset={startAnimation ? "0" : "800"}
          style={{
            transition: 'stroke-dashoffset 2s ease-in-out 3s'
          }}
        />
        
        {/* Right arm extending */}
        <path
          d="M480 370 Q530 360 580 350 Q630 340 670 350"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="600"
          strokeDashoffset={startAnimation ? "0" : "600"}
          style={{
            transition: 'stroke-dashoffset 2.5s ease-in-out 3.5s'
          }}
        />
        
        {/* Right person */}
        <path
          d="M670 200 Q650 180 630 200 Q610 220 620 250 Q630 280 640 310 Q650 340 660 370 Q670 400 680 430"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="800"
          strokeDashoffset={startAnimation ? "0" : "800"}
          style={{
            transition: 'stroke-dashoffset 3s ease-in-out 4s'
          }}
        />
        
        {/* Right person body */}
        <path
          d="M680 430 Q670 460 660 490 Q650 520 640 550"
          fill="none"
          stroke="#64748b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="400"
          strokeDashoffset={startAnimation ? "0" : "400"}
          style={{
            transition: 'stroke-dashoffset 2s ease-in-out 4.5s'
          }}
        />
      </svg>
    </div>
  );
};

export default AnimatedGiftDrawing;