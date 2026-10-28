import React, { useState } from 'react';
import { Settings, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { U, initialsOf } from '@/components/unwrapt2/theme';

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

/**
 * The profile thumbnail doubles as the wallet: balance at a glance, Add funds one tap away,
 * and a plain explanation of how membership and autopilot differ.
 */
const AccountMenu: React.FC<AccountMenuProps> = ({
  displayName, planLabel, tier, walletBalance, autopilotThreshold, onAddFunds, onOpenSettings,
}) => {
  const [open, setOpen] = useState(false);
  const hasWallet = tier === 'vip' && walletBalance != null;
  const close = (then: () => void) => () => {
    setOpen(false);
    then();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="u-press flex min-h-11 items-center gap-2 rounded-full py-1 pl-3 pr-1"
          style={{ background: '#E5DBC6', color: '#5A5147' }}
          aria-label={hasWallet ? `Account and gift wallet, balance ${money(walletBalance!)}` : 'Account'}
        >
          {hasWallet && <span className="font-mono text-[12px] font-semibold">{money(walletBalance!)}</span>}
          <span
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full"
            style={{ background: U.surface, fontFamily: "'Newsreader', serif", fontStyle: 'italic', fontSize: 15 }}
          >
            {initialsOf(displayName).charAt(0)}
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
              <p className="mt-1 font-mono text-[20px]" style={{ color: U.ink }}>{money(walletBalance!)}</p>
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
