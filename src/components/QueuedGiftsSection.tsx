import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Gift, 
  Calendar, 
  Truck,
  Clock,
  CreditCard,
  Package
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { cleanName } from '@/lib/utils';
import { getNextOccurrence, getDaysUntil } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Recipient {
  id: string;
  name: string;
  birthday: string | null;
  anniversary: string | null;
  automation_enabled: boolean;
  default_gift_variant_id: string | null;
  preferred_gift_vibe: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  scheduled_gifts: Array<{
    id: string;
    automation_enabled: boolean;
    wallet_reserved: boolean;
    status: string;
    gift_variant_id: string | null;
    occasion_date: string;
    estimated_cost: number | null;
  }>;
}

interface QueuedGiftsSectionProps {
  recipients: Recipient[];
  walletBalance: number;
  onRequestAddress: (recipient: Recipient) => void;
}

export const QueuedGiftsSection: React.FC<QueuedGiftsSectionProps> = ({
  recipients,
  walletBalance,
  onRequestAddress
}) => {
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  // Check if recipient has complete address
  const hasCompleteAddress = (recipient: Recipient) => {
    return !!(recipient.street && recipient.city && recipient.state && recipient.zip_code);
  };

  // Get the next automated gift for a recipient
  const getNextAutomatedGift = (recipient: Recipient) => {
    const gifts = recipient.scheduled_gifts?.filter(g => g.automation_enabled) || [];
    return gifts.sort((a, b) => 
      new Date(a.occasion_date).getTime() - new Date(b.occasion_date).getTime()
    )[0];
  };

  // Filter recipients with automation enabled
  const automatedRecipients = recipients.filter(r => {
    const hasAutomation = r.automation_enabled || r.scheduled_gifts?.some(g => g.automation_enabled);
    return hasAutomation;
  });

  // Split into ready (all requirements met) and needs action
  const readyToGo = automatedRecipients.filter(r => {
    const hasAddress = hasCompleteAddress(r);
    const hasGiftSelected = r.default_gift_variant_id || r.preferred_gift_vibe;
    return hasAddress && hasGiftSelected;
  });

  const needsAction = automatedRecipients.filter(r => {
    const hasAddress = hasCompleteAddress(r);
    const hasGiftSelected = r.default_gift_variant_id || r.preferred_gift_vibe;
    return !hasAddress || !hasGiftSelected;
  });

  // Handle manual order trigger
  const handleTriggerOrder = async (recipient: Recipient) => {
    const gift = getNextAutomatedGift(recipient);
    if (!gift) {
      toast.error('No scheduled gift found');
      return;
    }

    setProcessingOrder(recipient.id);
    
    try {
      // Call the fulfillment edge function
      const { data, error } = await supabase.functions.invoke('process-gift-fulfillment', {
        body: { scheduledGiftId: gift.id, manualTrigger: true }
      });

      if (error) throw error;

      toast.success(`Order placed for ${cleanName(recipient.name)}!`);
      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error triggering order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setProcessingOrder(null);
    }
  };

  if (automatedRecipients.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Ready to Go Section */}
      {readyToGo.length > 0 && (
        <Card className="bg-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)]">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-display text-xl text-[#1A1A1A]">
              Queued & Ready
            </h2>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
              {readyToGo.length} automated
            </Badge>
          </div>
          <p className="text-sm text-[#1A1A1A]/60 mb-4">
            These gifts will be ordered automatically. You can also trigger them early.
          </p>
          
          <div className="space-y-3">
            {readyToGo.map(recipient => {
              const gift = getNextAutomatedGift(recipient);
              const occasionDate = recipient.birthday || recipient.anniversary;
              const daysUntil = occasionDate ? getDaysUntil(occasionDate) : null;
              const estimatedCost = gift?.estimated_cost || 42;
              
              // Calculate timeline dates
              const nextOccurrence = occasionDate ? getNextOccurrence(occasionDate) : new Date();
              const reserveDate = subDays(nextOccurrence, 14);
              const shipDate = subDays(nextOccurrence, 3);
              const isReserved = gift?.wallet_reserved;
              
              return (
                <div
                  key={recipient.id}
                  className="p-4 bg-[#FAF8F3] rounded-xl border border-emerald-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-emerald-700 font-medium">
                          {cleanName(recipient.name).charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-[#1A1A1A]">{cleanName(recipient.name)}</h3>
                        <p className="text-sm text-[#1A1A1A]/60">
                          {recipient.birthday ? 'Birthday' : 'Anniversary'} 
                          {daysUntil !== null && ` • in ${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      All Set
                    </Badge>
                  </div>

                  {/* Timeline */}
                  <div className="bg-[#EFE7DD]/50 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className={`w-3.5 h-3.5 ${isReserved ? 'text-emerald-600' : 'text-[#D2B887]'}`} />
                        <div>
                          <p className="text-[#1A1A1A]/50">Funds reserved</p>
                          <p className={`font-medium ${isReserved ? 'text-emerald-600' : 'text-[#1A1A1A]'}`}>
                            {isReserved ? 'Done' : format(reserveDate, 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#D2B887]" />
                        <div>
                          <p className="text-[#1A1A1A]/50">Ships</p>
                          <p className="font-medium text-[#1A1A1A]">{format(shipDate, 'MMM d')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-[#D2B887]" />
                        <div>
                          <p className="text-[#1A1A1A]/50">Arrives by</p>
                          <p className="font-medium text-[#1A1A1A]">{format(nextOccurrence, 'MMM d')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cost & Action */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1A1A1A]/70">
                      ${estimatedCost.toFixed(2)} will be deducted
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#D2B887] text-[#1A1A1A] hover:bg-[#D2B887]/10"
                      onClick={() => handleTriggerOrder(recipient)}
                      disabled={processingOrder === recipient.id || walletBalance < estimatedCost}
                    >
                      {processingOrder === recipient.id ? (
                        <>
                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Truck className="w-3 h-3 mr-1" />
                          Order Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Needs Action Section */}
      {needsAction.length > 0 && (
        <Card className="bg-[#EFE7DD] border-[#E4DCD2] rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)]">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="font-display text-xl text-[#1A1A1A]">
              Action Required
            </h2>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
              {needsAction.length} need attention
            </Badge>
          </div>
          <p className="text-sm text-[#1A1A1A]/60 mb-4">
            Complete these items to enable automatic ordering.
          </p>
          
          <div className="space-y-3">
            {needsAction.map(recipient => {
              const hasAddress = hasCompleteAddress(recipient);
              const hasGiftSelected = recipient.default_gift_variant_id || recipient.preferred_gift_vibe;
              const occasionDate = recipient.birthday || recipient.anniversary;
              const daysUntil = occasionDate ? getDaysUntil(occasionDate) : null;
              
              return (
                <div
                  key={recipient.id}
                  className="p-4 bg-[#FAF8F3] rounded-xl border border-amber-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-amber-700 font-medium">
                          {cleanName(recipient.name).charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-[#1A1A1A]">{cleanName(recipient.name)}</h3>
                        <p className="text-sm text-[#1A1A1A]/60">
                          {recipient.birthday ? 'Birthday' : 'Anniversary'}
                          {daysUntil !== null && ` • in ${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Missing items */}
                  <div className="space-y-2">
                    {!hasAddress && (
                      <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Shipping address missing</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-amber-700 hover:bg-amber-100"
                          onClick={() => onRequestAddress(recipient)}
                        >
                          Add Address
                        </Button>
                      </div>
                    )}
                    {!hasGiftSelected && (
                      <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg text-amber-700">
                        <Gift className="w-4 h-4" />
                        <span className="text-sm">No default gift selected</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
