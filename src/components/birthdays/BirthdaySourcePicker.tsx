import React, { useMemo, useRef, useState } from 'react';
import { BookUser, CalendarDays, ChevronLeft, ChevronRight, Loader2, MessageCircle } from 'lucide-react';
import { U } from '@/components/unwrapt2/theme';
import { trackProductEvent } from '@/lib/productAnalytics';
import {
  BirthdaySourceError,
  canReadDevice,
  dedupeOccasions,
  parseICS,
  parseTypedPeople,
  parseVCard,
  readAppleCalendar,
  readDeviceContacts,
  type BirthdaySource,
  type FoundOccasion,
} from '@/lib/birthdaySources';

interface BirthdaySourcePickerProps {
  /** Called with what a source found (possibly nothing); the parent shows the review. */
  onFound: (occasions: FoundOccasion[], source: BirthdaySource) => void;
  /** Starts the existing Google Calendar flow. */
  onGoogle: () => void;
  googleBusy?: boolean;
  googleLabel?: string;
}

type View = 'menu' | 'typed' | 'contacts_file' | 'calendar_file';

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z" />
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z" />
  </svg>
);

const Row: React.FC<{
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}> = ({ icon, title, detail, onClick, busy, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-busy={busy}
    className="u-press flex min-h-[64px] w-full items-center gap-3 rounded-[18px] border px-3.5 py-3 text-left disabled:opacity-60"
    style={{ background: U.surface, borderColor: U.border }}
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: U.chip, color: U.accent }}>
      {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold" style={{ color: U.ink }}>{title}</span>
      <span className="block text-[12.5px] leading-[1.35]" style={{ color: U.textSecondary }}>{detail}</span>
    </span>
    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: U.muted }} />
  </button>
);

const Back: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="u-press -ml-1 mb-2 inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-[13px] font-semibold" style={{ color: U.subtle }}>
    <ChevronLeft className="h-4 w-4" /> Other options
  </button>
);

/**
 * "Where do you keep birthdays?": iPhone Contacts, Apple Calendar, Google Calendar, or a list
 * typed for Thea. In the iOS app Contacts and Calendar are read directly; on the web, where
 * browsers can't reach them, an exported file does the same job and is read on the device.
 */
const BirthdaySourcePicker: React.FC<BirthdaySourcePickerProps> = ({ onFound, onGoogle, googleBusy, googleLabel }) => {
  const native = canReadDevice();
  const [view, setView] = useState<View>('menu');
  const [reading, setReading] = useState<BirthdaySource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => dedupeOccasions(parseTypedPeople(typed)), [typed]);
  const undated = preview.filter((o) => !o.date).length;

  const pick = (source: BirthdaySource | 'manual') => {
    setError(null);
    void trackProductEvent('birthday_source_selected', { source, native });
  };

  const readDevice = async (source: 'contacts' | 'apple_calendar') => {
    pick(source);
    setReading(source);
    try {
      const found = source === 'contacts' ? await readDeviceContacts() : await readAppleCalendar();
      onFound(dedupeOccasions(found), source);
    } catch (err) {
      const what = source === 'contacts' ? 'Contacts' : 'Calendars';
      setError(
        err instanceof BirthdaySourceError && err.reason === 'denied'
          ? `${what} access is off. Turn it on in Settings › Unwrapt › ${what}, or pick another option.`
          : `I couldn’t read your ${source === 'contacts' ? 'contacts' : 'calendar'} just now. Try again, or pick another option.`,
      );
    } finally {
      setReading(null);
    }
  };

  const readFile = async (file: File | undefined, source: 'contacts' | 'apple_calendar') => {
    if (!file) return;
    setError(null);
    setReading(source);
    try {
      const text = await file.text();
      const found = source === 'contacts' ? parseVCard(text) : parseICS(text);
      if (!found.length && !/BEGIN:(VCARD|VCALENDAR)/i.test(text)) {
        setError(source === 'contacts' ? 'That doesn’t look like a contacts file (.vcf).' : 'That doesn’t look like a calendar file (.ics).');
        return;
      }
      onFound(dedupeOccasions(found), source);
    } catch {
      setError('I couldn’t open that file. Try exporting it again.');
    } finally {
      setReading(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (view === 'typed') {
    return (
      <div>
        <Back onClick={() => setView('menu')} />
        <label htmlFor="birthday-list" className="mb-1.5 block text-[14px] font-semibold" style={{ color: U.ink }}>
          Tell me who and when
        </label>
        <textarea
          id="birthday-list"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          rows={5}
          autoFocus
          placeholder={'Mom Mar 3\nJake 7/12\nAna & Leo anniversary June 2'}
          className="w-full resize-none rounded-[16px] border bg-white px-3.5 py-3 text-[16px] leading-6 outline-none focus:ring-2"
          style={{ borderColor: U.borderStrong, color: U.ink }}
        />
        <p className="mt-1.5 min-h-5 text-[12.5px]" style={{ color: U.textSecondary }} aria-live="polite">
          {preview.length
            ? `${preview.length} ${preview.length === 1 ? 'person' : 'people'}${undated ? `, ${undated} without a date yet` : ''}`
            : 'One per line or separated by commas. Dates like Mar 3 or 3/7 both work.'}
        </p>
        <button
          type="button"
          disabled={!preview.length}
          onClick={() => { pick('typed'); onFound(preview, 'typed'); }}
          className="u-press mt-2 min-h-12 w-full rounded-[14px] text-[14.5px] font-semibold disabled:opacity-50"
          style={{ background: U.ink, color: U.buttonText }}
        >
          {preview.length ? `Review ${preview.length} ${preview.length === 1 ? 'person' : 'people'}` : 'Add a name and date'}
        </button>
      </div>
    );
  }

  if (view === 'contacts_file' || view === 'calendar_file') {
    const contacts = view === 'contacts_file';
    const source = contacts ? 'contacts' : 'apple_calendar';
    return (
      <div>
        <Back onClick={() => setView('menu')} />
        <p className="text-[15px] font-semibold" style={{ color: U.ink }}>
          {contacts ? 'Share your contacts file' : 'Share your calendar file'}
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13.5px] leading-5" style={{ color: U.textSecondary }}>
          {contacts ? (
            <>
              <li>Open the Contacts app and tap <b>Lists</b>.</li>
              <li>Press and hold <b>All Contacts</b>, then tap <b>Export</b>.</li>
              <li>Save to Files, then choose that file below.</li>
            </>
          ) : (
            <>
              <li>On a Mac, open Calendar and choose <b>File › Export › Export</b>.</li>
              <li>Send the .ics file to this device, or upload it from the Mac.</li>
              <li>Choose that file below.</li>
            </>
          )}
        </ol>
        <p className="mt-2 text-[12px] leading-[1.45]" style={{ color: U.muted }}>
          The file is read on your device. Only the names and dates you choose are saved.
          {!contacts && ' On iPhone, birthdays usually live in Contacts, which may be quicker.'}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={contacts ? '.vcf,text/vcard,text/x-vcard' : '.ics,text/calendar'}
          className="sr-only"
          onChange={(e) => void readFile(e.target.files?.[0], source)}
        />
        <button
          type="button"
          onClick={() => { pick(source); fileInput.current?.click(); }}
          disabled={reading !== null}
          className="u-press mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14.5px] font-semibold disabled:opacity-60"
          style={{ background: U.ink, color: U.buttonText }}
        >
          {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {contacts ? 'Choose contacts file' : 'Choose calendar file'}
        </button>
        <p className="mt-2 text-center text-[12px]" style={{ color: U.muted }}>
          In the Unwrapt iPhone app, I can read {contacts ? 'Contacts' : 'Calendar'} directly.
        </p>
        {error && <p className="mt-2 text-[12.5px]" role="alert" style={{ color: U.accent }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Row
        icon={<BookUser className="h-[18px] w-[18px]" />}
        title="iPhone Contacts"
        detail={native ? 'Birthdays saved on your contacts' : 'Upload your contacts, or use the iPhone app'}
        busy={reading === 'contacts'}
        disabled={reading !== null}
        onClick={() => (native ? void readDevice('contacts') : setView('contacts_file'))}
      />
      <Row
        icon={<CalendarDays className="h-[18px] w-[18px]" />}
        title="Apple Calendar"
        detail={native ? 'Yearly birthday and anniversary events' : 'Upload a calendar file, or use the iPhone app'}
        busy={reading === 'apple_calendar'}
        disabled={reading !== null}
        onClick={() => (native ? void readDevice('apple_calendar') : setView('calendar_file'))}
      />
      <Row
        icon={<GoogleMark />}
        title={googleLabel || 'Google Calendar'}
        detail="Read-only, birthdays and anniversaries"
        busy={googleBusy}
        disabled={reading !== null || googleBusy}
        onClick={() => { pick('google'); onGoogle(); }}
      />
      <Row
        icon={<MessageCircle className="h-[18px] w-[18px]" />}
        title="Tell Thea"
        detail="Type or paste names and dates"
        disabled={reading !== null}
        onClick={() => { setError(null); setView('typed'); }}
      />
      {error && <p className="px-1 text-[12.5px] leading-5" role="alert" style={{ color: U.accent }}>{error}</p>}
    </div>
  );
};

export default BirthdaySourcePicker;
