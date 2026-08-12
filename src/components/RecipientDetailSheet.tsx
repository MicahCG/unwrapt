import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Gift, MapPin, Pencil, Plus, Sparkles, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PersonAvatar } from '@/components/unwrapt2/TheaAvatar';
import { useThea } from '@/hooks/useThea';
import { initialsOf, U } from '@/components/unwrapt2/theme';
import { cleanName } from '@/lib/utils';
import { formatOccasionDate } from '@/lib/dateUtils';
import { getGiftReadiness, getGiftStatus, getRecipientStatus, type RecipientRecord } from '@/lib/giftStatus';
import GiftStatusBadge from '@/components/GiftStatusBadge';

interface RecipientDetailSheetProps {
  recipient: RecipientRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (recipient: RecipientRecord) => void;
  onEdit: (recipient: RecipientRecord) => void;
  onBrowseCatalog: (recipient: RecipientRecord) => void;
}

const MAX_INTERESTS = 3;

const RecipientDetailSheet: React.FC<RecipientDetailSheetProps> = ({
  recipient,
  open,
  onOpenChange,
  onSchedule,
  onEdit,
  onBrowseCatalog,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { openThea } = useThea();
  const [interests, setInterests] = useState<string[]>([]);
  const [draftInterest, setDraftInterest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInterests((recipient?.interests || []).slice(0, MAX_INTERESTS));
    setDraftInterest('');
  }, [recipient]);

  const gifts = useMemo(
    () => [...(recipient?.scheduled_gifts || [])].sort((a, b) => String(a.occasion_date || '').localeCompare(String(b.occasion_date || ''))),
    [recipient?.scheduled_gifts],
  );

  if (!recipient) return null;
  const name = cleanName(recipient.name);
  const recipientStatus = getRecipientStatus(recipient);
  const nextDate = recipient.birthday || recipient.anniversary;

  const persistInterests = async (next: string[]) => {
    setSaving(true);
    const previous = interests;
    setInterests(next);
    const { error } = await supabase.from('recipients').update({ interests: next }).eq('id', recipient.id);
    setSaving(false);
    if (error) {
      setInterests(previous);
      toast({ title: 'Could not save interests', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['recipients'] });
  };

  const addInterest = () => {
    const value = draftInterest.trim();
    if (!value || interests.length >= MAX_INTERESTS || interests.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    setDraftInterest('');
    void persistInterests([...interests, value]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] overflow-y-auto rounded-t-[28px] border-0 bg-[#F7F1E6] px-5 pb-10 pt-5 sm:mx-auto sm:max-w-[440px]">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#2A2520]/15" />
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3.5">
            <PersonAvatar initials={initialsOf(name)} tone={U.accent} size={58} />
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-display text-[25px] font-normal leading-tight text-[#2A2520]">{name}</SheetTitle>
              <SheetDescription className="mt-0.5 flex items-center gap-2 text-[12.5px] text-[#7A6F62]">
                <span>{recipient.relationship || 'Someone special'}</span>
                {nextDate && <span>· {formatOccasionDate(nextDate)}</span>}
              </SheetDescription>
              <div className="mt-2"><GiftStatusBadge status={recipientStatus} /></div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button onClick={() => onSchedule(recipient)} className="u-touch-card flex items-center justify-center gap-2 rounded-[16px] bg-[#2A2520] px-3 py-3.5 text-[13px] font-semibold text-[#F4ECDD]">
            <CalendarDays className="h-4 w-4" /> Schedule a gift
          </button>
          <button onClick={() => onBrowseCatalog(recipient)} className="u-touch-card flex items-center justify-center gap-2 rounded-[16px] border border-[#D9CDBD] bg-white px-3 py-3.5 text-[13px] font-semibold text-[#2A2520]">
            <Sparkles className="h-4 w-4 text-[#B65B3C]" /> Browse ideas
          </button>
        </div>
        <button onClick={() => openThea({ surface: 'recipient', recipientName: name })} className="u-touch-card mt-2.5 flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#EEE5D5] px-3 py-3 text-[12.5px] font-semibold text-[#5A5147]"><Sparkles className="h-4 w-4 text-[#B65B3C]" /> Ask Thea about {name.split(' ')[0]}</button>

        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E]">What they love</h3>
            <span className="text-[11px] text-[#9A8E7C]">{interests.length}/{MAX_INTERESTS}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <span key={interest} className="inline-flex items-center gap-1.5 rounded-full bg-[#EEE5D5] py-2 pl-3 pr-2 text-[12.5px] font-medium text-[#5A5147]">
                {interest}
                <button aria-label={`Remove ${interest}`} disabled={saving} onClick={() => void persistInterests(interests.filter((item) => item !== interest))} className="rounded-full p-0.5 hover:bg-black/5">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {interests.length < MAX_INTERESTS && (
              <div className="flex min-w-[170px] flex-1 items-center rounded-full border border-dashed border-[#CFC1AE] bg-white/55 py-1 pl-3 pr-1">
                <input
                  value={draftInterest}
                  onChange={(event) => setDraftInterest(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addInterest(); } }}
                  placeholder="Add an interest"
                  maxLength={40}
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[#A3998D]"
                />
                <button aria-label="Add interest" disabled={!draftInterest.trim() || saving} onClick={addInterest} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2520] text-white disabled:opacity-35">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(42,37,32,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-[#2A2520]">Recipient details</h3>
              <p className="mt-0.5 text-[11.5px] text-[#8A7E6E]">Used only to plan and deliver their gifts.</p>
            </div>
            <button aria-label={`Edit ${name}`} onClick={() => onEdit(recipient)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1E8D9] text-[#5A5147]">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 text-[12.5px] text-[#5A5147]">
            <div className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-[#B65B3C]" />{nextDate ? formatOccasionDate(nextDate) : 'No important date yet'}</div>
            <div className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 text-[#B65B3C]" /><span>{recipient.street ? [recipient.street, recipient.city, recipient.state, recipient.zip_code].filter(Boolean).join(', ') : 'No delivery address yet'}</span></div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A7E6E]">Gift plan</h3>
            <span className="text-[11px] text-[#9A8E7C]">{gifts.length} {gifts.length === 1 ? 'gift' : 'gifts'}</span>
          </div>
          {gifts.length === 0 ? (
            <button onClick={() => onSchedule(recipient)} className="u-touch-card flex w-full items-center gap-3 rounded-[20px] border border-dashed border-[#CFC1AE] bg-white/55 p-4 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#EEE5D5]"><Gift className="h-5 w-5 text-[#B65B3C]" /></div>
              <div><p className="text-[13px] font-semibold text-[#2A2520]">No gift scheduled yet</p><p className="mt-0.5 text-[11.5px] text-[#8A7E6E]">Choose a date and preview the catalog.</p></div>
            </button>
          ) : gifts.map((gift) => {
            const status = getGiftStatus(gift, recipient);
            const readiness = getGiftReadiness(gift, recipient);
            const missing = readiness.filter((item) => !item.complete);
            return (
              <article key={gift.id} className="mb-3 rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(42,37,32,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#EEE5D5]">
                    {gift.gift_image_url ? <img src={gift.gift_image_url} alt="" className="h-full w-full object-cover" /> : <Gift className="h-5 w-5 text-[#B65B3C]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><h4 className="line-clamp-2 text-[13.5px] font-semibold text-[#2A2520]">{gift.gift_description || gift.gift_type || 'Gift to be curated'}</h4><GiftStatusBadge status={status} compact /></div>
                    <p className="mt-1 text-[11.5px] text-[#8A7E6E]">{gift.occasion_date ? formatOccasionDate(gift.occasion_date) : 'Date needed'}{gift.estimated_cost ? ` · about $${Math.round(gift.estimated_cost)}` : ''}</p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-5 text-[#6F6559]">{status.detail}</p>
                {missing.length > 0 && !['ordered', 'shipped', 'delivered'].includes(status.key) && (
                  <div className="mt-3 rounded-[14px] bg-[#F7F1E6] p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7E6E]">Still required</p>
                    <div className="grid gap-1.5">
                      {readiness.map((item) => (
                        <div key={item.key} className="flex items-center gap-2 text-[11.5px] text-[#655B50]">
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full ${item.complete ? 'bg-[#DDE5D3] text-[#536044]' : 'border border-[#CDBEAA] text-transparent'}`}><Check className="h-2.5 w-2.5" /></span>
                          <span className={item.complete ? 'line-through opacity-55' : ''}>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </SheetContent>
    </Sheet>
  );
};

export default RecipientDetailSheet;
