import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Gift, 
  CreditCard,
  Package,
  Truck,
  Calendar
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { getNextOccurrence } from '@/lib/dateUtils';
import { cleanName } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutomationDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    id: string;
    name: string;
    birthday: string | null;
    anniversary: string | null;
    default_gift_variant_id: string | null;
    preferred_gift_vibe: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    scheduled_gifts?: Array<{
      id: string;
      automation_enabled: boolean;
      wallet_reserved: boolean;
      estimated_cost: number | null;
      occasion_date: string;
      shopify_order_id: string | null;
      status: string | null;
      payment_status: string | null;
    }>;
  };
  walletBalance: number;
  onEditAddress: () => void;
  onEditGift: () => void;
}

export const AutomationDetailModal: React.FC<AutomationDetailModalProps> = ({
  open,
  onOpenChange,
  recipient,
  walletBalance,
  onEditAddress,
  onEditGift
}) => {
  const [isOrdering, setIsOrdering] = useState(false);

  const hasCompleteAddress = !!(recipient.street && recipient.city && recipient.state && recipient.zip_code);
  const hasGiftSelected = !!(recipient.default_gift_variant_id || recipient.preferred_gift_vibe);
  const isReady = hasCompleteAddress && hasGiftSelected;

  const occasionDate = recipient.birthday || recipient.anniversary;
  const occasionType = recipient.birthday ? 'Birthday' : 'Anniversary';
  const nextOccurrence = occasionDate ? getNextOccurrence(occasionDate) : new Date();
  
  const reserveDate = subDays(nextOccurrence, 14);
  const shipDate = subDays(nextOccurrence, 3);
  
  const automatedGift = recipient.scheduled_gifts?.find(g => g.automation_enabled);
  const isReserved = automatedGift?.wallet_reserved || automatedGift?.payment_status === 'paid';
  const isOrdered = !!automatedGift?.shopify_order_id || automatedGift?.status === 'ordered';
  const isDelivered = automatedGift?.status === 'delivered';
  const estimatedCost = automatedGift?.estimated_cost || 42;

  const handleOrderNow = async () => {
    if (!automatedGift) {
      toast.error('No automated gift found');
      return;
    }

    setIsOrdering(true);
    try {
      const { error } = await supabase.functions.invoke('process-gift-fulfillment', {
        body: { scheduledGiftId: automatedGift.id, manualTrigger: true }
      });

      if (error) throw error;

      toast.success(`Order placed for ${cleanName(recipient.name)}!`);
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#FAF8F3] border-[#E4DCD2] max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#1A1A1A] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D2B887]/20 flex items-center justify-center">
              <span className="text-[#1A1A1A] font-medium">
                {cleanName(recipient.name).charAt(0)}
              </span>
            </div>
            <div>
              <div>{cleanName(recipient.name)}</div>
              <div className="text-sm font-normal text-[#1A1A1A]/60">
                {occasionType} • {occasionDate ? format(nextOccurrence, 'MMM d') : 'No date'}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Status Badge */}
          <div className="flex justify-center">
            {isReady ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 px-4 py-1.5">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Ready to Go
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 border-0 px-4 py-1.5">
                <AlertCircle className="w-4 h-4 mr-2" />
                Action Required
              </Badge>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-[#EFE7DD] rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#1A1A1A]">Automation Checklist</h3>
            
            {/* Gift Selection */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasGiftSelected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span className="text-sm text-[#1A1A1A]/80">Default gift selected</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#D2B887] hover:text-[#D2B887]/80"
                onClick={() => {
                  onOpenChange(false);
                  onEditGift();
                }}
              >
                {hasGiftSelected ? 'Change' : 'Select'}
              </Button>
            </div>

            {/* Shipping Address */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasCompleteAddress ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span className="text-sm text-[#1A1A1A]/80">Shipping address</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#D2B887] hover:text-[#D2B887]/80"
                onClick={() => {
                  onOpenChange(false);
                  onEditAddress();
                }}
              >
                {hasCompleteAddress ? 'Edit' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Timeline - Only show if ready */}
          {isReady && (
            <div className="bg-[#EFE7DD] rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Automation Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isReserved ? 'bg-emerald-100' : 'bg-[#D2B887]/20'}`}>
                    <CreditCard className={`w-4 h-4 ${isReserved ? 'text-emerald-600' : 'text-[#D2B887]'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isReserved ? 'text-emerald-700' : 'text-[#1A1A1A]'}`}>
                      {isReserved ? 'Funds reserved ✓' : 'Funds will be reserved'}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/60">
                      {isReserved ? 'Completed' : format(reserveDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOrdered ? 'bg-emerald-100' : 'bg-[#D2B887]/20'}`}>
                    <Package className={`w-4 h-4 ${isOrdered ? 'text-emerald-600' : 'text-[#D2B887]'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isOrdered ? 'text-emerald-700' : 'text-[#1A1A1A]'}`}>
                      {isOrdered ? 'Order placed ✓' : 'Order will be placed'}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/60">
                      {isOrdered ? 'Completed' : format(shipDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDelivered ? 'bg-emerald-100' : 'bg-[#D2B887]/20'}`}>
                    <Gift className={`w-4 h-4 ${isDelivered ? 'text-emerald-600' : 'text-[#D2B887]'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDelivered ? 'text-emerald-700' : 'text-[#1A1A1A]'}`}>
                      {isDelivered ? 'Delivered ✓' : 'Arrives by'}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/60">
                      {isDelivered ? 'Completed' : format(nextOccurrence, 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cost & Action */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-[#1A1A1A]/70">
              <span className="font-medium">${estimatedCost.toFixed(2)}</span> will be deducted
            </div>
            {isReady && (
              <Button
                onClick={handleOrderNow}
                disabled={isOrdering || walletBalance < estimatedCost}
                className="bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
              >
                {isOrdering ? (
                  'Processing...'
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    Order Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
