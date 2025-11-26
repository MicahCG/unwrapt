import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { cleanName } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface GiftAwaitingConfirmation {
  id: string;
  recipient_id: string;
  recipient_name: string;
  occasion_date: string;
  occasion_type: string;
  estimated_cost: number;
  address_requested_at: string;
  confirmation_token: string;
  confirmation_expires_at: string;
  delivery_date: string;
}

export const GiftsAwaitingConfirmation = () => {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<GiftAwaitingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);

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
          occasion_date,
          occasion_type,
          estimated_cost,
          address_requested_at,
          confirmation_token,
          confirmation_expires_at,
          delivery_date,
          recipients!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('automation_enabled', true)
        .not('address_requested_at', 'is', null)
        .is('address_confirmed_at', null)
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

  const getConfirmationUrl = (token: string) => {
    const baseUrl = window.location.hostname === 'localhost'
      ? `http://localhost:${window.location.port || '8080'}`
      : 'https://app.unwrapt.io';
    return `${baseUrl}/gifts/confirm-address/${token}`;
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // TODO: Show success toast
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getDaysRemaining = (occasionDate: string) => {
    const today = new Date();
    const occasion = new Date(occasionDate);
    return differenceInDays(occasion, today);
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining <= 3) return 'text-red-600 bg-red-50';
    if (daysRemaining <= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
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
        <MapPin className="w-5 h-5 text-[#D2B887]" />
        <h2 className="font-display text-xl text-[#1A1A1A]">
          Gifts Awaiting Address Confirmation
        </h2>
        <Badge variant="secondary" className="bg-[#D2B887]/10 text-[#D2B887] border-[#D2B887]/20">
          {gifts.length}
        </Badge>
      </div>

      <p className="text-sm text-[#1A1A1A]/70 mb-4">
        These gifts need shipping addresses confirmed before they can be sent.
      </p>

      <div className="space-y-3">
        {gifts.map((gift) => {
          const daysRemaining = getDaysRemaining(gift.occasion_date);
          const confirmationUrl = getConfirmationUrl(gift.confirmation_token);
          const urgencyColor = getUrgencyColor(daysRemaining);

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
                </div>

                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${urgencyColor}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{daysRemaining} day{daysRemaining === 1 ? '' : 's'} left</span>
                </div>
              </div>

              {daysRemaining <= 3 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg mb-3">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-700">
                    Urgent: Address needed soon to ensure on-time delivery
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open(confirmationUrl, '_blank')}
                  className="flex-1 bg-[#D2B887] hover:bg-[#D2B887]/90 text-[#1A1A1A]"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Confirm Address
                </Button>
                <Button
                  onClick={() => copyToClipboard(confirmationUrl)}
                  variant="outline"
                  size="sm"
                  className="border-[#D2B887] text-[#D2B887] hover:bg-[#D2B887]/10"
                >
                  Copy Link
                </Button>
              </div>

              <p className="text-xs text-[#1A1A1A]/50 mt-2">
                Delivery scheduled for {format(new Date(gift.delivery_date), 'MMM d')}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
