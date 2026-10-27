import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, MapPin, Package, Truck } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { cleanName } from '@/lib/utils';
import { getGiftRecommendations, type GiftCatalogItem } from '@/lib/giftCatalog';
import { ProductImage } from '@/components/dashboard/TheaChatCards';
import { U } from '@/components/unwrapt2/theme';
import type { RecipientRecord } from '@/lib/giftStatus';

type ScheduleRecipient = RecipientRecord & {
  _holidayPreset?: Partial<{ occasion_date: string; street: string; city: string; state: string; zip_code: string; country: string }>;
};

interface ScheduleGiftModalProps {
  recipient: ScheduleRecipient;
  isOpen: boolean;
  onClose: () => void;
  /** An unpaid gift that only needs a shipping address before payment resumes. */
  payingForGiftId?: string | null;
  /** A gift already picked (e.g. in the catalog); the sheet opens on its review. */
  initialProduct?: GiftCatalogItem | null;
}

type Step = 'choose' | 'review';
type Address = { street: string; city: string; state: string; zip_code: string; country: string };

const ALL = '__all__';
// Matches thea-chat's confirm_scheduled_gift: these statuses don't block a new plan for the same date.
const NON_BLOCKING_STATUSES = new Set(['cancelled', 'expired']);

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const hasFullAddress = (a: Address) => Boolean(a.street && a.city && a.state && a.zip_code);

/** The next birthday or anniversary on file, or a blank custom occasion. */
const nextOccasion = (recipient: ScheduleRecipient) => {
  const today = new Date();
  const upcoming = (iso: string | null | undefined, occasion: string) => {
    if (!iso) return null;
    const d = parseISO(iso);
    const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return { occasion, date: format(next, 'yyyy-MM-dd') };
  };
  return upcoming(recipient.birthday, 'Birthday') || upcoming(recipient.anniversary, 'Anniversary') || { occasion: 'Special occasion', date: '' };
};

const ScheduleGiftModal: React.FC<ScheduleGiftModalProps> = ({ recipient, isOpen, onClose, payingForGiftId, initialProduct }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const defaults = nextOccasion(recipient);
  const [step, setStep] = useState<Step>(initialProduct || payingForGiftId ? 'review' : 'choose');
  const [filter, setFilter] = useState<string>(ALL);
  const [product, setProduct] = useState<GiftCatalogItem | null>(initialProduct || null);
  const [occasionDate, setOccasionDate] = useState('');
  const [address, setAddress] = useState<Address>({ street: '', city: '', state: '', zip_code: '', country: 'United States' });
  const [editingAddress, setEditingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // State updates are async; the ref stops a fast double tap from creating two plans.
  const submitLock = useRef(false);

  const first = cleanName(recipient.name).split(' ')[0];
  const savedInterests = (recipient.interests || []).slice(0, 3);

  // Seed once per opening; edits to details never reset the chosen gift.
  useEffect(() => {
    if (!isOpen) return;
    const preset = recipient._holidayPreset || {};
    const next: Address = {
      street: preset.street ?? recipient.street ?? '',
      city: preset.city ?? recipient.city ?? '',
      state: preset.state ?? recipient.state ?? '',
      zip_code: preset.zip_code ?? recipient.zip_code ?? '',
      country: preset.country || recipient.country || 'United States',
    };
    setAddress(next);
    setEditingAddress(!hasFullAddress(next));
    setOccasionDate(preset.occasion_date || nextOccasion(recipient).date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, recipient.id]);

  useEffect(() => {
    if (!isOpen) return;
    setProduct(initialProduct || null);
    setStep(initialProduct || payingForGiftId ? 'review' : 'choose');
    setFilter(ALL);
  }, [isOpen, initialProduct, payingForGiftId]);

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('gift_wallet_balance, subscription_tier')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!user?.id,
  });
  const walletBalance = profile?.gift_wallet_balance || 0;

  const requested = filter === ALL ? savedInterests : [filter];
  const catalog = useQuery({
    queryKey: ['catalog-preview', [...requested].sort().join('|')],
    queryFn: () => getGiftRecommendations(requested, 6),
    enabled: isOpen && step === 'choose' && !payingForGiftId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  // Only priced catalog items can be scheduled; the order partner needs a real price.
  const products = (catalog.data?.products || []).filter((p) => p.price != null);

  const { data: existingGift } = useQuery({
    queryKey: ['scheduled-gift', recipient.id],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('scheduled_gifts')
        .select('*')
        .eq('recipient_id', recipient.id)
        .gte('occasion_date', today)
        .order('occasion_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: isOpen && !!recipient.id,
  });

  const pick = (item: GiftCatalogItem) => {
    setProduct(item);
    setStep('review');
  };

  const occasionLabel = recipient._holidayPreset ? 'Occasion' : defaults.occasion;
  const occasionType = occasionDate && occasionDate === defaults.date && defaults.occasion !== 'Special occasion'
    ? defaults.occasion.toLowerCase()
    : 'custom';
  const occasionName = occasionType === 'custom' ? 'Special occasion' : defaults.occasion;
  const isPast = Boolean(occasionDate) && occasionDate < format(new Date(), 'yyyy-MM-dd');
  const price = product?.price ?? 0;
  const payFromWallet = profile?.subscription_tier === 'vip' && walletBalance >= price;
  const missing = [
    !payingForGiftId && !product && 'a gift',
    !payingForGiftId && (!occasionDate || isPast) && 'an upcoming date',
    !hasFullAddress(address) && 'a shipping address',
  ].filter(Boolean) as string[];

  const invalidate = useCallback(() => {
    for (const key of ['recipients', 'upcoming-gifts', 'user-metrics', 'user-profile', 'scheduled-gift', 'recent-gift']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  const fail = (description: string) => toast({ title: 'Not scheduled', description, variant: 'destructive' });

  const saveAddress = async (userId: string) => {
    const { error } = await supabase
      .from('recipients')
      .update({ ...address, updated_at: new Date().toISOString() })
      .eq('id', recipient.id)
      .eq('user_id', userId);
    if (error) throw error;
  };

  // Existing confirmation email for wallet-paid gifts; card payments send theirs from the Stripe webhook.
  const notifyScheduled = async (giftType: string, amount: number) => {
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'gift_scheduled',
          recipientEmail: user?.email,
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          data: { recipientName: cleanName(recipient.name), occasion: occasionName, occasionDate, giftType, priceRange: amount },
        },
      });
    } catch (error) {
      console.error('Failed to send gift notification email:', error);
    }
  };

  const handleSubmit = async () => {
    if (submitLock.current || missing.length) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.id) {
        fail('Please sign in again and retry.');
        return;
      }
      await saveAddress(currentUser.id);

      if (payingForGiftId) {
        invalidate();
        onClose();
        window.dispatchEvent(new CustomEvent('proceedWithPayment', { detail: { giftId: payingForGiftId, recipientId: recipient.id } }));
        return;
      }
      if (!product || product.price == null) return;

      // One plan per person and date, as in Thea's confirm step.
      const { data: sameDay } = await supabase
        .from('scheduled_gifts')
        .select('id, status, gift_type')
        .eq('recipient_id', recipient.id)
        .eq('occasion_date', occasionDate)
        .order('created_at', { ascending: false })
        .limit(1);
      const duplicate = sameDay?.find((g) => !NON_BLOCKING_STATUSES.has((g.status || '').toLowerCase()));
      if (duplicate) {
        fail(`${first} already has ${duplicate.gift_type || 'a gift'} planned for that date.`);
        return;
      }

      const deliveryDate = format(subDays(parseISO(occasionDate), 3), 'yyyy-MM-dd');
      const { data: gift, error: giftError } = await supabase
        .from('scheduled_gifts')
        .insert({
          user_id: currentUser.id,
          recipient_id: recipient.id,
          occasion: occasionName,
          occasion_date: occasionDate,
          occasion_type: occasionType,
          gift_type: product.name,
          gift_variant_id: product.providerProductId || product.id,
          gift_image_url: product.imageUrl,
          estimated_cost: product.price,
          price_range: money(product.price),
          delivery_date: deliveryDate,
          status: 'scheduled',
          payment_status: payFromWallet ? 'pending' : 'unpaid',
        })
        .select()
        .single();
      if (giftError) throw giftError;

      const markSuccess = () =>
        sessionStorage.setItem('giftScheduledSuccess', JSON.stringify({ recipientId: recipient.id, timestamp: Date.now() }));

      if (payFromWallet) {
        // The wallet debit and partner order happen server-side, idempotently.
        const { data: result, error } = await supabase.functions.invoke('process-gift-fulfillment', {
          body: { scheduledGiftId: gift.id, manualTrigger: true },
        });
        if (error || result?.success === false) {
          invalidate();
          fail(`${product.name} is saved for ${first}, but the wallet payment didn't go through. Open ${first} to retry payment.`);
          return;
        }
        markSuccess();
        invalidate();
        void notifyScheduled(product.name, product.price);
        toast({ title: `Gift scheduled for ${first}`, description: `${money(product.price)} paid from your gift wallet.` });
        onClose();
        return;
      }

      const { data: payment, error: paymentError } = await supabase.functions.invoke('create-gift-payment', {
        body: {
          scheduledGiftId: gift.id,
          productPrice: product.price,
          productImage: product.imageUrl,
          giftDetails: { recipientName: cleanName(recipient.name), occasion: occasionName, giftType: product.name },
          shippingAddress: {
            first_name: first,
            last_name: cleanName(recipient.name).split(' ').slice(1).join(' '),
            address1: address.street,
            city: address.city,
            province: address.state,
            country: address.country,
            zip: address.zip_code,
          },
          variantId: product.providerProductId || product.id,
        },
      });
      invalidate();
      if (paymentError || !payment?.url) {
        fail(`${product.name} is saved for ${first}, but checkout didn't open. Open ${first} to finish payment.`);
        return;
      }
      markSuccess();
      window.location.href = payment.url;
    } catch (error) {
      console.error('Error scheduling gift:', error);
      fail(error instanceof Error ? error.message : 'Please try again.');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const ordered = existingGift && (existingGift.shopify_order_id || existingGift.goody_order_id || existingGift.status === 'ordered');
  const actionLabel = submitting
    ? 'Scheduling…'
    : payingForGiftId
      ? 'Save address and pay'
      : missing.length
        ? `Add ${missing[0]}`
        : payFromWallet
          ? `Schedule · ${money(price)} from wallet`
          : `Schedule and pay ${money(price)}`;

  // Steps already past for a near date happen right away rather than on a date that's gone.
  const todayIso = format(new Date(), 'yyyy-MM-dd');
  const when = (d: Date) => (format(d, 'yyyy-MM-dd') <= todayIso ? 'today' : format(d, 'MMM d'));
  const timeline = occasionDate && !isPast ? (() => {
    const d = parseISO(occasionDate);
    return [
      { icon: CreditCard, text: `Review ${when(subDays(d, 28))}` },
      { icon: Package, text: `Order ${when(subDays(d, 21))}` },
      { icon: Truck, text: `Arrives ${format(subDays(d, 3), 'yyyy-MM-dd') <= todayIso ? 'after the date' : format(subDays(d, 3), 'MMM d')}` },
    ];
  })() : null;
  const tooSoon = Boolean(occasionDate) && !isPast && format(subDays(parseISO(occasionDate), 7), 'yyyy-MM-dd') < todayIso;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[94dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] border-x border-t p-0 lg:max-w-[600px]"
        style={{ background: '#F7F1E6', borderColor: U.border }}
      >
        <SheetHeader className="shrink-0 px-5 pb-3 pt-5 text-left">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#2A2520]/15" />
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: U.accent }}>
            <span>{step === 'choose' ? '1 · Choose' : '2 · Review'}</span>
          </div>
          <SheetTitle className="pr-8 font-display text-[26px] font-normal leading-[1.1]" style={{ color: U.ink }}>
            {payingForGiftId ? `Where should ${first}’s gift go?` : step === 'choose' ? `A gift for ${first}` : 'Review and schedule'}
          </SheetTitle>
          <SheetDescription className="text-[13px] leading-5" style={{ color: U.textSecondary }}>
            {step === 'choose'
              ? savedInterests.length ? `Ranked by what ${first} loves. Nothing is ordered until you confirm.` : `Add interests to ${first} for a sharper list. Nothing is ordered until you confirm.`
              : 'Everything in one place. Change anything before you confirm.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {step === 'choose' && (
            <>
              {ordered && (
                <p className="mb-3 rounded-[14px] px-3.5 py-2.5 text-[12.5px]" style={{ background: U.sageSoft, color: U.inkSoft }}>
                  {existingGift?.gift_type || 'A gift'} is already ordered for {first}’s next occasion.
                </p>
              )}
              {savedInterests.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by interest">
                  {[ALL, ...savedInterests].map((value) => {
                    const active = filter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setFilter(value)}
                        className="u-press min-h-10 rounded-full border px-3.5 text-[12.5px] font-semibold"
                        style={{ background: active ? U.ink : U.surface, color: active ? U.buttonText : '#5A5147', borderColor: active ? U.ink : U.border }}
                      >
                        {value === ALL ? 'All matches' : value}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy={catalog.isFetching}>
                {catalog.isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-60 animate-pulse rounded-[20px] bg-white/70" />)
                  : products.map((item) => {
                    const chosen = product?.id === item.id;
                    return (
                      <article
                        key={item.id}
                        className="u-catalog-card flex flex-col overflow-hidden rounded-[20px] bg-white p-2.5 shadow-[0_8px_24px_rgba(42,37,32,0.05)]"
                        style={{ outline: chosen ? `2px solid ${U.accent}` : 'none' }}
                      >
                        <ProductImage src={item.imageUrl} className="aspect-square w-full rounded-[15px]" />
                        <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                          <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.3]" style={{ color: U.ink }}>{item.name}</h3>
                          <p className="mt-1 truncate text-[11px]" style={{ color: '#8A7E6E' }}>{item.brand || 'Curated by Unwrapt'}</p>
                          {item.why && <p className="mt-1.5 line-clamp-2 text-[11px] leading-4" style={{ color: '#6F6559' }}>{item.why}</p>}
                          <p className="mt-auto pt-2 font-mono text-[12px]" style={{ color: '#5A5147' }}>{money(item.price!)}</p>
                          <button
                            type="button"
                            onClick={() => pick(item)}
                            className="u-press mt-2 min-h-10 rounded-[12px] text-[12px] font-semibold"
                            style={{ background: U.ink, color: U.buttonText }}
                          >
                            {chosen ? 'Selected' : 'Select gift'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              {!catalog.isLoading && catalog.isError && (
                <div className="mt-2 rounded-[16px] px-4 py-3.5 text-center text-[13px]" style={{ background: U.accentSoft, color: U.inkSoft }}>
                  Couldn’t load gifts right now.{' '}
                  <button type="button" onClick={() => void catalog.refetch()} className="min-h-8 font-semibold" style={{ color: U.accent }}>Try again</button>
                </div>
              )}
              {!catalog.isLoading && !catalog.isError && products.length === 0 && (
                <div className="mt-2 rounded-[16px] px-4 py-4 text-center text-[13px] leading-5" style={{ background: U.chip, color: U.inkSoft }}>
                  No matches for {filter === ALL ? 'these interests' : `“${filter}”`} yet.
                  {filter !== ALL && (
                    <button type="button" onClick={() => setFilter(ALL)} className="ml-2 min-h-8 font-semibold" style={{ color: U.accent }}>See all matches</button>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'review' && (
            <div className="space-y-3">
              {!payingForGiftId && (
                <section className="flex items-center gap-3 rounded-[18px] bg-white p-3">
                  {product
                    ? <ProductImage src={product.imageUrl} className="h-16 w-16 shrink-0 rounded-[12px]" />
                    : <div className="h-16 w-16 shrink-0 rounded-[12px]" style={{ background: U.chip }} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.muted }}>Gift</div>
                    <div className="line-clamp-2 text-[14px] font-semibold leading-5" style={{ color: U.ink }}>{product?.name || 'No gift chosen yet'}</div>
                    {product?.price != null && <div className="font-mono text-[12px]" style={{ color: '#5A5147' }}>{money(product.price)}</div>}
                  </div>
                  <button type="button" onClick={() => setStep('choose')} className="u-press min-h-10 shrink-0 rounded-full px-3 text-[12.5px] font-semibold" style={{ color: U.accent }}>
                    {product ? 'Change' : 'Choose'}
                  </button>
                </section>
              )}

              <section className="rounded-[18px] bg-white p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: U.muted }}>For</div>
                <div className="text-[14px] font-semibold" style={{ color: U.ink }}>{cleanName(recipient.name)}</div>
                {!payingForGiftId && (
                  <div className="mt-3 space-y-1">
                    <Label htmlFor="occasion_date" className="text-[12px] font-medium" style={{ color: U.inkSoft }}>{occasionLabel} date</Label>
                    <Input
                      id="occasion_date"
                      type="date"
                      value={occasionDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => setOccasionDate(e.target.value)}
                      className="h-11 w-full bg-white text-[14px]"
                    />
                    {isPast && <p className="text-[12px]" style={{ color: U.accent }}>Pick an upcoming date.</p>}
                  </div>
                )}
                {timeline && !payingForGiftId && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    {timeline.map(({ icon: Icon, text }) => (
                      <div key={text} className="rounded-[12px] px-2.5 py-2" style={{ background: U.surface, color: U.textSecondary }}>
                        <Icon className="mb-1 h-3.5 w-3.5" style={{ color: U.accent }} />{text}
                      </div>
                    ))}
                  </div>
                )}
                {tooSoon && !payingForGiftId && (
                  <p className="mt-2 text-[12px] leading-5" style={{ color: U.accent }}>
                    That’s soon. Delivery usually takes about a week, so it may arrive a little late.
                  </p>
                )}
              </section>

              <section className="rounded-[18px] bg-white p-3.5" style={{ outline: hasFullAddress(address) ? 'none' : `1.5px solid ${U.accent}` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" style={{ color: hasFullAddress(address) ? U.sage : U.accent }} />
                    <span className="truncate text-[13.5px]" style={{ color: U.ink }}>
                      {hasFullAddress(address) && !editingAddress
                        ? [address.street, address.city, address.state, address.zip_code].join(', ')
                        : 'Shipping address'}
                    </span>
                  </div>
                  {hasFullAddress(address) && (
                    <button type="button" onClick={() => setEditingAddress((v) => !v)} className="u-press min-h-10 shrink-0 rounded-full px-3 text-[12.5px] font-semibold" style={{ color: U.accent }}>
                      {editingAddress ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>
                {(editingAddress || !hasFullAddress(address)) && (
                  <div className="mt-2 space-y-2">
                    <Input placeholder="Street address" autoComplete="street-address" value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} className="h-11 bg-white text-[14px]" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="City" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className="h-11 bg-white text-[14px]" />
                      <Input placeholder="State" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} className="h-11 bg-white text-[14px]" />
                      <Input placeholder="ZIP" inputMode="numeric" value={address.zip_code} onChange={(e) => setAddress((a) => ({ ...a, zip_code: e.target.value }))} className="h-11 bg-white text-[14px]" />
                      <Select value={address.country} onValueChange={(country) => setAddress((a) => ({ ...a, country }))}>
                        <SelectTrigger className="h-11 bg-white text-[14px]"><SelectValue placeholder="Country" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">USA</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">UK</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </section>

              {!payingForGiftId && product && (
                <p className="px-1 text-[12px] leading-5" style={{ color: U.textSecondary }}>
                  {payFromWallet
                    ? `${money(price)} comes from your gift wallet (balance ${money(walletBalance)}).`
                    : 'You’ll pay securely at checkout next.'}{' '}
                  Need to cancel? Email <a href="mailto:team@unwrapt.io" className="underline">team@unwrapt.io</a> before it’s ordered.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" style={{ borderColor: U.border, background: U.surface }}>
          {step === 'choose' ? (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={onClose} className="u-press min-h-12 rounded-[14px] border px-4 text-[14px] font-semibold" style={{ borderColor: U.borderStrong, color: U.ink }}>Cancel</button>
              <button
                type="button"
                disabled={!product}
                onClick={() => setStep('review')}
                className="u-press min-h-12 rounded-[14px] text-[14px] font-semibold disabled:opacity-50"
                style={{ background: U.ink, color: U.buttonText }}
              >
                {product ? 'Review' : 'Select a gift to continue'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={() => (payingForGiftId ? onClose() : setStep('choose'))}
                disabled={submitting}
                className="u-press min-h-12 rounded-[14px] border px-4 text-[14px] font-semibold"
                style={{ borderColor: U.borderStrong, color: U.ink }}
              >
                {payingForGiftId ? 'Cancel' : 'Back'}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || missing.length > 0}
                aria-busy={submitting}
                className="u-press min-h-12 rounded-[14px] text-[14px] font-semibold disabled:opacity-60"
                style={{ background: U.ink, color: U.buttonText }}
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ScheduleGiftModal;
