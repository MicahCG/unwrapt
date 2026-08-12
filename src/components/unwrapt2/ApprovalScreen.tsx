import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { MobileShell, Eyebrow, PrimaryButton, Display } from './MobileShell';
import { MargotAvatar } from './MargotAvatar';
import { U } from './theme';
import { cleanName } from '@/lib/utils';
import { formatOccasionDate, getDaysUntil } from '@/lib/dateUtils';
import { createFulfillmentRoute, type FulfillmentRoute } from '@/lib/fulfillment';
import { trackProductEvent } from '@/lib/productAnalytics';
import type { Database } from '@/integrations/supabase/types';

type ScheduledGift = Database['public']['Tables']['scheduled_gifts']['Row'];
type Recipient = Database['public']['Tables']['recipients']['Row'];

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

interface ApprovalScreenProps {
  gift: ScheduledGift;
  recipient: Recipient;
  onClose: () => void;
  onApproved?: () => void;
}

/**
 * Agent-first gift approval. Mirrors the prototype's flagship "Approve & send"
 * screen and is wired to the existing `confirm-gift` edge function — the same
 * status transition the old GiftsAwaitingConfirmation card performed.
 */
export const ApprovalScreen: React.FC<ApprovalScreenProps> = ({ gift, recipient, onClose, onApproved }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<FulfillmentRoute | null>(null);

  const name = cleanName(recipient?.name || 'them');
  const first = name.split(' ')[0];
  const occasionDate = gift?.occasion_date || recipient?.birthday || recipient?.anniversary;
  const days = occasionDate ? getDaysUntil(occasionDate) : null;
  const price = gift?.estimated_cost ?? gift?.price_range ?? null;
  const priceLabel = typeof price === 'number' ? `$${Math.round(price)}` : (price || '');
  const giftTitle = gift?.gift_description || gift?.gift_type || 'A thoughtful gift';

  const approve = async () => {
    if (!user || !gift?.id) return;
    setActiveAction('exact_gift');
    try {
      const { error } = await supabase.functions.invoke('confirm-gift', { body: { giftId: gift.id } });
      if (error) throw error;
      await createFulfillmentRoute(gift.id, 'exact_gift');
      await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      void trackProductEvent('fulfillment_route_created', { route: 'exact_gift' });
      toast({ title: 'Exact gift approved', description: `${first}'s gift is ready for a verified partner handoff.` });
      onApproved?.();
      onClose();
    } catch (e: unknown) {
      toast({
        title: "Couldn't confirm",
        description: errorMessage(e),
        variant: 'destructive',
      });
      setActiveAction(null);
    }
  };

  const chooseAlternateRoute = async (route: 'recipient_choice' | 'concierge') => {
    if (!user || !gift?.id) return;
    setActiveAction(route);
    try {
      const result = await createFulfillmentRoute(gift.id, route);
      if (route === 'recipient_choice' && result.choiceUrl) {
        await navigator.clipboard.writeText(result.choiceUrl);
        toast({
          title: 'Private choice link copied',
          description: `Send it to ${first}. It expires in 14 days, and they can choose without exposing personal details here.`,
        });
      } else {
        toast({ title: 'Concierge review requested', description: 'This gift is now in the human-review queue.' });
      }
      void trackProductEvent('fulfillment_route_created', { route });
      await queryClient.invalidateQueries({ queryKey: ['fulfillment-orders'] });
      onApproved?.();
      onClose();
    } catch (e: unknown) {
      toast({ title: "Couldn't create that route", description: errorMessage(e), variant: 'destructive' });
      setActiveAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <MobileShell
        contentClassName="px-5 pt-14 pb-3"
        footer={
          <>
            <PrimaryButton onClick={approve} disabled={Boolean(activeAction)} className="mb-2.5">
              {activeAction === 'exact_gift' ? 'Confirming…' : `Approve exact gift${priceLabel ? `: ${priceLabel}` : ''}`}
            </PrimaryButton>
            <button
              onClick={() => chooseAlternateRoute('recipient_choice')}
              disabled={Boolean(activeAction)}
              className="mb-2.5 w-full disabled:opacity-60"
              style={{ appearance: 'none', cursor: 'pointer', background: U.surface, border: `1px solid ${U.borderStrong}`, color: U.ink, fontWeight: 650, fontSize: 13.5, padding: '12px 6px', borderRadius: 13 }}
            >
              {activeAction === 'recipient_choice' ? 'Creating private link…' : `Let ${first} choose instead`}
            </button>
            <button
              onClick={() => chooseAlternateRoute('concierge')}
              disabled={Boolean(activeAction)}
              className="mb-2.5 w-full disabled:opacity-60"
              style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: `1px solid ${U.border}`, color: U.inkSoft, fontWeight: 600, fontSize: 13, padding: '10px 6px', borderRadius: 13 }}
            >
              {activeAction === 'concierge' ? 'Requesting review…' : 'Ask the concierge'}
            </button>
            <button
              onClick={onClose}
              disabled={Boolean(activeAction)}
              className="w-full disabled:opacity-60"
              style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: 0, color: U.subtle, fontWeight: 600, fontSize: 13, padding: '8px 6px' }}
            >
              Not now
            </button>
          </>
        }
      >
        {/* header */}
        <div className="mb-1.5 flex items-center gap-3">
          <div onClick={onClose} className="cursor-pointer" style={{ fontSize: 22, color: U.subtle, width: 24 }}>‹</div>
          <div className="flex-1">
            <Eyebrow>From Margot · just now</Eyebrow>
          </div>
          <MargotAvatar size={30} />
        </div>

        {/* Margot note */}
        <div className="mb-4 mt-3" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 20, padding: '15px 17px' }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: U.inkSoft }}>
            {first}'s {gift?.occasion || 'occasion'} is {days != null ? (days <= 0 ? 'here' : `in ${days} days`) : 'coming up'}. I found
            something I think they'll love. It fits what you've told me, and it's the kind of specific they like.
          </p>
        </div>

        {/* product card */}
        <div className="mb-4" style={{ background: U.surface, border: `1px solid ${U.border}`, borderRadius: 24, overflow: 'hidden' }}>
          {gift?.gift_image_url ? (
            <img src={gift.gift_image_url} alt={giftTitle} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                height: 200,
                background: 'repeating-linear-gradient(135deg,#E8DFCC,#E8DFCC 13px,#E1D6BE 13px,#E1D6BE 26px)',
                display: 'flex', alignItems: 'flex-end', padding: 14,
              }}
            >
              <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: '1.5px', color: '#A08F73', background: 'rgba(250,246,238,0.85)', padding: '5px 9px', borderRadius: 7 }}>
                product · curated for {first}
              </span>
            </div>
          )}
          <div style={{ padding: '17px 18px' }}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="font-display" style={{ fontSize: 21, letterSpacing: '-0.3px', lineHeight: 1.15 }}>{giftTitle}</div>
              {priceLabel && <div className="font-mono" style={{ fontSize: 18, fontWeight: 500, flexShrink: 0 }}>{priceLabel}</div>}
            </div>
            <div className="mb-3.5 flex items-center gap-2 font-mono" style={{ fontSize: 11, color: U.muted }}>
              <span>partner fulfillment</span><span>·</span><span>status tracked in Unwrapt</span>
            </div>
            <div className="flex items-center gap-2.5" style={{ padding: '11px 13px', borderRadius: 13, background: U.chip }}>
              <Eyebrow color={U.subtle}>Match</Eyebrow>
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: 18, height: 6, borderRadius: 3, background: U.sage }} />
                ))}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: U.sage }}>Strong</span>
            </div>
          </div>
        </div>

        {/* why this */}
        <div className="mb-4">
          <Eyebrow className="mb-2">Why this</Eyebrow>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: '#5A5147' }}>
            It matches what you've shared about {first} and the budget you set: premium without being flashy, and not
            something they'd buy themselves, which is exactly the kind of gift that lands.
          </p>
        </div>

        {recipient && (
          <div className="flex items-center gap-2 font-mono" style={{ fontSize: 11, color: U.muted }}>
            <span>For {name}</span>
            {occasionDate && <><span>·</span><span>{formatOccasionDate(occasionDate)}</span></>}
          </div>
        )}
      </MobileShell>
    </div>
  );
};

export default ApprovalScreen;
