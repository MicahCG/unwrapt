# Backend contracts & fixtures (Claude Code work package)

Source: `Unwrapt_Claude_Code_Engineering_Brief_2026-10-21.pdf`. This doc is the
single place collecting the request/response contracts for each ticket as
they're implemented, for Cursor (or anyone building the matching frontend) to
build against without re-reading edge function source. Updated incrementally
as each ticket lands - see the per-ticket section for status.

## CC-01/CC-03/CC-04/CC-07: Thea agent tools, durable conversation, write acknowledgement

`supabase/functions/thea-chat/index.ts`. Thea gained five new OpenAI tools
(`get_recipients`, `update_recipient`, `create_recipient`, `select_gift`,
`confirm_scheduled_gift`) alongside the existing `search_gifts`. None of
this changes the request shape the frontend already sends
(`{ messages, mode, briefing? }`) - the new surface is entirely in the
response and in two new request additions below.

### New top-level response field: `writes`

Every non-onboarding chat response (`{ success, reply, products, writes }`)
now includes `writes`: an array of every write-tool call made during that
turn, in the write-acknowledgement shape the shared brief asks for -
`{ tool, ok, recordId?, saved?, error?, alreadyScheduled?, paymentPending? }`.
This is how the frontend should learn "a recipient was updated" or "a gift
was scheduled" and invalidate the right queries (`recipients`,
`upcoming-gifts`, etc.) immediately, rather than parsing Thea's natural-
language reply. `writes` is `[]` when the turn made no writes (e.g. just
chatting or searching). Example:
```json
{
  "success": true,
  "reply": "Got it, I've saved his address.",
  "products": [],
  "writes": [
    { "tool": "update_recipient", "ok": true, "recordId": "9c2e...", "saved": { "street": "1219 South Lamar Blvd", "city": "Austin", "state": "TX", "zip_code": "78704" } }
  ]
}
```
A failed write still appears in `writes` with `ok: false` and an `error`
string - Thea is instructed never to announce a successful save on a failed
write, but `writes` lets the frontend double-check independent of the text.

### New request addition: `action: "history"`

To restore a conversation on mount/refresh instead of starting empty, POST
the same endpoint with `{ action: "history", mode }` (no `messages` needed).
Returns the persisted conversation for that mode, already in display-ready
form (no internal markers - see CC-03 below):
```json
{ "success": true, "messages": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ] }
```
Gated by the same VIP check as normal chat (except `mode: "onboarding"`).

### CC-03: durable conversation (new tables)

`supabase/migrations/20261022130000_add_thea_conversations.sql` adds
`conversations` (one row per active user+mode thread) and
`conversation_messages` (append-only). Every normal chat turn now persists
the user's new message and Thea's reply server-side automatically - no
frontend change required for that part. Persistence failures are logged and
swallowed; they never block or corrupt the in-flight response.
**Known gap, not yet addressed**: `messages` sent in a normal chat request
is still capped at `MAX_MESSAGES = 40` and the frontend still owns resending
full local history each turn. Switching the frontend to seed from
`action: "history"` on mount and trim its own local window is a reasonable
follow-up, not required for CC-03 to function.

### CC-04: selection -> review -> confirm (two-step, not one tool)

`select_gift` returns a **review**, not a save:
```json
{
  "ok": true,
  "review": {
    "recipientId": "...", "recipientName": "Cydel", "productId": "...",
    "productTitle": "Coffee Beans by Methodical Coffee", "price": 24,
    "currency": "USD", "occasionDate": "2026-10-24", "occasion": "Birthday",
    "hasAddress": false
  }
}
```
or, if an active gift already exists for that recipient+date:
`{ "ok": true, "alreadyScheduled": true, "recordId": "...", "saved": { "gift_type": "...", "status": "scheduled" } }`.

`confirm_scheduled_gift` only succeeds if the model already showed that
exact review to the user in a prior, already-delivered turn (verified
server-side against persisted conversation metadata, not anything the
client claims) - this is what actually enforces "explicit confirmation" as
a real turn boundary rather than the model silently chaining both calls.
On success: `{ "ok": true, "recordId": "...", "saved": { "recipientName", "gift_type", "price", "occasion_date" }, "paymentPending": true }`.

**Deliberate scope boundary**: confirming only creates the `scheduled_gifts`
row (`status: "scheduled"`, `payment_status: "unpaid"`). It does not charge
a wallet, create a Stripe session, or place a Goody order - "scheduling
success is not partner order acceptance" per the brief. Payment completion
is the existing flow (the gift shows up the same way a `needsInfo`/"Finish
payment" item from `dashboardBriefing.ts` already does). If product work
wants Thea to also kick off payment inline, that's a scoped follow-up to
discuss, not something silently bundled in here.

### CC-01/CC-07: recipient tools

`get_recipients` (read) returns each recipient's id, name, relationship,
interests, `hasAddress` (boolean, not the actual address), and
`nextOccasion` (computed, same birthday > anniversary priority as
`ScheduleGiftModal`'s `getDefaultOccasionDate`). Thea is instructed to call
this before any write, both to get real ids and to check for an existing
match before `create_recipient`.

`update_recipient` merges `interests` into what's already saved (case-
insensitive dedupe, capped at 3, newest wins on overflow) rather than
replacing the list - the model only needs to pass what's new. Address
fields are set directly if provided; parsing free text into
street/city/state/zip is the model's job, not server-side parsing.

`create_recipient` requires only `name`; relationship/birthday/
anniversary/interests are optional. Used for the CC-07 handoff ("schedule
my friend Jordan's birthday" with no existing Jordan).

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
