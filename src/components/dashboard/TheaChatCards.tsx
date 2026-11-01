import React, { useState } from 'react';
import { Calendar, Check, Gift, Loader2, MapPin, Truck, UserPlus, UserRoundPen, Wallet } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CalendarSyncButton from '@/components/CalendarSyncButton';
import { U } from '@/components/unwrapt2/theme';
import { formatOccasionDate } from '@/lib/dateUtils';
import { TOP_UP_AMOUNTS, topUpFor } from '@/lib/wallet';

/** Modules thea-chat returns in top-level `ui` from present_ui. */
export type ChatUiFocus = 'details' | 'address' | 'birthday' | 'interests';
/** Where a scheduled gift is. Keep in sync with GiftStage in supabase/functions/thea-chat. */
export type GiftStage = 'scheduled' | 'funded' | 'ordered' | 'in_transit' | 'delivered';

export type GiftProgress = {
  giftId: string;
  title: string;
  imageUrl: string | null;
  occasion: string | null;
  occasionDate: string | null;
  deliveryDate: string | null;
  stage: GiftStage;
  carrier: string | null;
};

export type ChatUiModule =
  | { module: 'calendar_connect' }
  | { module: 'add_recipient'; focus?: ChatUiFocus }
  | { module: 'edit_recipient'; recipientId: string; recipientName: string; focus?: ChatUiFocus }
  | { module: 'wallet_topup'; scheduledGiftId: string; recipientName: string; giftTitle: string; needed: number; available: number }
  | { module: 'gift_progress'; recipientId: string; recipientName: string; gifts: GiftProgress[] };

/** A catalog product as thea-chat returns it in `products`. */
export type ChatProduct = {
  id: string;
  title: string;
  price: number;
  currency?: string;
  featured_image_url: string | null;
  description?: string | null;
  product_type?: string | null;
};

/** select_gift's review, returned by thea-chat as `review`. */
export type GiftReview = {
  recipientId: string;
  recipientName: string;
  productId: string;
  productTitle: string;
  price: number;
  currency: string;
  occasionDate: string;
  occasion: string;
  hasAddress: boolean;
};

export type ReviewState = 'pending' | 'confirming' | 'scheduled';

export type ReviewAddress = { street: string; city: string; state: string; zipCode: string };

const blankAddress: ReviewAddress = { street: '', city: '', state: '', zipCode: '' };
const addressInput = 'min-h-11 w-full min-w-0 rounded-[11px] border bg-white px-3 text-[16px] text-[#2A2520] outline-none placeholder:text-[#9A8E7C] focus:border-[#B65B3C]';

const money = (price: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: price % 1 ? 2 : 0 }).format(price);

export const ProductImage: React.FC<{ src: string | null; className: string }> = ({ src, className }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`${className} flex items-center justify-center overflow-hidden bg-[#EFE7DA]`}>
      {src && !broken
        ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        : <Gift className="h-6 w-6 text-[#B65B3C]/55" aria-hidden="true" />}
    </div>
  );
};

/** Recommended gifts under a Thea reply. Tapping a card opens its detail; Select hands it back to Thea. */
export const ProductCards: React.FC<{
  products: ChatProduct[];
  selectedId?: string | null;
  disabled?: boolean;
  onSelect: (product: ChatProduct) => void;
}> = ({ products, selectedId, disabled, onSelect }) => {
  const [detail, setDetail] = useState<ChatProduct | null>(null);
  const select = (product: ChatProduct) => {
    setDetail(null);
    onSelect(product);
  };

  return (
    <>
      <div className="-mx-1 mt-2 flex gap-2.5 overflow-x-auto px-1 pb-1" role="list" aria-label="Recommended gifts">
        {products.map((product) => {
          const selected = selectedId === product.id;
          return (
            <div key={product.id} role="listitem" className="flex w-[148px] shrink-0 flex-col rounded-[16px] border bg-white p-2" style={{ borderColor: selected ? U.ink : '#DED2C1' }}>
              <button type="button" onClick={() => setDetail(product)} className="u-press text-left" aria-label={`View ${product.title}`}>
                <ProductImage src={product.featured_image_url} className="aspect-square w-full rounded-[11px]" />
                <p className="mt-2 line-clamp-2 min-h-[32px] text-[12px] font-semibold leading-4 text-[#2A2520]">{product.title}</p>
                <p className="mt-1 text-[12px] font-semibold text-[#B65B3C]">{money(product.price, product.currency)}</p>
              </button>
              <button
                type="button"
                onClick={() => select(product)}
                disabled={disabled || selected}
                className="u-press mt-2 min-h-10 rounded-[11px] text-[12px] font-semibold disabled:opacity-60"
                style={{ background: selected ? U.sageSoft : U.ink, color: selected ? U.sage : U.buttonText }}
              >
                {selected ? 'Selected' : 'Select gift'}
              </button>
            </div>
          );
        })}
      </div>

      <Sheet open={Boolean(detail)} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-[28px] border-0 bg-[#F7F1E6] px-5 pb-8 pt-5 sm:mx-auto sm:max-w-[440px]">
          {detail && (
            <>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#2A2520]/15" />
              <ProductImage src={detail.featured_image_url} className="aspect-[4/3] w-full rounded-[20px]" />
              <SheetHeader className="mt-4 text-left">
                <SheetTitle className="font-display text-[24px] font-normal leading-tight text-[#2A2520]">{detail.title}</SheetTitle>
                <SheetDescription className="text-[15px] font-semibold text-[#B65B3C]">{money(detail.price, detail.currency)}</SheetDescription>
              </SheetHeader>
              {detail.description && <p className="mt-3 whitespace-pre-line text-[13.5px] leading-6 text-[#5A5147]">{detail.description}</p>}
              <button
                type="button"
                onClick={() => select(detail)}
                disabled={disabled || selectedId === detail.id}
                className="u-press mt-5 min-h-12 w-full rounded-[16px] text-[14px] font-semibold disabled:opacity-60"
                style={{ background: U.ink, color: U.buttonText }}
              >
                {selectedId === detail.id ? 'Selected' : 'Select this gift'}
              </button>
              <p className="mt-2 text-center text-[11.5px]" style={{ color: U.muted }}>Nothing is purchased until you review and confirm.</p>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

/**
 * Everything needed to decide, in one place, with a single confirm action.
 * The address is entered right here for this recipient only, and confirming waits until one is on file.
 */
export const ReviewCard: React.FC<{
  review: GiftReview;
  state: ReviewState;
  disabled?: boolean;
  /** The recipient's saved address, read live so the card updates as soon as it's saved; null when incomplete. */
  address: ReviewAddress | null;
  /** Live: true once the approved gift's funds are held (or it's further along). */
  funded: boolean;
  onConfirm: () => void;
  onChange: () => void;
  onSaveAddress: (address: ReviewAddress) => Promise<boolean>;
  onViewPlan: () => void;
}> = ({ review, state, disabled, address, funded, onConfirm, onChange, onSaveAddress, onViewPlan }) => {
  const first = review.recipientName.split(' ')[0];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ReviewAddress>(blankAddress);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const hasAddress = Boolean(address);
  const draftComplete = Boolean(draft.street.trim() && draft.city.trim() && draft.state.trim() && draft.zipCode.trim());

  const startEditing = () => {
    setDraft(address ?? blankAddress);
    setSaveFailed(false);
    setEditing(true);
  };

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draftComplete || saving) return;
    setSaving(true);
    setSaveFailed(false);
    const ok = await onSaveAddress({
      street: draft.street.trim(), city: draft.city.trim(), state: draft.state.trim(), zipCode: draft.zipCode.trim(),
    });
    setSaving(false);
    if (ok) setEditing(false);
    else setSaveFailed(true);
  };

  const set = (field: keyof ReviewAddress) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [field]: event.target.value }));

  return (
    <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label="Gift review">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
        {state === 'scheduled' ? 'Approved' : 'Review before scheduling'}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold leading-5 text-[#2A2520]">{review.productTitle}</p>
      <dl className="mt-2 grid gap-1 text-[12.5px] text-[#5A5147]">
        <div className="flex justify-between gap-3"><dt>For</dt><dd className="font-medium text-[#2A2520]">{review.recipientName}</dd></div>
        <div className="flex justify-between gap-3"><dt>Occasion</dt><dd className="font-medium text-[#2A2520]">{review.occasion} · {formatOccasionDate(review.occasionDate)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Price</dt><dd className="font-medium text-[#2A2520]">{money(review.price, review.currency)}</dd></div>
      </dl>
      {editing ? (
        <form onSubmit={saveAddress} className="mt-2.5 rounded-[12px] p-3" style={{ background: U.accentSoft }} aria-label={`${first}'s delivery address`}>
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#3A332B]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Where should it go for {first}?
          </p>
          <div className="grid gap-2">
            <input aria-label="Street address" placeholder="Street address" autoComplete="shipping street-address" value={draft.street} onChange={set('street')} className={addressInput} style={{ borderColor: '#DED2C1' }} autoFocus />
            <input aria-label="City" placeholder="City" autoComplete="shipping address-level2" value={draft.city} onChange={set('city')} className={addressInput} style={{ borderColor: '#DED2C1' }} />
            <div className="grid grid-cols-2 gap-2">
              <input aria-label="State" placeholder="State" autoComplete="shipping address-level1" value={draft.state} onChange={set('state')} className={addressInput} style={{ borderColor: '#DED2C1' }} />
              <input aria-label="ZIP code" placeholder="ZIP code" autoComplete="shipping postal-code" inputMode="numeric" value={draft.zipCode} onChange={set('zipCode')} className={addressInput} style={{ borderColor: '#DED2C1' }} />
            </div>
          </div>
          {saveFailed && <p className="mt-2 text-[12px]" style={{ color: U.accent }}>Couldn’t save that address. Try again.</p>}
          <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="u-press min-h-10 rounded-[11px] border bg-white px-3.5 text-[12.5px] font-semibold disabled:opacity-50" style={{ borderColor: U.border, color: U.ink }}>
              Cancel
            </button>
            <button type="submit" disabled={!draftComplete || saving} className="u-press flex min-h-10 items-center justify-center gap-2 rounded-[11px] text-[12.5px] font-semibold disabled:opacity-50" style={{ background: U.ink, color: U.buttonText }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {saving ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-2.5 flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]" style={{ background: hasAddress ? U.sageSoft : U.accentSoft, color: '#3A332B' }}>
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {address ? `Ships to ${address.street}, ${address.city}, ${address.state} ${address.zipCode}` : `${first}'s address is needed before it ships`}
          </span>
          {state !== 'scheduled' && (
            <button type="button" onClick={startEditing} disabled={disabled} className="min-h-8 shrink-0 font-semibold text-[#B65B3C] disabled:opacity-50">
              {hasAddress ? 'Edit' : 'Add'}
            </button>
          )}
        </div>
      )}

      {state === 'scheduled' ? (
        <div className="mt-3">
          {funded ? (
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: U.sage }}>
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> Funds are held. I’ll order it closer to the date.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: U.accent }}>
              <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" /> Approved. Add wallet funds below so I can send it.
            </p>
          )}
          <button type="button" onClick={onViewPlan} className="u-press mt-2 min-h-11 w-full rounded-[12px] border text-[13px] font-semibold" style={{ borderColor: U.border, color: U.ink }}>
            View {first}'s plan
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <button type="button" onClick={onChange} disabled={disabled || state === 'confirming'} className="u-press min-h-11 rounded-[12px] border px-3.5 text-[13px] font-semibold disabled:opacity-50" style={{ borderColor: U.border, color: U.ink }}>
            Change
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || state === 'confirming' || !hasAddress || editing}
            title={hasAddress ? undefined : `Add ${first}'s address first`}
            aria-busy={state === 'confirming'}
            className={`u-press flex min-h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold ${state === 'confirming' ? 'disabled:opacity-70' : 'disabled:opacity-35'}`}
            style={{ background: U.ink, color: U.buttonText }}
          >
            {state === 'confirming' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {state === 'confirming' ? 'Scheduling…' : 'Confirm gift'}
          </button>
        </div>
      )}
    </section>
  );
};

const focusLabel = (focus?: ChatUiFocus) => {
  switch (focus) {
    case 'address': return 'delivery address';
    case 'birthday': return 'birthday or anniversary';
    case 'interests': return 'interests';
    default: return 'details';
  }
};

/** Google / birthday-source connect, reusing the dashboard calendar flow. */
export const CalendarConnectCard: React.FC<{ onAddManually: () => void }> = ({ onAddManually }) => (
  <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label="Connect calendar">
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
      <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Calendar
    </p>
    <p className="mt-1.5 text-[14px] font-semibold leading-5 text-[#2A2520]">Import birthdays &amp; anniversaries</p>
    <p className="mt-1 text-[12.5px] leading-5 text-[#5A5147]">Connect Google Calendar or another source. We pull every birthday and anniversary we find — you choose who to add before anything is saved.</p>
    <div className="mt-3">
      <CalendarSyncButton appearance="pill" returnTo="/?tab=thea" onAddManually={onAddManually} />
    </div>
  </section>
);

/** Opens the existing add-recipient editor from chat. */
export const AddRecipientCard: React.FC<{ focus?: ChatUiFocus; onOpen: () => void }> = ({ focus, onOpen }) => (
  <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label="Add recipient">
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
      <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> New person
    </p>
    <p className="mt-1.5 text-[14px] font-semibold leading-5 text-[#2A2520]">Add someone Thea should look after</p>
    <p className="mt-1 text-[12.5px] leading-5 text-[#5A5147]">
      Name, occasion dates, interests, and address when you have them{focus && focus !== 'details' ? ` — starting with ${focusLabel(focus)}` : ''}.
    </p>
    <button type="button" onClick={onOpen} className="u-press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold" style={{ background: U.ink, color: U.buttonText }}>
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      Open add form
    </button>
  </section>
);

/** Opens the existing edit-recipient editor for a known person. */
export const EditRecipientCard: React.FC<{
  recipientName: string;
  focus?: ChatUiFocus;
  onOpen: () => void;
}> = ({ recipientName, focus, onOpen }) => {
  const first = recipientName.split(' ')[0] || recipientName;
  return (
    <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label={`Edit ${recipientName}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
        <UserRoundPen className="h-3.5 w-3.5" aria-hidden="true" /> Update details
      </p>
      <p className="mt-1.5 text-[14px] font-semibold leading-5 text-[#2A2520]">{first}&apos;s {focusLabel(focus)}</p>
      <p className="mt-1 text-[12.5px] leading-5 text-[#5A5147]">Edit in the same form you use elsewhere — address, birthday, interests, and more.</p>
      <button type="button" onClick={onOpen} className="u-press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold" style={{ background: U.ink, color: U.buttonText }}>
        <UserRoundPen className="h-4 w-4" aria-hidden="true" />
        Open {first}&apos;s form
      </button>
    </section>
  );
};

/**
 * Funds a gift from the wallet. Offers fixed top-ups with the smallest one that covers the gift preselected;
 * amounts too small to cover it are disabled. Once the funds are held it says so instead.
 */
export const WalletTopUpCard: React.FC<{
  module: Extract<ChatUiModule, { module: 'wallet_topup' }>;
  /** The gift's live stage, so the card flips to "held" after a top-up completes. */
  stage: GiftStage | null;
  disabled?: boolean;
  onTopUp: (amount: number) => Promise<void>;
  onUseBalance: () => Promise<boolean>;
}> = ({ module: mod, stage, disabled, onTopUp, onUseBalance }) => {
  const first = mod.recipientName.split(' ')[0] || mod.recipientName;
  const shortfall = Math.max(0, Math.round((mod.needed - mod.available) * 100) / 100);
  const [selected, setSelected] = useState(() => topUpFor(shortfall));
  const [busy, setBusy] = useState<'topup' | 'balance' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const funded = stage != null && stage !== 'scheduled';

  if (funded) {
    return (
      <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label="Gift funded">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: U.sage }}>
          <Check className="h-4 w-4" aria-hidden="true" /> {money(mod.needed)} is set aside for {first}&apos;s gift
        </p>
        <p className="mt-1 text-[12.5px] leading-5 text-[#5A5147]">It&apos;s charged only when I place the order, closer to the date.</p>
      </section>
    );
  }

  const topUp = async () => {
    setBusy('topup');
    setNote(null);
    try {
      await onTopUp(selected);
    } catch {
      setNote('Couldn’t open checkout. Try again.');
      setBusy(null);
    }
  };

  const holdFromBalance = async () => {
    setBusy('balance');
    setNote(null);
    const held = await onUseBalance().catch(() => false);
    if (!held) setNote('Your balance doesn’t cover it yet.');
    setBusy(null);
  };

  return (
    <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label="Add wallet funds">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" /> Wallet
      </p>
      <p className="mt-1.5 text-[14px] font-semibold leading-5 text-[#2A2520]">Add funds for {first}&apos;s gift</p>
      <p className="mt-1 text-[12.5px] leading-5 text-[#5A5147]">
        {mod.giftTitle} needs {money(mod.needed)} including the service fee. You have {money(Math.max(0, mod.available))} available.
      </p>

      {shortfall > 0 ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Top-up amount">
            {TOP_UP_AMOUNTS.map((amount) => {
              const tooSmall = amount < shortfall && amount !== topUpFor(shortfall);
              const active = selected === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={tooSmall || busy !== null}
                  onClick={() => setSelected(amount)}
                  className="u-press min-h-11 rounded-[11px] border text-[13px] font-semibold disabled:opacity-35"
                  style={{ borderColor: active ? U.ink : '#DED2C1', background: active ? U.ink : '#fff', color: active ? U.buttonText : U.ink }}
                >
                  ${amount}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void topUp()}
            disabled={disabled || busy !== null}
            className="u-press mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold disabled:opacity-60"
            style={{ background: U.ink, color: U.buttonText }}
          >
            {busy === 'topup' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Add ${selected} and hold it for {first}
          </button>
          <button type="button" onClick={() => void holdFromBalance()} disabled={disabled || busy !== null} className="mt-1.5 min-h-9 w-full text-[12px] font-semibold disabled:opacity-50" style={{ color: U.accent }}>
            {busy === 'balance' ? 'Checking…' : 'Already added funds? Use my balance'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void holdFromBalance()}
          disabled={disabled || busy !== null}
          className="u-press mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold disabled:opacity-60"
          style={{ background: U.ink, color: U.buttonText }}
        >
          {busy === 'balance' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Hold {money(mod.needed)} from my wallet
        </button>
      )}
      {note && <p className="mt-1.5 text-[12px]" style={{ color: U.accent }}>{note}</p>}
      <p className="mt-1.5 text-center text-[11.5px]" style={{ color: U.muted }}>Nothing is charged until the order is placed.</p>
    </section>
  );
};

const STAGES: { key: GiftStage; label: string }[] = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'funded', label: 'Funds held' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'delivered', label: 'Delivered' },
];

const stageLine = (gift: GiftProgress, stage: GiftStage) => {
  switch (stage) {
    case 'scheduled': return 'Waiting on wallet funds before I can order it.';
    case 'funded': return 'Funds are held. I’ll place the order closer to the date.';
    case 'ordered': return 'Order placed. It ships soon.';
    case 'in_transit': return gift.deliveryDate ? `On its way, due by ${formatOccasionDate(gift.deliveryDate)}.` : 'On its way.';
    case 'delivered': return 'Delivered.';
  }
};

/** A progress bar per gift for one person: scheduled → funds held → ordered → in transit → delivered. */
export const GiftProgressCard: React.FC<{
  module: Extract<ChatUiModule, { module: 'gift_progress' }>;
  /** Live stage by gift id, so the bar moves as the order does without asking Thea again. */
  stageOf: (giftId: string) => GiftStage | null;
}> = ({ module: mod, stageOf }) => {
  const first = mod.recipientName.split(' ')[0] || mod.recipientName;
  return (
    <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label={`${first}'s gift progress`}>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
        <Truck className="h-3.5 w-3.5" aria-hidden="true" /> {first}&apos;s gift
      </p>
      <div className="mt-2 space-y-4">
        {mod.gifts.map((gift) => {
          const stage = stageOf(gift.giftId) ?? gift.stage;
          const current = STAGES.findIndex((s) => s.key === stage);
          return (
            <div key={gift.giftId}>
              <div className="flex items-center gap-2.5">
                <ProductImage src={gift.imageUrl} className="h-11 w-11 shrink-0 rounded-[10px]" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold leading-5 text-[#2A2520]">{gift.title}</p>
                  {gift.occasionDate && (
                    <p className="text-[12px] text-[#5A5147]">{gift.occasion || 'Occasion'} · {formatOccasionDate(gift.occasionDate)}</p>
                  )}
                </div>
              </div>

              <div className="relative mt-3">
                <div className="absolute left-[10%] right-[10%] top-[7px] h-[3px] rounded-full" style={{ background: '#EDE4D6' }} aria-hidden="true" />
                <div
                  className="absolute left-[10%] top-[7px] h-[3px] rounded-full transition-[width] duration-700"
                  style={{ width: `${(current / (STAGES.length - 1)) * 80}%`, background: U.sage }}
                  aria-hidden="true"
                />
                <ol className="relative grid grid-cols-5" aria-label={`Status: ${STAGES[current].label}`}>
                  {STAGES.map((s, i) => {
                    const done = i <= current;
                    return (
                      <li key={s.key} className="relative flex flex-col items-center" aria-current={i === current ? 'step' : undefined}>
                        <span
                          className="flex h-[17px] w-[17px] items-center justify-center rounded-full border-2"
                          style={{ borderColor: done ? U.sage : '#DED2C1', background: i < current ? U.sage : '#fff' }}
                        >
                          {i === current && <span className="h-[7px] w-[7px] rounded-full" style={{ background: U.sage }} />}
                        </span>
                        <span className={`mt-1.5 text-center text-[10px] leading-3 ${i === current ? 'font-semibold text-[#2A2520]' : 'text-[#9A8E7C]'}`}>
                          {s.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-[#5A5147]">{stageLine(gift, stage)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** Renders every present_ui module attached to a Thea reply. */
export const ChatUiModules: React.FC<{
  modules: ChatUiModule[];
  disabled?: boolean;
  onAddRecipient: () => void;
  onEditRecipient: (recipientId: string, focus?: ChatUiFocus) => void;
  stageOf: (giftId: string) => GiftStage | null;
  onTopUp: (mod: Extract<ChatUiModule, { module: 'wallet_topup' }>, amount: number) => Promise<void>;
  onUseBalance: (mod: Extract<ChatUiModule, { module: 'wallet_topup' }>) => Promise<boolean>;
}> = ({ modules, disabled, onAddRecipient, onEditRecipient, stageOf, onTopUp, onUseBalance }) => (
  <>
    {modules.map((mod, i) => {
      if (mod.module === 'calendar_connect') {
        return <CalendarConnectCard key={`calendar-${i}`} onAddManually={onAddRecipient} />;
      }
      if (mod.module === 'add_recipient') {
        return <AddRecipientCard key={`add-${i}`} focus={mod.focus} onOpen={onAddRecipient} />;
      }
      if (mod.module === 'wallet_topup') {
        return (
          <WalletTopUpCard
            key={`topup-${mod.scheduledGiftId}-${i}`}
            module={mod}
            stage={stageOf(mod.scheduledGiftId)}
            disabled={disabled}
            onTopUp={(amount) => onTopUp(mod, amount)}
            onUseBalance={() => onUseBalance(mod)}
          />
        );
      }
      if (mod.module === 'gift_progress') {
        return <GiftProgressCard key={`progress-${mod.recipientId}-${i}`} module={mod} stageOf={stageOf} />;
      }
      return (
        <EditRecipientCard
          key={`edit-${mod.recipientId}-${i}`}
          recipientName={mod.recipientName}
          focus={mod.focus}
          onOpen={() => onEditRecipient(mod.recipientId, mod.focus)}
        />
      );
    })}
  </>
);
