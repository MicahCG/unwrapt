
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
      "px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8",
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
      "flex flex-col gap-4",
      "sm:flex-row sm:items-center sm:justify-between",
      className
    )}>
      {children}
    </div>
  );
};

export const ResponsiveNavigation = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
      {children}
    </div>
  );
};

export const ResponsiveActions = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
      {children}
    </div>
  );
};
