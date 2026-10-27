import { isNativeApp, nativePlatform } from '@/lib/native';

/**
 * Where a user keeps birthdays. Interviews showed iPhone Contacts and Apple Calendar far more
 * often than Google, so every source here turns into the same list of occasions, which the
 * existing review step shows before anything is saved.
 */
export type BirthdaySource = 'contacts' | 'apple_calendar' | 'google' | 'typed';

export type FoundOccasion = {
  personName: string;
  /** YYYY-MM-DD. The birth year when known, otherwise the next occurrence. Null if no date given. */
  date: string | null;
  type: 'birthday' | 'anniversary';
};

export const SOURCE_LABEL: Record<BirthdaySource, string> = {
  contacts: 'your contacts',
  apple_calendar: 'your calendar',
  google: 'your calendar',
  typed: 'your list',
};

/** A source that couldn't be read; `denied` means the user said no to the iOS permission. */
export class BirthdaySourceError extends Error {
  constructor(message: string, readonly reason: 'denied' | 'unavailable' | 'failed' = 'failed') {
    super(message);
  }
}

/** Contacts and Apple Calendar can be read directly only inside the iOS app. */
export const canReadDevice = () => isNativeApp() && nativePlatform() === 'ios';

const pad = (n: number) => String(n).padStart(2, '0');

/** Month/day (and optional year) to YYYY-MM-DD; without a year, the next time it comes round. */
export function toOccasionDate(month: number, day: number, year?: number | null): string | null {
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  if (year && year > 1800) return `${year}-${pad(month)}-${pad(day)}`;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < start) next.setFullYear(today.getFullYear() + 1);
  return `${next.getFullYear()}-${pad(month)}-${pad(day)}`;
}

const cleanName = (name: string) =>
  name
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/[‘’]/g, "'")
    .replace(/^[\s:,\-–|]+|[\s:,\-–|.!]+$/g, '')
    .replace(/'s$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const KIND = String.raw`(birthday|bday|b-day|birth day|anniversary|anniv)`;
const TITLE_PATTERNS = [
  new RegExp(String.raw`^(.+?)\s*(?:'s|’s|s')?\s+${KIND}$`, 'i'), // Jake's Birthday, Mom bday (not "Team birthday lunch")
  new RegExp(String.raw`^${KIND}\s*(?:[:\-–|]|for|of)?\s*(.+)$`, 'i'), // Birthday: Jake, Bday - Mom
];

/** "Jake's Birthday", "Birthday - Mom", "Mom & Dad anniversary" → who and which occasion. */
export function occasionFromTitle(title: string): { personName: string; type: FoundOccasion['type'] } | null {
  const text = cleanName(title);
  for (const [index, pattern] of TITLE_PATTERNS.entries()) {
    const match = pattern.exec(text);
    if (!match) continue;
    const [kind, who] = index === 0 ? [match[2], match[1]] : [match[1], match[2]];
    // "Ana's 30th Birthday" is Ana.
    const personName = cleanName(cleanName(who).replace(/\s+\d{1,3}(?:st|nd|rd|th)$/i, ''));
    if (!personName || personName.length > 60 || /^(my|our|happy)$/i.test(personName)) return null;
    return { personName, type: /anniv/i.test(kind) ? 'anniversary' : 'birthday' };
  }
  return null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?`;
const DAY = String.raw`(\d{1,2})(?:st|nd|rd|th)?(?!\d)`;
const YEAR = String.raw`(?:,?\s*(\d{4}))?`;
const DATE_PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => [number, number, number?] }[] = [
  { re: /(\d{4})-(\d{1,2})-(\d{1,2})/, read: (m) => [+m[2], +m[3], +m[1]] },
  { re: new RegExp(`${MONTH}\\s+${DAY}${YEAR}`, 'i'), read: (m) => [MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2], m[3] ? +m[3] : undefined] },
  { re: new RegExp(`${DAY}\\s+(?:of\\s+)?${MONTH}${YEAR}`, 'i'), read: (m) => [MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1], m[3] ? +m[3] : undefined] },
  // US order, like the rest of the app: 3/7 is March 7.
  { re: /\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/, read: (m) => [+m[1], +m[2], m[3] ? (m[3].length === 2 ? 1900 + +m[3] + (+m[3] < 30 ? 100 : 0) : +m[3]) : undefined] },
];

/**
 * Turns what someone types or pastes ("Mom Mar 3", "Jake - 7/12", "Ana and Leo anniversary
 * June 2") into occasions. Lines without a date still count, so nobody they named is dropped.
 */
export function parseTypedPeople(text: string): FoundOccasion[] {
  const entries = text
    .split(/\n|;|,(?![^\d]*\d{4})(?=\s*[A-Za-z])/)
    .map((line) => line.trim())
    .filter(Boolean);
  const found: FoundOccasion[] = [];
  for (const entry of entries) {
    let date: string | null = null;
    let rest = entry;
    for (const { re, read } of DATE_PATTERNS) {
      const match = re.exec(entry);
      if (!match) continue;
      const [month, day, year] = read(match);
      date = toOccasionDate(month, day, year);
      rest = entry.replace(match[0], ' ');
      break;
    }
    const type: FoundOccasion['type'] = /anniv/i.test(rest) ? 'anniversary' : 'birthday';
    const personName = cleanName(
      rest.replace(new RegExp(String.raw`\b${KIND}\b|\b(on|is|the)\b`, 'gi'), ' ').replace(/[()]/g, ' '),
    );
    if (personName && personName.length <= 60 && /\p{L}/u.test(personName)) found.push({ personName, date, type });
  }
  return found;
}

/** Joins folded vCard/iCalendar lines (continuations start with a space or tab). */
const unfold = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');

/** vCard dates: 19900307, 1990-03-07, --0307, --03-07, and Apple's 1604 "no year" marker. */
function vcardDate(value: string): string | null {
  const digits = value.trim().replace(/T.*$/, '').replace(/-/g, '');
  const noYear = /^(\d{2})(\d{2})$/.exec(digits);
  if (noYear) return toOccasionDate(+noYear[1], +noYear[2]);
  const full = /^(\d{4})(\d{2})(\d{2})$/.exec(digits);
  if (!full) return null;
  const year = +full[1];
  return toOccasionDate(+full[2], +full[3], year === 1604 ? null : year);
}

/** Reads names, birthdays and anniversaries from a contacts export (.vcf). */
export function parseVCard(text: string): FoundOccasion[] {
  const found: FoundOccasion[] = [];
  for (const card of unfold(text).split(/BEGIN:VCARD/i).slice(1)) {
    const lines = card.split('\n');
    const value = (prop: string) => lines.find((l) => new RegExp(`^(?:item\\d+\\.)?${prop}[;:]`, 'i').test(l))?.replace(/^[^:]*:/, '').trim();
    const structured = value('N')?.split(';');
    const personName = cleanName(value('FN') || [structured?.[1], structured?.[0]].filter(Boolean).join(' '));
    if (!personName) continue;
    const bday = value('BDAY');
    if (bday) {
      const date = vcardDate(bday);
      if (date) found.push({ personName, date, type: 'birthday' });
    }
    const anniversary = value('ANNIVERSARY') || value('X-ANNIVERSARY');
    let annivDate = anniversary ? vcardDate(anniversary) : null;
    if (!annivDate) {
      // Apple stores it as itemN.X-ABDATE labelled _$!<Anniversary>!$_.
      const label = lines.find((l) => /X-ABLabel:.*anniversary/i.test(l));
      const item = label?.match(/^(item\d+)\./i)?.[1];
      const abdate = item && lines.find((l) => l.toLowerCase().startsWith(`${item.toLowerCase()}.x-abdate`));
      if (abdate) annivDate = vcardDate(abdate.replace(/^[^:]*:/, ''));
    }
    if (annivDate) found.push({ personName, date: annivDate, type: 'anniversary' });
  }
  return found;
}

/** Reads birthday and anniversary events from a calendar export (.ics). */
export function parseICS(text: string): FoundOccasion[] {
  const found: FoundOccasion[] = [];
  for (const block of unfold(text).split(/BEGIN:VEVENT/i).slice(1)) {
    const lines = block.split('\n');
    const get = (prop: string) => lines.find((l) => new RegExp(`^${prop}[;:]`, 'i').test(l))?.replace(/^[^:]*:/, '').trim() || '';
    const occasion = occasionFromTitle(get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/gi, ' '));
    const start = /^(\d{4})(\d{2})(\d{2})/.exec(get('DTSTART'));
    if (!occasion || !start) continue;
    // A birthday event created years ago repeats yearly, so only its month and day matter.
    found.push({ ...occasion, date: toOccasionDate(+start[2], +start[3]) });
  }
  return found;
}

/** Reads birthdays and anniversaries saved on the user's iPhone contacts. */
export async function readDeviceContacts(): Promise<FoundOccasion[]> {
  if (!canReadDevice()) throw new BirthdaySourceError('Contacts can only be read in the iPhone app.', 'unavailable');
  const { Contacts } = await import('@capacitor-community/contacts');
  const permission = await Contacts.requestPermissions();
  if (permission.contacts !== 'granted' && permission.contacts !== 'limited') {
    throw new BirthdaySourceError('Contacts access is off for Unwrapt.', 'denied');
  }
  const { contacts } = await Contacts.getContacts({ projection: { name: true, birthday: true } });
  const found: FoundOccasion[] = [];
  for (const contact of contacts) {
    const name = cleanName(contact.name?.display || [contact.name?.given, contact.name?.family].filter(Boolean).join(' '));
    const { month, day, year } = contact.birthday || {};
    const date = month && day ? toOccasionDate(month, day, year) : null;
    if (name && date) found.push({ personName: name, date, type: 'birthday' });
  }
  return found;
}

/** Reads yearly birthday and anniversary events from Apple Calendar for the coming year. */
export async function readAppleCalendar(): Promise<FoundOccasion[]> {
  if (!canReadDevice()) throw new BirthdaySourceError('Apple Calendar can only be read in the iPhone app.', 'unavailable');
  const { CapacitorCalendar } = await import('@ebarooni/capacitor-calendar');
  const { result } = await CapacitorCalendar.requestFullCalendarAccess();
  if (result !== 'granted') throw new BirthdaySourceError('Calendar access is off for Unwrapt.', 'denied');
  const from = Date.now() - 24 * 60 * 60 * 1000;
  const { result: events } = await CapacitorCalendar.listEventsInRange({ from, to: from + 367 * 24 * 60 * 60 * 1000 });
  const found: FoundOccasion[] = [];
  for (const event of events) {
    const occasion = occasionFromTitle(event.title || '');
    if (!occasion) continue;
    const start = new Date(event.startDate);
    found.push({ ...occasion, date: toOccasionDate(start.getMonth() + 1, start.getDate()) });
  }
  return found;
}

/** One entry per person and occasion; the first date seen wins. */
export function dedupeOccasions(occasions: FoundOccasion[]): FoundOccasion[] {
  const seen = new Map<string, FoundOccasion>();
  for (const o of occasions) {
    const key = `${o.personName.toLowerCase()}|${o.type}`;
    const prev = seen.get(key);
    if (!prev || (!prev.date && o.date)) seen.set(key, o);
  }
  return [...seen.values()];
}
