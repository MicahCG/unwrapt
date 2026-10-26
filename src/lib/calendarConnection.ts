import { supabase } from '@/integrations/supabase/client';

/**
 * Outcome of a Google Calendar connect attempt, carried back to the screen that started it
 * as `?calendar=<result>`. Google reports "denied" and "closed the window" identically
 * (`access_denied`), so both are `cancelled`.
 */
export type CalendarResult = 'connected' | 'cancelled' | 'expired' | 'failed';

const RETURN_TO_KEY = 'unwrapt_calendar_return_to';
const REDIRECT_URI_KEY = 'unwrapt_calendar_redirect_uri';
export const CALENDAR_RESULT_PARAM = 'calendar';

/** Error from the google-calendar function, with its machine-readable `code` when present. */
export class CalendarError extends Error {
  constructor(message: string, readonly code?: string, readonly retryable = false) {
    super(message);
  }
}

/** Turns a failed `functions.invoke` (non-2xx context or `{ error }` body) into a CalendarError. */
export async function toCalendarError(error: unknown, data?: unknown): Promise<CalendarError> {
  let payload = data as { error?: string; code?: string; retryable?: boolean } | null | undefined;
  const response = error && typeof error === 'object' && 'context' in error ? (error as { context?: unknown }).context : null;
  if (response instanceof Response) {
    try {
      payload = (await response.clone().json()) as typeof payload;
    } catch {
      /* no JSON body; fall back to the SDK message */
    }
  }
  const message = payload?.error || (error instanceof Error ? error.message : 'Calendar request failed');
  return new CalendarError(message, payload?.code, Boolean(payload?.retryable));
}

/** Safe in-app path to return to after OAuth, consumed once. */
export function consumeReturnTo(fallback: string): string {
  try {
    const stored = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (stored && stored.startsWith('/') && !stored.startsWith('//')) return stored;
  } catch {
    /* storage unavailable */
  }
  return fallback;
}

export function storedRedirectUri(fallback: string): string {
  try {
    return sessionStorage.getItem(REDIRECT_URI_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function withCalendarResult(path: string, result: CalendarResult): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set(CALENDAR_RESULT_PARAM, result);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Forces Google's account chooser, for connecting a different calendar than last time. */
export function withAccountPicker(authUrl: string): string {
  const url = new URL(authUrl);
  url.searchParams.set('prompt', 'select_account consent');
  return url.toString();
}

/** Sends the user to Google's consent screen, remembering where to come back to. */
export async function startCalendarConnect(returnTo: string, options: { chooseAccount?: boolean } = {}): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new CalendarError('Please sign in again to connect your calendar.', 'unauthorized');

  const { appOrigin, isNativeApp } = await import('@/lib/native');
  const { openExternalAuthUrl } = await import('@/lib/nativeBootstrap');
  // Always the HTTPS callback, so Google OAuth and Universal Links also work in the iOS shell.
  const redirectUri = `${appOrigin()}/auth/calendar/callback`;
  try {
    sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  } catch {
    /* storage unavailable; the callback falls back to the dashboard */
  }

  const { data, error } = await supabase.functions.invoke('google-calendar', {
    body: { action: 'get_auth_url', redirectUri },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error || !data?.authUrl) throw await toCalendarError(error, data);

  const authUrl = options.chooseAccount ? withAccountPicker(data.authUrl) : data.authUrl;
  if (isNativeApp()) await openExternalAuthUrl(authUrl);
  else window.location.href = authUrl;
}
