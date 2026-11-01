import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { normalizeRecipientName } from '@/lib/dateUtils';
import {
  CALENDAR_RESULT_PARAM,
  startCalendarConnect,
  toCalendarError,
  type CalendarResult,
} from '@/lib/calendarConnection';
import { SOURCE_LABEL, type BirthdaySource, type FoundOccasion } from '@/lib/birthdaySources';

export type CalendarCandidate = { key: string; name: string; birthday: string | null; anniversary: string | null };

export type CalendarStatus =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'syncing' }
  | { kind: 'review'; candidates: CalendarCandidate[] }
  | { kind: 'importing'; candidates: CalendarCandidate[] }
  | { kind: 'imported'; count: number }
  | { kind: 'up_to_date' }
  | { kind: 'no_events' }
  | { kind: 'cancelled' }
  | { kind: 'expired' }
  | { kind: 'failed'; message: string };

type CalendarEvent = { category?: string; personName?: string; date?: string };

const dateOnly = (date: string | null | undefined) => (date ? date.split('T')[0] : null);

/** Every birthday/anniversary person in the connected Google Calendar, keyed by normalized name. */
export async function fetchGoogleCalendarPeople(): Promise<Map<string, CalendarCandidate>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  const { data, error } = await supabase.functions.invoke('google-calendar', {
    body: { action: 'fetch_dashboard_events' },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error || data?.error) throw await toCalendarError(error, data);

  const people = new Map<string, CalendarCandidate>();
  for (const event of (data?.events || []) as CalendarEvent[]) {
    if (!event.personName || (event.category !== 'birthday' && event.category !== 'anniversary')) continue;
    const key = normalizeRecipientName(event.personName);
    const person = people.get(key) || { key, name: event.personName, birthday: null, anniversary: null };
    if (event.category === 'birthday') person.birthday ||= dateOnly(event.date);
    else person.anniversary ||= dateOnly(event.date);
    people.set(key, person);
  }
  return people;
}

/** Drops people this user already saved (matched by normalized name). */
async function unsavedPeople(userId: string, people: Map<string, CalendarCandidate>): Promise<CalendarCandidate[]> {
  const { data: existing } = await supabase.from('recipients').select('name').eq('user_id', userId);
  const known = new Set((existing || []).map((r) => normalizeRecipientName(r.name)));
  return [...people.values()].filter((p) => !known.has(p.key));
}

async function insertPeople(userId: string, people: CalendarCandidate[], sourceLabel: string): Promise<number> {
  const { data, error } = await supabase
    .from('recipients')
    .insert(people.map((p) => ({
      user_id: userId,
      name: p.name,
      birthday: p.birthday,
      anniversary: p.anniversary,
      interests: [],
      notes: `Imported from ${sourceLabel.replace('your ', '')}`,
    })))
    .select('id');
  if (error) throw error;
  return data?.length ?? people.length;
}

/** Saves whichever of these people aren't saved yet, without a review. Returns who was added. */
export async function importNewPeople(
  userId: string,
  people: Array<{ name: string; birthday: string | null; anniversary: string | null }>,
  sourceLabel: string,
): Promise<CalendarCandidate[]> {
  const byKey = new Map<string, CalendarCandidate>();
  for (const p of people) {
    const key = normalizeRecipientName(p.name);
    if (key && !byKey.has(key)) byKey.set(key, { key, name: p.name, birthday: p.birthday, anniversary: p.anniversary });
  }
  const remaining = await unsavedPeople(userId, byKey);
  if (remaining.length) await insertPeople(userId, remaining, sourceLabel);
  return remaining;
}

/**
 * Onboarding only saves the few people the user picked. Once they're in Thea's chat, bring in
 * everyone else from the connected calendar without another review. Returns who was added.
 */
export async function importRemainingCalendarPeople(userId: string): Promise<CalendarCandidate[]> {
  return importNewPeople(userId, [...(await fetchGoogleCalendarPeople()).values()], SOURCE_LABEL.google);
}

/** Whether this user has a live Google Calendar connection (shared cache across screens). */
export function useCalendarConnected() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['calendar-connection', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_calendar_integration');
      if (error || !data?.length) return false;
      return data[0]?.is_connected ?? false;
    },
    enabled: !!user,
  });
}

// Several buttons can mount at once; only one should act on the OAuth return.
let oauthReturnHandled = false;

/**
 * Google Calendar connection for the VIP / dashboard: connect, read the OAuth result the
 * callback sends back (`?calendar=`), find ALL birthday/anniversary candidates the product
 * supports (no onboarding 3-person cap), and import only the ones the user approves.
 * Every state is explicit so the UI never has to guess. Approved people are inserted into
 * `recipients` and the recipients query is invalidated so Thea sees them on the next turn.
 */
export function useCalendarConnection(returnTo = '/?tab=manual') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<CalendarStatus>({ kind: 'idle' });
  // Where the people under review came from, for copy and the saved note ("your contacts").
  const [sourceLabel, setSourceLabel] = useState(SOURCE_LABEL.google);

  /** Groups found people, drops ones already saved, and opens the review (or says why not). */
  const showReview = useCallback(async (people: Map<string, CalendarCandidate>) => {
    if (!user) return;
    if (people.size === 0) {
      setStatus({ kind: 'no_events' });
      return;
    }
    const candidates = await unsavedPeople(user.id, people);
    setStatus(candidates.length ? { kind: 'review', candidates } : { kind: 'up_to_date' });
  }, [user]);

  /** People from iPhone Contacts, Apple Calendar, an uploaded file or a typed list. */
  const reviewFound = useCallback(async (occasions: FoundOccasion[], source: BirthdaySource) => {
    setSourceLabel(SOURCE_LABEL[source]);
    const people = new Map<string, CalendarCandidate>();
    for (const o of occasions) {
      const key = normalizeRecipientName(o.personName);
      const person = people.get(key) || { key, name: o.personName, birthday: null, anniversary: null };
      if (o.type === 'birthday') person.birthday ||= o.date;
      else person.anniversary ||= o.date;
      people.set(key, person);
    }
    await showReview(people);
  }, [showReview]);

  const { data: isConnected = false, isLoading: checkingConnection } = useCalendarConnected();

  const connect = useCallback(async (options: { chooseAccount?: boolean } = {}) => {
    setStatus({ kind: 'connecting' });
    try {
      await startCalendarConnect(returnTo, options);
    } catch (error) {
      setStatus({ kind: 'failed', message: error instanceof Error ? error.message : 'Could not reach Google.' });
    }
  }, [returnTo]);

  const findCandidates = useCallback(async () => {
    if (!user) return;
    setSourceLabel(SOURCE_LABEL.google);
    setStatus({ kind: 'syncing' });
    try {
      await showReview(await fetchGoogleCalendarPeople());
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'access_expired') setStatus({ kind: 'expired' });
      else if (code === 'not_connected') {
        await queryClient.invalidateQueries({ queryKey: ['calendar-connection', user.id] });
        setStatus({ kind: 'idle' });
      } else setStatus({ kind: 'failed', message: error instanceof Error ? error.message : 'Calendar sync failed.' });
    }
  }, [user, queryClient, showReview]);

  const importCandidates = useCallback(async (selected: CalendarCandidate[]) => {
    if (!user || !selected.length) {
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'importing', candidates: selected });
    let count: number;
    try {
      count = await insertPeople(user.id, selected, sourceLabel);
    } catch (error) {
      setStatus({ kind: 'review', candidates: selected });
      throw error;
    }
    // Prefix-match so both ['recipients'] and ['recipients', userId] refetch.
    await queryClient.invalidateQueries({ queryKey: ['recipients'] });
    await queryClient.invalidateQueries({ queryKey: ['calendar-connection', user.id] });
    setStatus({ kind: 'imported', count });
  }, [user, queryClient, sourceLabel]);

  const dismiss = useCallback(() => setStatus({ kind: 'idle' }), []);

  // Read the result the OAuth callback sent back, once, then clear it from the URL.
  useEffect(() => {
    const result = searchParams.get(CALENDAR_RESULT_PARAM) as CalendarResult | null;
    const legacySync = searchParams.get('syncCalendar') === '1';
    if (!result && !legacySync) return;
    if (oauthReturnHandled || !user) return;
    oauthReturnHandled = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(CALENDAR_RESULT_PARAM);
      next.delete('syncCalendar');
      return next;
    }, { replace: true });

    if (result === 'cancelled') setStatus({ kind: 'cancelled' });
    else if (result === 'expired') setStatus({ kind: 'expired' });
    else if (result === 'failed') setStatus({ kind: 'failed', message: 'Google didn’t finish the connection.' });
    else {
      void queryClient.invalidateQueries({ queryKey: ['calendar-connection', user.id] });
      void findCandidates();
    }
  }, [searchParams, setSearchParams, user, queryClient, findCandidates]);

  return { isConnected, checkingConnection, status, sourceLabel, connect, findCandidates, reviewFound, importCandidates, dismiss };
}
