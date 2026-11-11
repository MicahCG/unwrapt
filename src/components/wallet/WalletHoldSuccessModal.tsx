import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { U } from '@/components/unwrapt2/theme';
import { formatGiftTimingLine, type GiftOrderTiming } from '@/lib/giftTiming';

const money = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

export type WalletHoldSuccess = {
  amount: number;
  recipientName: string;
  giftTitle: string;
  timing: GiftOrderTiming | null;
  /** True when returning from a Stripe top-up; false when holding existing balance. */
  fromTopUp?: boolean;
};

interface WalletHoldSuccessModalProps {
  open: boolean;
  detail: WalletHoldSuccess | null;
  onClose: () => void;
}

/** Shown after a wallet top-up successfully holds funds for a gift — clearer than chat prose alone. */
export const WalletHoldSuccessModal: React.FC<WalletHoldSuccessModalProps> = ({ open, detail, onClose }) => {
  if (!detail) return null;
  const first = detail.recipientName.split(' ')[0] || detail.recipientName;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="max-w-[min(360px,calc(100vw-2rem))] gap-0 rounded-[24px] border p-0 sm:rounded-[24px]"
        style={{ background: U.surface, borderColor: U.border }}
      >
        <div className="px-5 pb-5 pt-6 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: U.sageSoft, color: U.sage }}
            aria-hidden="true"
          >
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
            Funds held
          </p>
          <h2 className="mt-1 font-display text-[22px] font-normal leading-tight" style={{ color: U.ink }}>
            {money(detail.amount)} set aside
          </h2>
          <p className="mt-2 text-[13.5px] leading-6" style={{ color: U.textSecondary }}>
            For {first}&apos;s {detail.giftTitle}. Nothing is charged until the order goes out.
          </p>
          {detail.timing && (
            <p
              className="mt-3 rounded-[14px] px-3 py-2.5 text-left text-[12.5px] leading-5"
              style={{ background: U.chip, color: U.ink }}
            >
              {formatGiftTimingLine(detail.timing)}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="u-press mt-4 min-h-11 w-full rounded-[14px] text-[13.5px] font-semibold"
            style={{ background: U.ink, color: U.buttonText }}
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
