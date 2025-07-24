
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
      src="/lovable-uploads/d04d6622-5647-4909-994f-b5f4f428c00c.png" 
      alt="Unwrapt" 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};
