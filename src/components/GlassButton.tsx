import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface GlassButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  href?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const GlassButton = ({ 
  children, 
  variant = 'primary', 
  href,
  onClick,
  className,
  disabled = false
}: GlassButtonProps) => {
  const baseStyles = "px-8 py-4 rounded-full font-medium transition-all duration-300 backdrop-blur-[16px] border disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-white/25 border-white/60 text-[hsl(var(--espresso))] hover:bg-white/35 hover:shadow-[0_8px_30px_rgba(200,164,106,0.3)] hover:-translate-y-1",
    secondary: "bg-white/15 border-white/40 text-[hsl(var(--charcoal-body))] hover:bg-white/25 hover:shadow-[0_8px_30px_rgba(255,255,255,0.2)] hover:-translate-y-1"
  };

  const combinedStyles = cn(baseStyles, variantStyles[variant], className);

  if (href) {
    return (
      <Link to={href} className={combinedStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={combinedStyles}>
      {children}
    </button>
  );
};
