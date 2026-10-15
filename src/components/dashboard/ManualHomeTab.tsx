import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PersonAvatar } from '@/components/unwrapt2/TheaAvatar';
import { Eyebrow, PrimaryButton, Display } from '@/components/unwrapt2/MobileShell';
import GiftStatusBadge from '@/components/GiftStatusBadge';
import CalendarSyncButton from '@/components/CalendarSyncButton';
import { U, toneForIndex, initialsOf } from '@/components/unwrapt2/theme';
import { cleanName } from '@/lib/utils';
import { formatOccasionDate, getDaysUntil, getNextOccurrence } from '@/lib/dateUtils';
import { getRecipientStatus, type RecipientRecord } from '@/lib/giftStatus';
import { buildDashboardBriefing } from '@/lib/dashboardBriefing';

interface ManualHomeTabProps {
  recipients: RecipientRecord[];
  tier: 'free' | 'vip';
  walletBalance?: number | null;
  autopilotThreshold?: number;
  onOpenRecipient: (recipient: RecipientRecord) => void;
  onAddRecipient: () => void;
  onBrowseCatalog: () => void;
  onAddFunds: () => void;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const ManualHomeTab: React.FC<ManualHomeTabProps> = ({
  recipients,
  tier,
  walletBalance,
  autopilotThreshold,
  onOpenRecipient,
  onAddRecipient,
  onBrowseCatalog,
  onAddFunds,
}) => {
  const navigate = useNavigate();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const briefing = useMemo(() => buildDashboardBriefing(recipients, autopilotThreshold), [recipients, autopilotThreshold]);

  const occasionDays = useMemo(() => {
    const map = new Map<string, { recipient: RecipientRecord; label: string }[]>();
    for (const recipient of recipients) {
      const dateStr = recipient.birthday || recipient.anniversary;
      if (!dateStr) continue;
      const next = getNextOccurrence(dateStr);
      const key = `${next.getFullYear()}-${next.getMonth()}-${next.getDate()}`;
      const label = recipient.birthday ? 'Birthday' : 'Anniversary';
      const list = map.get(key) || [];
      list.push({ recipient, label });
      map.set(key, list);
    }
    return map;
  }, [recipients]);

  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];

  const sortedRecipients = useMemo(() => {
    let list = [...recipients].sort((a, b) => {
      const aDate = a.birthday || a.anniversary;
      const bDate = b.birthday || b.anniversary;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return getNextOccurrence(aDate).getTime() - getNextOccurrence(bDate).getTime();
    });
    if (selectedDay) {
      const key = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
      const matches = new Set((occasionDays.get(key) || []).map((m) => m.recipient.id));
      if (matches.size) list = list.filter((r) => matches.has(r.id));
    }
    return list;
  }, [recipients, selectedDay, occasionDays]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow className="mb-0.5">Manual view</Eyebrow>
          <span className="font-display text-[26px] tracking-tight" style={{ color: U.ink }}>
            Calendar & people
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="rounded-full border px-3 py-2 text-[11.5px] font-semibold"
            style={{ borderColor: U.border, color: '#5A5147', background: U.surface }}
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => navigate('/gift-history')}
            className="rounded-full border px-3 py-2 text-[11.5px] font-semibold"
            style={{ borderColor: U.border, color: '#5A5147', background: U.surface }}
          >
            History
          </button>
        </div>
      </div>

      {(briefing.needsInfo.length > 0 || briefing.inMotion.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {briefing.needsInfo.slice(0, 2).map((item) => (
            <button
              key={`need-${item.recipientId}-${item.label}`}
              type="button"
              onClick={() => {
                const recipient = recipients.find((r) => r.id === item.recipientId);
                if (recipient) onOpenRecipient(recipient);
              }}
              className="min-w-[180px] shrink-0 rounded-[16px] border px-3.5 py-3 text-left"
              style={{ background: U.accentSoft, borderColor: 'rgba(182,91,60,0.25)' }}
            >
              <div className="text-[12.5px] font-semibold" style={{ color: U.ink }}>{item.label}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: U.muted }}>{item.detail}</div>
            </button>
          ))}
          {briefing.inMotion.slice(0, 2).map((item) => (
            <button
              key={`motion-${item.recipientId}-${item.label}`}
              type="button"
              onClick={() => {
                const recipient = recipients.find((r) => r.id === item.recipientId);
                if (recipient) onOpenRecipient(recipient);
              }}
              className="min-w-[180px] shrink-0 rounded-[16px] border px-3.5 py-3 text-left"
              style={{ background: U.chip, borderColor: U.border }}
            >
              <div className="text-[12.5px] font-semibold" style={{ color: U.ink }}>{item.label}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: U.muted }}>{item.detail}</div>
            </button>
          ))}
        </div>
      )}

      {/* Month calendar */}
      <section
        className="rounded-[22px] border p-3.5"
        style={{ background: U.surface, borderColor: U.border }}
        aria-label="Occasion calendar"
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: U.chip, color: U.ink }}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: U.ink }}>
            <CalendarDays size={15} color={U.accent} />
            {monthLabel}
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: U.chip, color: U.ink }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide" style={{ color: U.muted }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const hits = occasionDays.get(key) || [];
            const isToday = sameDay(day, today);
            const isSelected = selectedDay ? sameDay(day, selectedDay) : false;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-[12.5px] font-medium"
                style={{
                  background: isSelected ? U.ink : hits.length ? U.accentSoft : 'transparent',
                  color: isSelected ? U.buttonText : U.ink,
                  boxShadow: isToday && !isSelected ? `inset 0 0 0 1.5px ${U.accent}` : undefined,
                }}
              >
                {day.getDate()}
                {hits.length > 0 && (
                  <span
                    className="absolute bottom-1 h-1 w-1 rounded-full"
                    style={{ background: isSelected ? U.buttonText : U.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDay(null)}
            className="mt-2 text-[12px] font-medium"
            style={{ color: U.accent }}
          >
            Clear day filter
          </button>
        )}
        <div className="mt-3 border-t pt-3" style={{ borderColor: U.border }}>
          <CalendarSyncButton appearance="pill" />
          <p className="mt-2 text-center text-[11.5px] leading-4" style={{ color: U.muted }}>
            Pull birthdays and anniversaries from Google Calendar into Your people.
          </p>
        </div>
      </section>

      {/* Recipients */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <Eyebrow>Your people</Eyebrow>
          <button
            type="button"
            onClick={onAddRecipient}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold"
            style={{ background: U.chip, color: U.ink }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {sortedRecipients.length === 0 ? (
          <div className="rounded-[22px] border border-dashed px-5 py-8 text-center" style={{ borderColor: 'rgba(42,37,32,0.18)' }}>
            <Display className="text-[21px]">No one here yet</Display>
            <p className="mx-auto mt-1.5 max-w-[260px] text-[13.5px] leading-5" style={{ color: U.muted }}>
              {selectedDay
                ? 'No occasions on this day. Clear the filter or pick another date.'
                : 'Add someone you care about and Thea will watch the moments that matter.'}
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <PrimaryButton onClick={selectedDay ? () => setSelectedDay(null) : onAddRecipient}>
                {selectedDay ? 'Clear filter' : 'Add someone'}
              </PrimaryButton>
              {!selectedDay && <CalendarSyncButton appearance="pill" />}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sortedRecipients.map((recipient, index) => {
              const nextOccasionDate = recipient.birthday || recipient.anniversary;
              const occasionType = recipient.birthday ? 'Birthday' : 'Anniversary';
              const daysUntil = nextOccasionDate ? getDaysUntil(nextOccasionDate) : null;
              const recipientStatus = getRecipientStatus(recipient);
              const activeOrder = recipient.scheduled_gifts?.find(
                (gift) => (gift.status === 'ordered' || gift.status === 'delivered' || gift.status === 'shipped'),
              );

              return (
                <button
                  key={recipient.id}
                  type="button"
                  onClick={() => onOpenRecipient(recipient)}
                  className="u-recipient-card w-full rounded-[20px] border px-[18px] py-4 text-left"
                  style={{ borderColor: U.border, background: U.surface }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <PersonAvatar
                        initials={initialsOf(cleanName(recipient.name))}
                        tone={toneForIndex(index)}
                        size={38}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold" style={{ color: U.ink }}>
                          {cleanName(recipient.name)}
                        </div>
                        {nextOccasionDate ? (
                          <div className="text-[12.5px]" style={{ color: U.muted }}>
                            {occasionType} · {formatOccasionDate(nextOccasionDate)}
                            {daysUntil != null
                              ? daysUntil === 0
                                ? ' · Today'
                                : daysUntil === 1
                                  ? ' · Tomorrow'
                                  : ` · in ${daysUntil}d`
                              : ''}
                          </div>
                        ) : (
                          <div className="text-[12.5px]" style={{ color: U.muted }}>No date set</div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <GiftStatusBadge status={recipientStatus} compact />
                      <span className="text-[20px]" style={{ color: U.muted }}>›</span>
                    </div>
                  </div>

                  {activeOrder && (
                    <div className="mt-2.5 flex items-center gap-3 border-t pt-2.5" style={{ borderColor: U.border }}>
                      {activeOrder.gift_image_url ? (
                        <img
                          src={activeOrder.gift_image_url}
                          alt=""
                          className="h-10 w-10 rounded-[9px] object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold" style={{ color: U.sage }}>
                          {activeOrder.status === 'delivered'
                            ? 'Delivered'
                            : activeOrder.status === 'shipped'
                              ? 'Shipped'
                              : 'On its way'}
                        </div>
                        <p className="m-0 truncate text-[12px]" style={{ color: U.muted }}>
                          {activeOrder.gift_description || activeOrder.gift_type || 'Gift in progress'}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {tier === 'vip' && walletBalance != null && (
        <button
          type="button"
          onClick={onAddFunds}
          className="flex items-center justify-between rounded-[16px] px-4 py-3.5"
          style={{ background: U.chip }}
        >
          <span className="text-[13px]" style={{ color: '#5A5147' }}>Gift wallet</span>
          <span className="font-mono text-[14px] font-medium">
            ${walletBalance.toFixed(2)} · Add funds
          </span>
        </button>
      )}
    </div>
  );
};

export default ManualHomeTab;
