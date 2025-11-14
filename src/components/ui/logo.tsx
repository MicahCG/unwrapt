
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

  // Use the new gift box icon logo
  return (
    <img 
      src="/lovable-uploads/unwrapt-logo-icon.png" 
      alt="Unwrapt" 
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  );
};
