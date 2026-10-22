# Backend contracts & fixtures (Claude Code work package)

Source: `Unwrapt_Claude_Code_Engineering_Brief_2026-10-21.pdf`. This doc is the
single place collecting the request/response contracts for each ticket as
they're implemented, for Cursor (or anyone building the matching frontend) to
build against without re-reading edge function source. Updated incrementally
as each ticket lands - see the per-ticket section for status.

## CC-06: Calendar connection/recovery states

`supabase/functions/google-calendar/index.ts`. Every response now carries a
machine-readable `code` alongside the existing human-readable `error`/
`success` fields (additive - nothing existing was removed or renamed).
Responses that are safe to retry by just re-running the same action also
carry `retryable: true`.

### State: user denied or cancelled at Google's consent screen

**This never reaches the backend at all.** Google redirects straight back to
the frontend's callback route with `?error=access_denied` (or occasionally
another `error` value) in the query string - no code, so `exchange_code` is
never called. **Google does not distinguish "I clicked Deny" from "I closed
the tab/window"; both arrive as the same `access_denied` value.** There is no
backend signal that can tell these apart - this has to be handled entirely
client-side off the `error` query param, and treated as one state ("you
didn't finish connecting, want to try again?") rather than two.

### State: connected (success)

`action: 'exchange_code'` →
```json
{ "success": true, "code": "connected" }
```

### State: code exchange failed (retryable)

`action: 'exchange_code'`, Google rejected the authorization code:
```json
{ "error": "<Google's error_description or error code>", "code": "code_expired_or_reused", "retryable": true }
```
`code_expired_or_reused` specifically means Google's `invalid_grant` - the
code was already used, expired, or doesn't match the redirect_uri it was
issued for. Any other Google-side rejection returns `code: "code_exchange_failed"`
with the same shape. Both are safe to retry by starting a fresh connect
attempt (there's nothing to "resume" - the code itself is dead).

### State: access expired / needs reconnect (retryable)

`action: 'fetch_events'` or `'fetch_dashboard_events'`, stored refresh token
no longer works:
```json
{ "error": "Calendar access expired. Please reconnect your Google Calendar.", "code": "access_expired", "retryable": true }
```
Status 401. This is the one state where "reconnect" (re-running the OAuth
flow) is the correct recovery action, as opposed to "retry the same request."

### State: not connected yet

`action: 'fetch_events'` / `'fetch_dashboard_events'`, no integration row for
this user:
```json
{ "error": "No calendar integration found", "code": "not_connected" }
```
Status 404. Not an error state to surface dramatically - just means show the
"Connect Google Calendar" entry point.

### State: no events found (valid empty calendar)

Success response, empty array - distinct from every error state above by
virtue of being a 200 with no `error` field:
```json
{ "events": [], "code": "events_fetched" }
```

### State: events found

```json
{ "events": [ { "summary": "Jane's Birthday", "date": "2026-11-03", "type": "birthday", "personName": "Jane" } ], "code": "events_fetched" }
```

### Other error codes (less common, same shape)

- `unauthorized` (401) - missing/invalid Supabase auth on the request itself.
- `not_configured` (500) - `GOOGLE_CLIENT_ID` missing server-side.
- `storage_failed` (500, `retryable: true`) - token exchange succeeded but
  writing `calendar_integrations` failed.
- `calendar_fetch_failed` (400, `retryable: true`) - Google's Calendar API
  itself returned a non-auth error.
- `invalid_action` (400) - unrecognized `action` value.
- `internal_error` (500, `retryable: true`) - uncaught exception.

### What's still Cursor's job for CC-06

Per the brief's ownership split, the backend contract above is the full scope
of this ticket on the Claude Code side. The frontend callback
(`src/components/auth/CalendarOAuthCallback.tsx`) currently collapses every
`error` query param into one generic toast and always hard-redirects to a
fixed URL (`https://app.unwrapt.io` or `/onboarding`), discarding whatever
step/modal the user was on when they started connecting. Building distinct
UI for each state above, and preserving/resuming the originating context
instead of a hard redirect, is frontend work - intentionally not touched
here.
