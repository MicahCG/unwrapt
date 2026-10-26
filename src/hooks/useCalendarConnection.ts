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

// Several buttons can mount at once; only one should act on the OAuth return.
let oauthReturnHandled = false;

/**
 * Google Calendar connection for the dashboard: connect, read the OAuth result the callback
 * sends back (`?calendar=`), find birthday/anniversary candidates, and import only the ones
 * the user approves. Every state is explicit so the UI never has to guess.
 */
export function useCalendarConnection(returnTo = '/?tab=manual') {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<CalendarStatus>({ kind: 'idle' });

  const { data: isConnected = false, isLoading: checkingConnection } = useQuery({
    queryKey: ['calendar-connection', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_calendar_integration');
      if (error || !data?.length) return false;
      return data[0]?.is_connected ?? false;
    },
    enabled: !!user,
  });

  const connect = useCallback(async () => {
    setStatus({ kind: 'connecting' });
    try {
      await startCalendarConnect(returnTo);
    } catch (error) {
      setStatus({ kind: 'failed', message: error instanceof Error ? error.message : 'Could not reach Google.' });
    }
  }, [returnTo]);

  const findCandidates = useCallback(async () => {
    if (!user) return;
    setStatus({ kind: 'syncing' });
    try {
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
      if (people.size === 0) {
        setStatus({ kind: 'no_events' });
        return;
      }

      const { data: existing } = await supabase.from('recipients').select('name').eq('user_id', user.id);
      const known = new Set((existing || []).map((r) => normalizeRecipientName(r.name)));
      const candidates = [...people.values()].filter((p) => !known.has(p.key));
      setStatus(candidates.length ? { kind: 'review', candidates } : { kind: 'up_to_date' });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'access_expired') setStatus({ kind: 'expired' });
      else if (code === 'not_connected') {
        await queryClient.invalidateQueries({ queryKey: ['calendar-connection', user.id] });
        setStatus({ kind: 'idle' });
      } else setStatus({ kind: 'failed', message: error instanceof Error ? error.message : 'Calendar sync failed.' });
    }
  }, [user, queryClient]);

  const importCandidates = useCallback(async (selected: CalendarCandidate[]) => {
    if (!user || !selected.length) {
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'importing', candidates: selected });
    const { data, error } = await supabase
      .from('recipients')
      .insert(selected.map((p) => ({
        user_id: user.id,
        name: p.name,
        birthday: p.birthday,
        anniversary: p.anniversary,
        interests: [],
        notes: 'Auto-imported from Google Calendar',
      })))
      .select('id');
    if (error) {
      setStatus({ kind: 'review', candidates: selected });
      throw error;
    }
    await queryClient.invalidateQueries({ queryKey: ['recipients'] });
    setStatus({ kind: 'imported', count: data?.length ?? selected.length });
  }, [user, queryClient]);

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

  return { isConnected, checkingConnection, status, connect, findCandidates, importCandidates, dismiss };
}
