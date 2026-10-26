import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  consumeReturnTo,
  storedRedirectUri,
  toCalendarError,
  withCalendarResult,
  type CalendarResult,
} from '@/lib/calendarConnection';

const MAX_AUTH_WAITS = 15;
const AUTH_WAIT_MS = 500;

/**
 * Google redirects here after consent. Every outcome returns the user to the screen that
 * started the connection with `?calendar=<result>`, where that screen explains what happened
 * and offers the next step. Nothing here is a dead end.
 */
const CalendarOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [authWaits, setAuthWaits] = useState(0);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const finish = (result: CalendarResult) => {
      handled.current = true;
      window.location.replace(withCalendarResult(consumeReturnTo('/?tab=manual'), result));
    };

    // Google sends the same `access_denied` whether the user clicked Deny or closed the window.
    if (searchParams.get('error')) return finish('cancelled');
    const code = searchParams.get('code');
    if (!code) return finish('cancelled');

    if (loading) return;
    if (!user) {
      if (authWaits < MAX_AUTH_WAITS) {
        const timer = window.setTimeout(() => setAuthWaits((n) => n + 1), AUTH_WAIT_MS);
        return () => window.clearTimeout(timer);
      }
      return finish('failed');
    }

    handled.current = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');
        const { data, error } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'exchange_code',
            code,
            redirectUri: storedRedirectUri('https://app.unwrapt.io/auth/calendar/callback'),
          },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        // The function answers `{ success: true, code: 'connected' }`; it never returns tokens.
        if (error || !(data?.success || data?.code === 'connected')) throw await toCalendarError(error, data);
        handled.current = false;
        finish('connected');
      } catch (error) {
        console.error('Calendar connection failed', error);
        const code = (error as { code?: string }).code;
        handled.current = false;
        finish(code === 'code_expired_or_reused' ? 'expired' : 'failed');
      }
    })();
  }, [searchParams, user, loading, authWaits]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDE6D8] px-6">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#2A2520]/15 border-b-[#2A2520]" />
        <p className="text-[15px] font-semibold text-[#2A2520]">Connecting Google Calendar…</p>
        <p className="mt-1.5 text-[13px] text-[#6B6256]">
          {loading || !user ? 'Checking your sign-in…' : 'Saving the connection. You’ll be right back.'}
        </p>
      </div>
    </div>
  );
};

export default CalendarOAuthCallback;
