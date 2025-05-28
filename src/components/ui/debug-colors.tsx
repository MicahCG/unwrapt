
import React, { useEffect } from 'react';

// Debug component to identify color usage
const DebugColors: React.FC = () => {
  useEffect(() => {
    // Log all computed styles that might contain the problematic color
    const elements = document.querySelectorAll('*');
    elements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      const borderColor = computedStyle.borderColor;
      
      if (color?.includes('215, 238, 140') || color?.includes('#D7EE8C') ||
          backgroundColor?.includes('215, 238, 140') || backgroundColor?.includes('#D7EE8C') ||
          borderColor?.includes('215, 238, 140') || borderColor?.includes('#D7EE8C')) {
        console.log('Found problematic color on element:', element, {
          color,
          backgroundColor,
          borderColor,
          className: element.className
        });
      }
    });
  }, []);

  return null;
};

export default DebugColors;
