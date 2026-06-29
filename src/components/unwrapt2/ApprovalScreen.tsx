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

interface ApprovalScreenProps {
  gift: any;        // scheduled_gifts row
  recipient: any;   // recipients row
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
  const [approving, setApproving] = useState(false);

  const name = cleanName(recipient?.name || 'them');
  const first = name.split(' ')[0];
  const occasionDate = gift?.occasion_date || recipient?.birthday || recipient?.anniversary;
  const days = occasionDate ? getDaysUntil(occasionDate) : null;
  const price = gift?.estimated_cost ?? gift?.price_range ?? null;
  const priceLabel = typeof price === 'number' ? `$${Math.round(price)}` : (price || '');
  const giftTitle = gift?.gift_description || gift?.gift_type || 'A thoughtful gift';

  const approve = async () => {
    if (!user || !gift?.id) return;
    setApproving(true);
    try {
      const { error } = await supabase.functions.invoke('confirm-gift', { body: { giftId: gift.id } });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['recipients', user.id] });
      toast({ title: 'Gift confirmed', description: `${first}'s gift will be processed and shipped soon.` });
      onApproved?.();
      onClose();
    } catch (e: any) {
      toast({
        title: "Couldn't confirm",
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <MobileShell
        contentClassName="px-5 pt-14 pb-3"
        footer={
          <>
            <PrimaryButton onClick={approve} disabled={approving} className="mb-2.5">
              {approving ? 'Confirming…' : `Approve & send${priceLabel ? ` — ${priceLabel}` : ''}`}
            </PrimaryButton>
            <button
              onClick={onClose}
              className="w-full"
              style={{ appearance: 'none', cursor: 'pointer', background: 'transparent', border: `1px solid ${U.borderStrong}`, color: U.ink, fontWeight: 600, fontSize: 13.5, padding: '12px 6px', borderRadius: 13 }}
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
            something I think they'll love — it fits what you've told me, and it's the kind of specific they like.
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
              <span>free returns</span><span>·</span><span>arrives before the day</span>
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
            It matches what you've shared about {first} and the budget you set — premium without being flashy, and not
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
