import React, { useState } from 'react';
import { Calendar, Check, Gift, Loader2, MapPin, UserPlus, UserRoundPen } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import CalendarSyncButton from '@/components/CalendarSyncButton';
import { U } from '@/components/unwrapt2/theme';
import { formatOccasionDate } from '@/lib/dateUtils';

/** Modules thea-chat returns in top-level `ui` from present_ui. */
export type ChatUiFocus = 'details' | 'address' | 'birthday' | 'interests';
export type ChatUiModule =
  | { module: 'calendar_connect' }
  | { module: 'add_recipient'; focus?: ChatUiFocus }
  | { module: 'edit_recipient'; recipientId: string; recipientName: string; focus?: ChatUiFocus };

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

/** Everything needed to decide, in one place, with a single confirm action. */
export const ReviewCard: React.FC<{
  review: GiftReview;
  state: ReviewState;
  disabled?: boolean;
  onConfirm: () => void;
  onChange: () => void;
  onAddAddress: () => void;
  onViewPlan: () => void;
}> = ({ review, state, disabled, onConfirm, onChange, onAddAddress, onViewPlan }) => {
  const first = review.recipientName.split(' ')[0];
  return (
    <section className="mt-2 rounded-[18px] border bg-white p-3.5" style={{ borderColor: '#DED2C1' }} aria-label="Gift review">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.accent }}>
        {state === 'scheduled' ? 'Scheduled' : 'Review before scheduling'}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold leading-5 text-[#2A2520]">{review.productTitle}</p>
      <dl className="mt-2 grid gap-1 text-[12.5px] text-[#5A5147]">
        <div className="flex justify-between gap-3"><dt>For</dt><dd className="font-medium text-[#2A2520]">{review.recipientName}</dd></div>
        <div className="flex justify-between gap-3"><dt>Occasion</dt><dd className="font-medium text-[#2A2520]">{review.occasion} · {formatOccasionDate(review.occasionDate)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Price</dt><dd className="font-medium text-[#2A2520]">{money(review.price, review.currency)}</dd></div>
      </dl>
      <div className="mt-2.5 flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]" style={{ background: review.hasAddress ? U.sageSoft : U.accentSoft, color: '#3A332B' }}>
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="flex-1">{review.hasAddress ? 'Delivery address on file' : `${first}'s address is needed before it ships`}</span>
        {!review.hasAddress && <button type="button" onClick={onAddAddress} className="min-h-8 font-semibold text-[#B65B3C]">Add</button>}
      </div>

      {state === 'scheduled' ? (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: U.sage }}>
            <Check className="h-4 w-4" aria-hidden="true" /> Saved to {first}'s gift plan. Payment is still pending.
          </p>
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
            disabled={disabled || state === 'confirming'}
            aria-busy={state === 'confirming'}
            className="u-press flex min-h-11 items-center justify-center gap-2 rounded-[12px] text-[13px] font-semibold disabled:opacity-70"
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
    <p className="mt-1 text-[12.5px] leading-5 text-[#5A5147]">Connect Google Calendar or another source. You choose who to add before anything is saved.</p>
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

/** Renders every present_ui module attached to a Thea reply. */
export const ChatUiModules: React.FC<{
  modules: ChatUiModule[];
  onAddRecipient: () => void;
  onEditRecipient: (recipientId: string, focus?: ChatUiFocus) => void;
}> = ({ modules, onAddRecipient, onEditRecipient }) => (
  <>
    {modules.map((mod, i) => {
      if (mod.module === 'calendar_connect') {
        return <CalendarConnectCard key={`calendar-${i}`} onAddManually={onAddRecipient} />;
      }
      if (mod.module === 'add_recipient') {
        return <AddRecipientCard key={`add-${i}`} focus={mod.focus} onOpen={onAddRecipient} />;
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
