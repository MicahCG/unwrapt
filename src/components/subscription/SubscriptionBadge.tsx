import React from 'react';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SubscriptionBadgeProps {
  tier: 'free' | 'vip';
  trialEndsAt?: string | null;
  className?: string;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ 
  tier, 
  trialEndsAt,
  className 
}) => {
  const isTrialing = trialEndsAt && new Date(trialEndsAt) > new Date();
  const daysRemaining = isTrialing 
    ? Math.ceil((new Date(trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (tier === 'vip' || isTrialing) {
    return (
      <Badge 
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1",
          "bg-gradient-to-r from-[hsl(var(--champagne-gold))] to-[hsl(var(--champagne-gold))]/80",
          "text-[hsl(var(--charcoal-text))] border-[hsl(var(--champagne-gold))]/50",
          "shadow-sm",
          className
        )}
      >
        <Crown className="w-3.5 h-3.5" />
        <span className="font-medium text-xs">
          {isTrialing ? `VIP Trial (${daysRemaining}d)` : 'VIP'}
        </span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline"
      className={cn(
        "inline-flex items-center px-3 py-1",
        "bg-[hsl(var(--sand))] text-[hsl(var(--charcoal-text))]/70",
        "border-[hsl(var(--cream-border))]",
        className
      )}
    >
      <span className="font-medium text-xs">Free Plan</span>
    </Badge>
  );
};

export default SubscriptionBadge;
