
import React from 'react';

interface LogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  variant = 'full', 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: variant === 'full' ? 'h-8' : 'h-6 w-6',
    md: variant === 'full' ? 'h-10' : 'h-8 w-8',
    lg: variant === 'full' ? 'h-16' : 'h-12 w-12'
  };

  // Use the new logo for both icon and full variants
  return (
    <img 
      src="/lovable-uploads/unwrapt-logo.svg" 
      alt="Unwrapt" 
      className={`${sizeClasses[size]} ${className}`}
      style={{ filter: 'brightness(0) saturate(100%) invert(20%) sepia(25%) saturate(1088%) hue-rotate(352deg) brightness(95%) contrast(90%)' }}
    />
  );
};
