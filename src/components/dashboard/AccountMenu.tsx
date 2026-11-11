import React, { useEffect, useState } from 'react';
import { Crown, Settings, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { U, initialsOf } from '@/components/unwrapt2/theme';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatHeldFundsStatus } from '@/lib/giftTiming';
import { getWalletBreakdown, type PendingReservation } from '@/lib/wallet';

interface AccountMenuProps {
  displayName: string;
  planLabel: string;
  tier: 'free' | 'vip';
  walletBalance?: number | null;
  /** Gifts at or under this amount can be confirmed without asking; 0 means always ask. */
  autopilotThreshold: number;
  onAddFunds: () => void;
  onOpenSettings: () => void;
}

const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

/** Spendable funds — sage from the Unwrapt palette (ready / free to use). */
const availableTone = U.sage;
/** Held for upcoming gifts — warm muted taupe, quieter than Available. */
const reservedTone = U.muted;

/**
 * The profile thumbnail doubles as the wallet: balance at a glance, Add funds one tap away,
 * and a plain explanation of how membership and autopilot differ.
 */
const AccountMenu: React.FC<AccountMenuProps> = ({
  displayName, planLabel, tier, walletBalance, autopilotThreshold, onAddFunds, onOpenSettings,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reserved, setReserved] = useState(0);
  const [available, setAvailable] = useState<number | null>(null);
  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const hasWallet = tier === 'vip' && walletBalance != null;
  const close = (then: () => void) => () => {
    setOpen(false);
    then();
  };

  // Load Available (balance − reserved) as soon as the wallet is known — never wait for the
  // dropdown. Falling back to gross `walletBalance` made the header pill flash the total.
  useEffect(() => {
    if (!hasWallet || !user?.id) {
      setReserved(0);
      setAvailable(null);
      setReservations([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const breakdown = await getWalletBreakdown(user.id);
      if (cancelled) return;
      setReserved(breakdown.reserved);
      setAvailable(breakdown.available);
      setReservations(breakdown.reservations);
    })();
    return () => { cancelled = true; };
  }, [hasWallet, user?.id, walletBalance]);

  const availableLabel = available != null ? money(available) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="u-press u-account-glass-pill flex min-h-11 items-center gap-2 rounded-full py-1 pl-3 pr-1"
          aria-label={
            hasWallet
              ? `VIP account and gift wallet${availableLabel ? `, available ${availableLabel}` : ''}`
              : tier === 'vip'
                ? 'VIP account'
                : 'Account'
          }
        >
          {hasWallet && availableLabel && (
            <span className="font-mono text-[12px] font-semibold">{availableLabel}</span>
          )}
          <span className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center">
            <span
              className="flex h-full w-full items-center justify-center rounded-full"
              style={{ background: U.surface, fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15 }}
            >
              {initialsOf(displayName).charAt(0)}
            </span>
            {tier === 'vip' && (
              <span
                className="absolute -right-0.5 -top-1 flex h-[16px] w-[16px] items-center justify-center rounded-full"
                style={{
                  background: '#FBEFE5',
                  border: '1px solid rgba(182,91,60,0.35)',
                  boxShadow: '0 1px 2px rgba(42,37,32,0.08)',
                }}
                aria-hidden="true"
              >
                <Crown className="h-[9px] w-[9px]" style={{ color: '#B65B3C' }} />
              </span>
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(300px,calc(100vw-2rem))] rounded-[20px] border p-4" style={{ background: U.surface, borderColor: U.border }}>
        <p className="text-[15px] font-semibold" style={{ color: U.ink }}>{displayName}</p>
        <p className="text-[12px]" style={{ color: U.muted }}>{planLabel} membership</p>

        <div className="mt-3 rounded-[14px] p-3" style={{ background: U.chip }}>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: U.textSecondary }}>
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Gift wallet
          </div>
          {hasWallet ? (
            <>
              <p className="mt-1 font-mono text-[20px] font-semibold" style={{ color: U.ink }}>{money(walletBalance!)}</p>
              <dl className="mt-2 grid gap-1 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt style={{ color: availableTone }}>Available</dt>
                  <dd className="font-mono font-semibold" style={{ color: availableTone }}>{availableLabel ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: reservedTone }}>Reserved</dt>
                  <dd className="font-mono font-medium" style={{ color: reservedTone }}>{money(reserved)}</dd>
                </div>
              </dl>
              {reservations.length > 0 && (
                <ul className="mt-2 space-y-1.5 border-t pt-2" style={{ borderColor: 'rgba(42,37,32,0.08)' }} aria-label="Reserved for upcoming gifts">
                  {reservations.map((row) => {
                    const first = row.recipientName.split(' ')[0] || row.recipientName;
                    return (
                      <li key={row.scheduledGiftId} className="text-[11.5px] leading-4" style={{ color: reservedTone, opacity: 0.9 }}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="font-medium" style={{ color: reservedTone }}>{first}</span>
                            {' · '}
                            {row.giftTitle}
                          </span>
                          <span className="shrink-0 font-mono font-medium" style={{ color: reservedTone }}>{money(row.amount)}</span>
                        </div>
                        <p className="mt-0.5">{formatHeldFundsStatus({
                          amount: row.amount,
                          recipientName: row.recipientName,
                          occasionDate: row.occasionDate,
                          fulfillmentError: row.fulfillmentError,
                        })}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button type="button" onClick={close(onAddFunds)} className="u-press mt-2 min-h-11 w-full rounded-[12px] text-[13px] font-semibold" style={{ background: U.ink, color: U.buttonText }}>
                Add funds
              </button>
            </>
          ) : (
            <p className="mt-1 text-[12.5px] leading-5" style={{ color: U.textSecondary }}>Available with VIP. Gifts can still be paid at checkout.</p>
          )}
        </div>

        <p className="mt-3 text-[12px] leading-5" style={{ color: U.textSecondary }}>
          <strong style={{ color: U.ink }}>Membership</strong> unlocks Thea and the gift wallet.{' '}
          <strong style={{ color: U.ink }}>Autopilot</strong> decides when Thea needs your OK:{' '}
          {autopilotThreshold > 0 ? `she asks before any gift over ${money(autopilotThreshold).replace('.00', '')}.` : 'she asks before every gift.'}
        </p>

        <button type="button" onClick={close(onOpenSettings)} className="u-press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: U.border, color: U.ink }}>
          <Settings className="h-4 w-4" aria-hidden="true" /> Settings
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default AccountMenu;
