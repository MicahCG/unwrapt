import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, MapPin, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { getAutomationStatus, checkAutomationEligibility } from '@/lib/automation';
import { useAuth } from '@/components/auth/AuthProvider';
import { cn } from '@/lib/utils';

interface AutomationToggleProps {
  recipientId: string;
  recipientName: string;
  estimatedCost: number;
  onEnableAutomation: () => void;
  onDisableAutomation: () => void;
  tier: 'free' | 'vip';
  className?: string;
}

export const AutomationToggle = ({
  recipientId,
  recipientName,
  estimatedCost,
  onEnableAutomation,
  onDisableAutomation,
  tier,
  className
}: AutomationToggleProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    enabled: boolean;
    stage?: string;
    fundsReserved: boolean;
    addressRequested: boolean;
    addressConfirmed: boolean;
    fulfilled: boolean;
  } | null>(null);
  const [isEligible, setIsEligible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || tier !== 'vip') {
      setLoading(false);
      return;
    }

    Promise.all([
      getAutomationStatus(recipientId),
      checkAutomationEligibility(user.id, estimatedCost)
    ]).then(([statusData, eligibilityData]) => {
      setStatus(statusData);
      setIsEligible(eligibilityData.eligible);
      setLoading(false);
    });
  }, [recipientId, user, tier, estimatedCost]);

  if (tier !== 'vip') return null;
  if (loading) return null;

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      if (!isEligible) {
        // Show modal or toast explaining why automation can't be enabled
        return;
      }
      onEnableAutomation();
    } else {
      onDisableAutomation();
    }
  };

  // Determine the current automation state and styling
  const getAutomationState = () => {
    if (!status?.enabled) {
      return {
        label: 'OFF',
        icon: null,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        description: 'Enable automation'
      };
    }

    if (status.fulfilled) {
      return {
        label: 'Fulfilled',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        description: 'Gift has been sent'
      };
    }

    if (status.addressConfirmed) {
      return {
        label: 'Confirmed',
        icon: CheckCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        description: 'Address confirmed, preparing shipment'
      };
    }

    if (status.addressRequested) {
      return {
        label: 'Address Needed',
        icon: MapPin,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        description: 'Waiting for address confirmation'
      };
    }

    if (status.fundsReserved) {
      return {
        label: 'Reserved',
        icon: Clock,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        description: `$${estimatedCost.toFixed(2)} reserved`
      };
    }

    if (status.stage === 'paused') {
      return {
        label: 'Paused',
        icon: AlertCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        description: 'Automation paused'
      };
    }

    if (status.stage === 'error') {
      return {
        label: 'Error',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        description: 'Action required'
      };
    }

    return {
      label: 'ON',
      icon: Zap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Automation enabled'
    };
  };

  const state = getAutomationState();
  const StateIcon = state.icon;

  // Calculate stage progress (0-6)
  const getStageProgress = () => {
    if (!status?.enabled) return 0;

    let stage = 0;
    if (status.enabled) stage = 1;
    if (status.fundsReserved) stage = 2;
    if (status.addressRequested) stage = 3;
    if (status.addressConfirmed) stage = 4;
    if (status.fulfilled) stage = 6;

    return stage;
  };

  const currentStage = getStageProgress();
  const maxStages = 6;

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3', className)}>
      {/* Toggle Switch */}
      <div className="flex items-center gap-2">
        <Switch
          checked={status?.enabled || false}
          onCheckedChange={handleToggle}
          disabled={!isEligible || status?.fulfilled}
          className="data-[state=checked]:bg-[#D2B887]"
        />
        <Badge variant="secondary" className="bg-[#D2B887]/10 text-[#D2B887] border-[#D2B887]/20 text-xs">
          <Zap className="w-3 h-3 mr-1" />
          VIP
        </Badge>
      </div>

      {/* Status Display */}
      {status?.enabled && (
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap', state.bgColor, state.color)}>
            {StateIcon && <StateIcon className="w-3.5 h-3.5 flex-shrink-0" />}
            <span>{state.label}</span>
          </div>

          {/* Stage Progress */}
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-xs text-gray-500">Stage</span>
            <div className="flex gap-0.5">
              {Array.from({ length: maxStages }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    idx < currentStage ? 'bg-[#D2B887]' : 'bg-gray-200'
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-gray-700">
              {currentStage}/{maxStages}
            </span>
          </div>
        </div>
      )}

      {/* Eligibility Warning */}
      {!status?.enabled && !isEligible && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-xs font-medium text-red-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Insufficient funds</span>
        </div>
      )}
    </div>
  );
};
