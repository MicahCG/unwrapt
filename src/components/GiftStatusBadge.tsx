import React from 'react';
import { cn } from '@/lib/utils';
import type { GiftStatus } from '@/lib/giftStatus';

interface GiftStatusBadgeProps {
  status: GiftStatus;
  compact?: boolean;
  className?: string;
}

const GiftStatusBadge: React.FC<GiftStatusBadgeProps> = ({ status, compact = false, className }) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center rounded-full font-semibold leading-none',
      compact ? 'gap-1 px-2 py-1 text-[9px]' : 'gap-1.5 px-2.5 py-1.5 text-[11px]',
      status.className,
      className,
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} aria-hidden="true" />
    {status.label}
  </span>
);

export default GiftStatusBadge;
