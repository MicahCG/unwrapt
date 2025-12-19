import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, AlertCircle, ChevronRight, Package, CreditCard, Wallet, Clock } from 'lucide-react';

interface AutomationToggleProps {
  recipientId: string;
  recipientName: string;
  estimatedCost: number;
  onEnableAutomation: () => void;
  onDisableAutomation: () => void;
  onViewDetails: () => void;
  tier: 'free' | 'vip';
  isEnabled?: boolean;
  hasCompleteAddress?: boolean;
  hasGiftSelected?: boolean;
  scheduledGift?: any;
  walletBalance?: number;
}

type AutomationStatus = {
  type: 'success' | 'info' | 'warning' | 'error';
  label: string;
  icon: React.ComponentType<any>;
  className: string;
  action?: string;
};

export const AutomationToggle: React.FC<AutomationToggleProps> = ({
  recipientId,
  recipientName,
  estimatedCost,
  onEnableAutomation,
  onDisableAutomation,
  onViewDetails,
  tier,
  isEnabled = false,
  hasCompleteAddress = false,
  hasGiftSelected = false,
  scheduledGift,
  walletBalance = 0
}) => {
  if (tier === 'free') {
    return null;
  }

  const getAutomationStatus = (): AutomationStatus | null => {
    if (!isEnabled) return null;

    // Check for ordered/delivered gifts (highest priority - success state)
    if (scheduledGift?.status === 'ordered' || scheduledGift?.status === 'delivered') {
      return {
        type: 'success',
        label: scheduledGift.status === 'delivered' ? 'Delivered' : 'Order Placed',
        icon: Package,
        className: 'bg-emerald-100 text-emerald-700 border-0'
      };
    }

    // Check if funds are charged and awaiting order placement
    if (scheduledGift?.payment_status === 'paid' && scheduledGift?.status !== 'ordered') {
      return {
        type: 'info',
        label: 'Awaiting Order',
        icon: Clock,
        className: 'bg-[#D2B887]/20 text-[#C4A36F] border-0'
      };
    }

    // Check if funds are reserved (pending charge)
    if (scheduledGift?.wallet_reserved && scheduledGift?.payment_status === 'pending') {
      return {
        type: 'info',
        label: 'Funds Reserved',
        icon: CreditCard,
        className: 'bg-[#D2B887]/20 text-[#C4A36F] border-0'
      };
    }

    // Check wallet balance (critical - user needs to add funds)
    const cost = scheduledGift?.estimated_cost || estimatedCost;
    if (walletBalance < cost) {
      const shortfall = cost - walletBalance;
      return {
        type: 'error',
        label: 'Needs Funds',
        icon: Wallet,
        className: 'bg-rose-100 text-rose-700 border-0',
        action: `+$${shortfall.toFixed(2)}`
      };
    }

    // Check if setup is incomplete (missing address or gift)
    if (!hasCompleteAddress || !hasGiftSelected) {
      return {
        type: 'warning',
        label: 'Action Required',
        icon: AlertCircle,
        className: 'bg-amber-100 text-amber-700 border-0'
      };
    }

    // All good - ready to auto-schedule
    return {
      type: 'success',
      label: 'Ready',
      icon: CheckCircle2,
      className: 'bg-emerald-100 text-emerald-700 border-0'
    };
  };

  const status = getAutomationStatus();
  const StatusIcon = status?.icon;

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onEnableAutomation();
    } else {
      onDisableAutomation();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-[#D2B887]"
        />
        <span className="text-xs text-[#1A1A1A]/60">Auto</span>

        {isEnabled && status && (
          <Badge
            className={`${status.className} text-xs cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={onViewDetails}
          >
            {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
            {status.label}
            {status.action && (
              <span className="ml-1 font-semibold">{status.action}</span>
            )}
          </Badge>
        )}
      </div>

      {isEnabled && (
        <button
          onClick={onViewDetails}
          className="text-[#1A1A1A]/40 hover:text-[#1A1A1A]/70 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
