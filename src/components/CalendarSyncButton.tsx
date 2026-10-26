import React, { useEffect, useState } from 'react';
import { Calendar, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCalendarConnection, type CalendarCandidate, type CalendarStatus } from '@/hooks/useCalendarConnection';
import { formatOccasionDate } from '@/lib/dateUtils';

interface CalendarSyncButtonProps {
  className?: string;
  /** Softer pill that matches the Manual tab chrome, with inline status and next steps. */
  appearance?: 'default' | 'pill';
  /** Offered whenever the calendar can't help, so the user can keep going by hand. */
  onAddManually?: () => void;
}

const statusCopy = (status: CalendarStatus): { tone: 'info' | 'warn'; text: string } | null => {
  switch (status.kind) {
    case 'cancelled': return { tone: 'warn', text: 'You didn’t finish connecting. Nothing changed, and your people are still here.' };
    case 'expired': return { tone: 'warn', text: 'Calendar access expired. Reconnect to keep birthdays in sync.' };
    case 'failed': return { tone: 'warn', text: `Couldn’t connect Google Calendar. ${status.message}` };
    case 'no_events': return { tone: 'info', text: 'Connected, but no birthdays or anniversaries turned up in your calendar.' };
    case 'up_to_date': return { tone: 'info', text: 'Everyone from your calendar is already in Your people.' };
    case 'imported': return { tone: 'info', text: `Added ${status.count} ${status.count === 1 ? 'person' : 'people'} from your calendar.` };
    default: return null;
  }
};

const CalendarImportReview: React.FC<{
  candidates: CalendarCandidate[];
  importing: boolean;
  onImport: (selected: CalendarCandidate[]) => void;
  onCancel: () => void;
}> = ({ candidates, importing, onImport, onCancel }) => {
  const [chosen, setChosen] = useState(() => new Set(candidates.map((c) => c.key)));
  useEffect(() => setChosen(new Set(candidates.map((c) => c.key))), [candidates]);
  const selected = candidates.filter((c) => chosen.has(c.key));
  const toggle = (key: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !importing) onCancel(); }}>
      <DialogContent className="max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-[24px] p-5">
        <DialogHeader className="text-left">
          <DialogTitle>Found in your calendar</DialogTitle>
          <DialogDescription>Choose who Thea should look after. You can add details later.</DialogDescription>
        </DialogHeader>
        <ul className="mt-1 flex flex-col gap-2">
          {candidates.map((person) => (
            <li key={person.key}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] border border-[#E4DCD2] bg-[#FAF8F3] px-3.5 py-2.5">
                <input type="checkbox" checked={chosen.has(person.key)} onChange={() => toggle(person.key)} className="h-4 w-4 accent-[#2A2520]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-[#2A2520]">{person.name}</span>
                  <span className="block text-[12px] text-[#7A6F62]">
                    {[person.birthday && `Birthday · ${formatOccasionDate(person.birthday)}`, person.anniversary && `Anniversary · ${formatOccasionDate(person.anniversary)}`].filter(Boolean).join('  ·  ')}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={importing}>Not now</Button>
          <Button type="button" onClick={() => onImport(selected)} disabled={importing || !selected.length} className="h-11 bg-[#2A2520] text-[#F4ECDD] hover:bg-[#2A2520]/90">
            {importing ? 'Adding…' : `Add ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CalendarSyncButton = ({ className, appearance = 'default', onAddManually }: CalendarSyncButtonProps) => {
  const { toast } = useToast();
  const { isConnected, status, connect, findCandidates, importCandidates, dismiss } = useCalendarConnection();
  const busy = status.kind === 'connecting' || status.kind === 'syncing' || status.kind === 'importing';
  // An expired grant needs the consent screen again, not another sync attempt.
  const needsConnect = !isConnected || status.kind === 'expired';

  const handleClick = () => {
    if (needsConnect) void connect();
    else void findCandidates();
  };

  const handleImport = async (selected: CalendarCandidate[]) => {
    try {
      await importCandidates(selected);
    } catch {
      toast({ title: 'Couldn’t add those people', description: 'Nothing was saved. Please try again.', variant: 'destructive' });
    }
  };

  const label = status.kind === 'connecting'
    ? 'Opening Google…'
    : status.kind === 'syncing' || status.kind === 'importing'
      ? 'Checking your calendar…'
      : status.kind === 'expired'
        ? 'Reconnect calendar'
        : status.kind === 'cancelled' || status.kind === 'failed'
          ? 'Try connecting again'
          : isConnected
            ? 'Sync calendar'
            : 'Connect Google Calendar';
  const icon = busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status.kind === 'imported' || status.kind === 'up_to_date' ? <Check className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />;
  const message = statusCopy(status);
  const review = status.kind === 'review' || status.kind === 'importing' ? (
    <CalendarImportReview candidates={status.candidates} importing={status.kind === 'importing'} onImport={handleImport} onCancel={dismiss} />
  ) : null;

  if (appearance === 'pill') {
    return (
      <div aria-live="polite">
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          aria-busy={busy}
          className={className || 'u-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-3.5 py-2.5 text-[12.5px] font-semibold disabled:opacity-60'}
          style={{ borderColor: 'rgba(42,37,32,0.14)', background: '#F1E7D5', color: '#2A2520' }}
        >
          {icon}
          {label}
        </button>
        {message && (
          <div
            className="mt-2.5 rounded-[14px] px-3.5 py-2.5 text-[12.5px] leading-[1.45]"
            style={{ background: message.tone === 'warn' ? '#FBEFE5' : '#EEF0E4', color: '#3A332B' }}
          >
            {message.text}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {onAddManually && (status.kind === 'cancelled' || status.kind === 'failed' || status.kind === 'no_events' || status.kind === 'expired') && (
                <button type="button" onClick={onAddManually} className="min-h-8 font-semibold text-[#B65B3C]">Add someone manually</button>
              )}
              <button type="button" onClick={dismiss} className="min-h-8 font-semibold text-[#6B6256]">Dismiss</button>
            </div>
          </div>
        )}
        {review}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={busy}
        className={className || 'w-full border-brand-charcoal text-brand-charcoal hover:bg-brand-cream sm:w-auto'}
      >
        <span className="mr-2">{icon}</span>
        {label}
      </Button>
      {review}
    </>
  );
};

export default CalendarSyncButton;
