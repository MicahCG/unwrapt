import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, AlertCircle, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { cleanName } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface GiftAwaitingConfirmation {
  id: string;
  recipient_id: string;
  recipient_name: string;
  occasion: string;
  occasion_date: string;
  occasion_type: string;
  estimated_cost: number;
  gift_description: string | null;
  gift_variant_id: string | null;
  wallet_reserved: boolean;
  gift_confirmed_at: string | null;
  delivery_date: string;
}

export const GiftsAwaitingConfirmation = () => {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<GiftAwaitingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    loadAwaitingGifts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('gifts-awaiting-confirmation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_gifts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadAwaitingGifts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadAwaitingGifts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_gifts')
        .select(`
          id,
          recipient_id,
          occasion,
          occasion_date,
          occasion_type,
          estimated_cost,
          gift_description,
          gift_variant_id,
          wallet_reserved,
          gift_confirmed_at,
          delivery_date,
          recipients!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('automation_enabled', true)
        .eq('wallet_reserved', true)
        .is('gift_confirmed_at', null)
        .order('occasion_date', { ascending: true });

      if (error) throw error;

      const giftsWithRecipientNames = data?.map(gift => ({
        ...gift,
        recipient_name: (gift.recipients as any)?.name || 'Unknown'
      })) || [];

      setGifts(giftsWithRecipientNames as GiftAwaitingConfirmation[]);
    } catch (error) {
      console.error('Error loading gifts awaiting confirmation:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmGift = async (giftId: string) => {
    setConfirming(giftId);
    try {
      const { error } = await supabase.functions.invoke('confirm-gift', {
        body: { giftId }
      });

      if (error) throw error;

      toast({
        title: 'Gift Confirmed!',
        description: 'Your gift will be processed and shipped soon.',
      });

      // Reload gifts
      await loadAwaitingGifts();
    } catch (error: any) {
      console.error('Error confirming gift:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm gift. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConfirming(null);
    }
  };

  const getDaysRemaining = (occasionDate: string) => {
    const today = new Date();
    const occasion = new Date(occasionDate);
    return differenceInDays(occasion, today);
  };

  if (loading) {
    return null;
  }

  if (gifts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-[#EFE7DD] to-[#E4DCD2] border-[#D2B887]/30 rounded-2xl p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.07)] backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-5 h-5 text-[#D2B887]" />
        <h2 className="font-display text-xl text-[#1A1A1A]">
          Gifts Pending Your Confirmation
        </h2>
        <Badge variant="secondary" className="bg-[#D2B887]/10 text-[#D2B887] border-[#D2B887]/20">
          {gifts.length}
        </Badge>
      </div>

      <p className="text-sm text-[#1A1A1A]/70 mb-4">
        Funds are reserved. Review and confirm these gifts to proceed with purchase.
      </p>

      <div className="space-y-3">
        {gifts.map((gift) => {
          const daysRemaining = getDaysRemaining(gift.occasion_date);
          const isConfirming = confirming === gift.id;

          return (
            <div
              key={gift.id}
              className="p-4 bg-[#FAF8F3] rounded-xl border border-[#E4DCD2] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-[#1A1A1A]">
                      {cleanName(gift.recipient_name)}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {gift.occasion_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-[#1A1A1A]/70">
                    {format(new Date(gift.occasion_date), 'MMM d, yyyy')}
                  </p>
                  {gift.gift_description && (
                    <p className="text-sm text-[#1A1A1A]/60 mt-1">
                      {gift.gift_description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{daysRemaining} days</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Reserved: ${gift.estimated_cost?.toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Funds will be charged when you confirm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => confirmGift(gift.id)}
                  disabled={isConfirming}
                  className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                  size="sm"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Gift
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-[#1A1A1A]/50 mt-2">
                Auto-confirms in 3 days • Delivery: {format(new Date(gift.delivery_date), 'MMM d')}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
