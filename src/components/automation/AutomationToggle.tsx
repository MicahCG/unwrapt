import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';

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
}

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
  hasGiftSelected = false
}) => {
  if (tier === 'free') {
    return null;
  }

  const isReady = isEnabled && hasCompleteAddress && hasGiftSelected;
  const needsAction = isEnabled && (!hasCompleteAddress || !hasGiftSelected);

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
        
        {isEnabled && (
          <>
            {isReady ? (
              <Badge 
                className="bg-emerald-100 text-emerald-700 border-0 text-xs cursor-pointer hover:bg-emerald-200"
                onClick={onViewDetails}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            ) : needsAction ? (
              <Badge 
                className="bg-amber-100 text-amber-700 border-0 text-xs cursor-pointer hover:bg-amber-200"
                onClick={onViewDetails}
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Action Required
              </Badge>
            ) : null}
          </>
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
