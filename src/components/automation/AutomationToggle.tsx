import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Clock, MapPin, CheckCircle, AlertCircle, XCircle, Edit2, Gift, Package, Calendar, DollarSign, Truck } from 'lucide-react';
import { getAutomationStatus, checkAutomationEligibility } from '@/lib/automation';
import { useAuth } from '@/components/auth/AuthProvider';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, subDays } from 'date-fns';

interface AutomationToggleProps {
  recipientId: string;
  recipientName: string;
  estimatedCost: number;
  onEnableAutomation: () => void;
  onDisableAutomation: () => void;
  onEditAutomation?: () => void;
  tier: 'free' | 'vip';
  className?: string;
}

export const AutomationToggle = ({
  recipientId,
  recipientName,
  estimatedCost,
  onEnableAutomation,
  onDisableAutomation,
  onEditAutomation,
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

  // Fetch the recipient's default gift info
  const { data: recipientData } = useQuery({
    queryKey: ['recipient-automation', recipientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select('default_gift_variant_id, automation_enabled')
        .eq('id', recipientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: tier === 'vip'
  });

  // Fetch the product details for the default gift
  const { data: defaultGift } = useQuery({
    queryKey: ['default-gift-product', recipientData?.default_gift_variant_id],
    queryFn: async () => {
      if (!recipientData?.default_gift_variant_id) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select('title, price, featured_image_url')
        .eq('shopify_variant_id', recipientData.default_gift_variant_id)
        .single();
      
      if (error) {
        console.log('No product found for variant:', recipientData.default_gift_variant_id);
        return null;
      }
      return data;
    },
    enabled: !!recipientData?.default_gift_variant_id
  });

  // Fetch the next upcoming scheduled gift for this recipient
  const { data: nextScheduledGift } = useQuery({
    queryKey: ['next-scheduled-gift', recipientId],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select('*, recipients(name)')
        .eq('recipient_id', recipientId)
        .eq('user_id', user.id)
        .eq('automation_enabled', true)
        .gte('occasion_date', new Date().toISOString().split('T')[0])
        .order('occasion_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.log('Error fetching scheduled gift:', error);
        return null;
      }
      return data;
    },
    enabled: tier === 'vip' && !!user?.id
  });

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

  const getOrderStatus = () => {
    if (!nextScheduledGift) return null;
    
    if (nextScheduledGift.shopify_order_id) {
      return { label: 'Order Placed', color: 'text-green-600', bgColor: 'bg-green-50' };
    }
    if (nextScheduledGift.wallet_reserved) {
      return { label: 'Funds Reserved', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    }
    return { label: 'Scheduled', color: 'text-blue-600', bgColor: 'bg-blue-50' };
  };

  const orderStatus = getOrderStatus();

  // Calculate automation timeline dates
  const getTimelineInfo = () => {
    if (!nextScheduledGift?.occasion_date) return null;

    const occasionDate = new Date(nextScheduledGift.occasion_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Automation timeline:
    // - Funds reserved: 14 days before occasion
    // - Address request: 10 days before occasion  
    // - Gift ships: 3 days before occasion (once address confirmed)
    const fundsReserveDate = subDays(occasionDate, 14);
    const addressRequestDate = subDays(occasionDate, 10);
    const shipDate = subDays(occasionDate, 3);
    
    const daysUntilOccasion = differenceInDays(occasionDate, today);
    const daysUntilReserve = differenceInDays(fundsReserveDate, today);
    const daysUntilShip = differenceInDays(shipDate, today);

    return {
      occasionDate,
      fundsReserveDate,
      addressRequestDate,
      shipDate,
      daysUntilOccasion,
      daysUntilReserve,
      daysUntilShip,
      fundsAlreadyReserved: nextScheduledGift.wallet_reserved,
      alreadyShipped: !!nextScheduledGift.shopify_order_id
    };
  };

  const timeline = getTimelineInfo();
  const giftPrice = defaultGift ? Number(defaultGift.price) + 7 : estimatedCost; // Add $7 service fee

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Top Row: Toggle and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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

      {/* Gift Details Row - Show when automation is enabled */}
      {status?.enabled && defaultGift && (
        <div className="flex items-center gap-3 p-2 bg-white/50 rounded-lg border border-[#E4DCD2]/50">
          {/* Gift Image */}
          {defaultGift.featured_image_url ? (
            <img 
              src={defaultGift.featured_image_url} 
              alt={defaultGift.title}
              className="w-10 h-10 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-[#D2B887]/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-[#D2B887]" />
            </div>
          )}
          
          {/* Gift Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#1A1A1A] truncate">
              {defaultGift.title}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#1A1A1A]/60">
                ${giftPrice.toFixed(2)}
              </span>
              {orderStatus && (
                <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', orderStatus.bgColor, orderStatus.color)}>
                  {orderStatus.label}
                </span>
              )}
            </div>
          </div>

          {/* Edit Button */}
          {onEditAutomation && !status.fulfilled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditAutomation();
              }}
              className="h-8 w-8 p-0 text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:bg-[#E4DCD2]/50"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Timeline Info - Show when automation is enabled and we have a scheduled gift */}
      {status?.enabled && timeline && !timeline.alreadyShipped && (
        <div className="p-2 bg-gradient-to-r from-[#D2B887]/5 to-[#D2B887]/10 rounded-lg border border-[#D2B887]/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#D2B887]" />
            <span className="text-xs font-medium text-[#1A1A1A]">Automation Timeline</span>
          </div>
          
          <div className="space-y-1.5">
            {/* Funds Reserve Date */}
            {!timeline.fundsAlreadyReserved ? (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="w-3 h-3 text-purple-500" />
                <span className="text-[#1A1A1A]/70">Funds reserved:</span>
                <span className="font-medium text-[#1A1A1A]">
                  {format(timeline.fundsReserveDate, 'MMM d')}
                  {timeline.daysUntilReserve > 0 && (
                    <span className="text-[#1A1A1A]/50 ml-1">
                      ({timeline.daysUntilReserve} days)
                    </span>
                  )}
                  {timeline.daysUntilReserve <= 0 && (
                    <span className="text-purple-600 ml-1">(soon)</span>
                  )}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-green-700 font-medium">
                  ${giftPrice.toFixed(2)} reserved from wallet
                </span>
              </div>
            )}

            {/* Ship Date */}
            <div className="flex items-center gap-2 text-xs">
              <Truck className="w-3 h-3 text-blue-500" />
              <span className="text-[#1A1A1A]/70">Gift ships:</span>
              <span className="font-medium text-[#1A1A1A]">
                {format(timeline.shipDate, 'MMM d')}
                {timeline.daysUntilShip > 0 && (
                  <span className="text-[#1A1A1A]/50 ml-1">
                    ({timeline.daysUntilShip} days)
                  </span>
                )}
              </span>
            </div>

            {/* Occasion Date */}
            <div className="flex items-center gap-2 text-xs">
              <Gift className="w-3 h-3 text-[#D2B887]" />
              <span className="text-[#1A1A1A]/70">Arrives by:</span>
              <span className="font-medium text-[#D2B887]">
                {format(timeline.occasionDate, 'MMM d')}
                {timeline.daysUntilOccasion > 0 && (
                  <span className="text-[#1A1A1A]/50 ml-1">
                    ({timeline.daysUntilOccasion} days)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Show prompt to set up gift if automation enabled but no gift selected */}
      {status?.enabled && !defaultGift && (
        <div 
          className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
          onClick={onEditAutomation}
        >
          <Package className="w-4 h-4 text-yellow-600" />
          <span className="text-xs text-yellow-700">No gift selected - click to set up</span>
        </div>
      )}
    </div>
  );
};