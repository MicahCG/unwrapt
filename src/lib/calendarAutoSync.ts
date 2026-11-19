// Decides which people from a connected calendar should be added automatically on a background sync.
// Pure (no I/O) so the rules can be tested; storage helpers at the bottom are the only impure part.

export type CalendarPerson = { key: string; name: string; birthday: string | null; anniversary: string | null };

/**
 * `seen` is every calendar person we have already looked at on this device (null = first run).
 *  - First run: only record who is there. Connecting already offered a review, and bulk-importing a
 *    whole calendar behind the user's back would be a surprise.
 *  - After that: anyone not seen before is new, so import them. Everyone is then marked seen, so a
 *    person the user later deletes in Unwrapt does not come back on the next sync.
 */
export function planCalendarSync(
  people: CalendarPerson[],
  seen: Set<string> | null,
): { toImport: CalendarPerson[]; seen: Set<string> } {
  const nextSeen = new Set([...(seen ?? []), ...people.map((p) => p.key)]);
  if (seen === null) return { toImport: [], seen: nextSeen };
  return { toImport: people.filter((p) => !seen.has(p.key)), seen: nextSeen };
}

/** Minimum gap between background syncs, so tab-switching doesn't hammer Google. */
export const CALENDAR_SYNC_MIN_INTERVAL_MS = 10 * 60 * 1000;

export const shouldRunCalendarSync = (lastRunAt: number | null, now: number): boolean =>
  lastRunAt === null || now - lastRunAt >= CALENDAR_SYNC_MIN_INTERVAL_MS;

const seenKey = (userId: string) => `unwrapt.calendarSeen.${userId}`;
const lastRunKey = (userId: string) => `unwrapt.calendarSyncAt.${userId}`;

export const loadSeenPeople = (userId: string): Set<string> | null => {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
};

export const saveSeenPeople = (userId: string, seen: Set<string>) => {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...seen]));
  } catch {
    // Private mode / full storage: worst case the next sync re-baselines instead of importing.
  }
};

export const loadLastSyncAt = (userId: string): number | null => {
  try {
    const raw = localStorage.getItem(lastRunKey(userId));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
};

export const saveLastSyncAt = (userId: string, at: number) => {
  try {
    localStorage.setItem(lastRunKey(userId), String(at));
  } catch {
    // ignore
  }
};
