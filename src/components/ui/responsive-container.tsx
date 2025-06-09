
import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveContainer = ({ children, className }: ResponsiveContainerProps) => {
  return (
    <div className={cn(
      "min-h-screen bg-brand-cream",
      "px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 lg:py-6 xl:py-8",
      className
    )}>
      <div className="max-w-7xl mx-auto w-full">
        {children}
      </div>
    </div>
  );
};

export const ResponsiveHeader = ({ children, className }: ResponsiveContainerProps) => {
  return (
    <div className={cn(
      "mb-4 sm:mb-6 lg:mb-8",
      "flex flex-col gap-3 sm:gap-4",
      "lg:flex-row lg:items-start lg:justify-between",
      className
    )}>
      {children}
    </div>
  );
};

export const ResponsiveNavigation = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full lg:flex-1">
      {children}
    </div>
  );
};

export const ResponsiveActions = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto lg:flex-shrink-0">
      {children}
    </div>
  );
};
