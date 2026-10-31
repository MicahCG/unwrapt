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

### Response field: `review` (added for the Cursor review card)

When `select_gift` produced a review this turn, the chat response also carries it as a
top-level `review` (same shape as `select_gift`'s `review` above), otherwise `review: null`.
The app renders it as a review card whose Confirm action sends an explicit confirmation
message; confirmation itself is still verified server-side against the persisted marker.

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

## CC-02: cross-turn selection context (fixes audit screenshots S03 and S06)

`supabase/functions/thea-chat/index.ts`. Investigation (tracing every
frontend caller - `TheaAgent.tsx`, `TheaHomeTab.tsx`, `AgentOnboardingFlow.tsx`)
confirmed none of them resend tool-call history; `thea-chat` only ever sees
plain `{role, content}` display text each request. That's the direct cause
of two audit findings:
- **S03** ("address requested, then update refused"): `update_recipient`
  requires a real `recipientId`. If the model doesn't re-call
  `get_recipients` in the same turn it writes, the id it has isn't real and
  the write is refused.
- **S06** ("explicit gift choice triggers another list"): the model has no
  memory of the productIds from its own last `search_gifts` call, so naming
  a product by text in a later turn gives it nothing to resolve against
  `select_gift`.

**Fix**: the same `conversation_messages.metadata` jsonb column already used
for `reviewMarker` (CC-04) now also persists, per assistant turn:
`recommendedProducts: [{id, title, price}]` (when that turn named specific
products) and `activeRecipient: {id, name}` (when that turn's tool calls
resolved exactly one recipient - a single `get_recipients` match, or a
successful `update_recipient`/`create_recipient`/`select_gift` write).
Each new request reads the **previous** turn's persisted context
(`fetchLastTurnContext`) and injects it as an additional system message
(`buildTurnContextMessage`, exported for unit testing) alongside the
existing dashboard-briefing context. This is purely additive - no new
request/response field for the frontend, no migration needed.

Net effect: the model can resolve "do the coffee beans" or "save that
address for him" against real ids carried over from its own prior reply,
instead of needing to perfectly re-call `get_recipients`/`search_gifts`
every single turn (which it doesn't always do in practice).

**Regression found via live testing and fixed**: the first wording of the
carried-over-products instruction ("do not call search_gifts again or
re-list them") read as an absolute rule rather than one conditional on the
user actually naming one of those products. A follow-up asking for a
*different* price range (none of the previously-shown items fit it) left
the model unable to satisfy the request from the old list but also
"told not to" search again - it burned every iteration trying anyway and
hit the `MAX_TOOL_ITERATIONS` fallback ("I'm having trouble pulling that up
right now"). Reworded to be explicit: the carried-over list only applies
when the user clearly names one of those specific items; any other change
in criteria (new budget, new interest, "something else," etc.) must ignore
the list and call `search_gifts` fresh, same as before CC-02. Covered by a
regression test in `index.test.ts`.

**Second, deeper regression found via live browser testing immediately
after**: the wording fix above didn't fully work, because the carryover
mechanism's data source was broken. Live DB inspection
(`conversation_messages.metadata`) showed `{}` on assistant turns that *did*
recommend real products - `recommendedProducts` was never actually being
persisted, so there was nothing for the next turn to read back. Root cause:
the model frequently omits the invisible `RECOMMENDED_IDS` line even when it
correctly names and prices a real product (a pre-existing reliability gap,
not new), and the prior code only ever recovered ids from that line - so an
unmarked-but-real recommendation silently persisted as "nothing
recommended." Confirmed live: "Let's go with the Packable Tote Bag" (an
explicit, unambiguous selection) re-listed the same products instead of
calling `select_gift`, because the prior turn's real recommendation had
never been persisted for this turn to carry forward.

**Fix**: `resolveIdsByExactTitle` in `checkRecommendationIntegrity` now
matches a reply's bolded phrases against real `search_gifts` result titles
(exact, case-insensitive) as a fallback when `RECOMMENDED_IDS` is absent -
recovering the id deterministically instead of either flagging a false
"missing marker" retry or silently losing it. Both the in-loop integrity
check and the final `products`/`recommendedProducts` extraction (previously
two separate, drifted implementations of the same regex) now share this one
function. Covered by new tests in `index.test.ts`, including a direct
reproduction of the "Packable Tote Bag" failure.

## Goody catalog volatility causing "isn't available right now" (found via live testing)

After both CC-02 fixes above, retrying "Let's go with the Packable Tote
Bag" correctly called `select_gift` this time - but got
`"It looks like the Packable Tote Bag isn't available right now"`. This is
the long-flagged, pre-existing known gap: Goody's `/v1/products` listing
returns a different set of results across calls spaced only seconds apart,
so `select_gift`'s fresh re-validation lookup (`findGoodyProductById`,
intentionally unranked/unfiltered and uncached, to avoid writing a stale
price) sometimes just doesn't see a product that `search_gifts` returned
moments earlier in the same conversation - not a code defect in the
matching logic, a genuine inconsistency in the upstream API.

**Fix**: `fetchRawGoodyProducts` now caches its result for 60 seconds at the
module level (only on a successful, non-empty fetch, so a transient API
error doesn't poison the cache). This makes `search_gifts`,
`select_gift`'s validation, and `confirm_scheduled_gift`'s validation see
the same catalog snapshot within one short conversational exchange, instead
of each independently re-rolling Goody's own call-to-call volatility.
**The 60s cache alone did not fix it** - retesting live still showed "isn't
available right now." Root cause: Supabase Edge Functions can serve two
requests moments apart on different isolates, each with its own empty
module-level cache - there's no guarantee of hitting the same warm instance,
so the in-memory cache couldn't be relied on to survive between the
`search_gifts` turn and the later `select_gift` turn.

**Actual fix**: `handleSelectGift` and `handleConfirmScheduledGift` now
accept an optional `fallbackProduct`, used when a fresh Goody lookup
doesn't find the product. The caller seeds `seenProducts` at the top of the
request from the prior turn's carried-over `recommendedProducts` (CC-02's
own metadata) before the tool loop runs, so a fallback is available even
when the model correctly skips re-searching for an explicit same-text
selection. This uses data the user was already shown and already agreed
to - not invented - so falling back to it for the write is arguably more
correct than failing outright over an upstream listing's own
inconsistency. Verified via live testing (the "Packable Tote Bag" flow
completed end to end after this fix) rather than a unit test - the
handlers are DB-calling, non-pure functions; the complex logic around them
(recommendation integrity, cross-turn context) is already covered in
`index.test.ts`.

**Fourth regression found via live retesting, after the fallback above was
deployed**: "Let's go with the Packable Tote Bag" *still* re-listed the same
six products instead of calling `select_gift` - confirmed via DB that
`recommendedProducts` metadata was persisting correctly this time (the
mechanics work), so this is pure model instruction-following variance:
`buildTurnContextMessage`'s instruction is conditional ("if, and only if,
the user's new message clearly names one of these... call select_gift"),
and `gpt-4o-mini` doesn't reliably apply that rule even with the exact
matching data sitting right in context.

**Fix**: `matchNamedRecommendedProduct` does a server-side, deterministic
substring match between the user's newest message and the carried-over
products' titles. When there's exactly one unambiguous match,
`buildDirectSelectionMessage` adds a *directive* (not conditional)
instruction for that turn specifically - "call select_gift right now with
productId X" - appended after the user's message (closest to the model's
turn) rather than folded into the general system prompt. This is
belt-and-suspenders on top of the existing conditional instruction, not a
replacement for it: it only fires on an unambiguous single match, so an
unclear or multi-item reference still falls through to the model's own
judgment. Covered by tests in `index.test.ts`, including a direct
reproduction of the exact failing message.

## Review step claiming a completed action before confirmation (found via live testing)

After the directive-selection fix above worked (select_gift finally fired
correctly), the review message itself read: *"I've scheduled the Packable
Tote Bag for Jake's birthday..."* followed by *"Please confirm if you'd
like to proceed with this gift!"* - directly contradictory. Confirmed via
DB that nothing was actually written (`scheduled_gifts` had no new row,
only `reviewMarker` metadata, same as any other correct review), so this
was a wording-only bug: the model used past-tense/completed-action language
for a step that is explicitly "a review, not a save." This is exactly the
kind of invented completed action the system prompt's hard boundaries
already forbid, but the review-specific instruction didn't say so
explicitly.

**Fix**: strengthened the review-presentation instruction (prompt-only, no
code/logic change) to require future/conditional phrasing ("I'll
schedule...", "Ready to send...") and explicitly forbid past-tense/
completed-action phrasing ("I've scheduled...", "Done!") until after the
user confirms and `confirm_scheduled_gift` actually runs.

## Past-dated occasion slipping through, and a stale reviewMarker leaking across tool calls (found via live testing)

Testing the confirm step found two compounding bugs, both in
`supabase/functions/thea-chat/index.ts`, surfaced by the same turn:

1. **Past-date loophole in `handleSelectGift`**: a confirmed-live recipient
   (`Jake`) has `birthday = "2023-10-28"` - a real recipient's birthday
   field always carries their actual, historical birth year. The model
   passed that raw stored value straight through as `occasionDate` instead
   of omitting it to get the correctly-computed next occurrence. The
   existing past-date guard exempted an exact match to the stored
   birthday/anniversary field from rejection (meant for a different case),
   which let a three-years-in-the-past date sail through as a "known
   occasion." **Fix**: the past-date check is now unconditional; if the
   explicit date is in the past *and* exactly matches the stored
   birthday/anniversary (i.e. the model clearly meant "their birthday" but
   passed the raw field), it's auto-corrected to the properly-computed next
   occurrence instead of either erroring or silently scheduling the past
   date.
2. **Stale `reviewMarker` leaking into persistence**: in the same turn,
   `select_gift` ran (producing a review for the Packable Tote Bag,
   internally using the bad date above) and `search_gifts` *also* ran, and
   the model's actual final reply presented the search list, not the
   review - but the review's marker was still captured into
   `conversation_messages.metadata` regardless, since the old code
   persisted whatever `select_gift` last returned, with no check against
   what the final reply actually showed. This is a real integrity gap:
   `confirm_scheduled_gift`'s whole safety mechanism depends on the
   persisted marker meaning "the user was actually shown this review."
   **Fix**: `shouldPersistReviewMarker` only keeps the marker when the
   final reply either echoes the literal `GIFT_REVIEW` text or names the
   reviewed product by its exact title (same title-fallback resolution as
   `recommendedProducts`) - otherwise it's dropped. Covered by tests in
   `index.test.ts`, including a direct reproduction of this exact turn.

## Tapped product cards also re-searched instead of selecting (found via live testing)

Also confirmed live: the frontend's "Select gift" button *does* exist and
*does* work (contrary to an earlier assumption recorded in this doc -
correcting that here) - tapping it sends a synthesized user message
embedding the exact product id, e.g. *"I'd like the Coffee Beans by
Methodical Coffee (product 0884fcbe-720f-4119-ba3a-472ebdf7da66)."* This
is the single most reliable selection signal possible - the frontend, not
the model, produced the id - yet the model still ignored it and ran a
fresh `search_gifts` instead of calling `select_gift`. The turn-context
carryover fixes above didn't help here because the prior turn (an
availability error) hadn't carried forward any `recommendedProducts` to
match against.

**Fix**: `extractTappedProductId` parses this exact `(product <uuid>)`
format directly out of the user's newest message, independent of carried-
over turn context (so it works even for a product tapped from a list shown
earlier in the very same reply). When found, `buildTappedSelectionMessage`
adds a directive "call select_gift right now" instruction. Covered by tests
in `index.test.ts`, including a direct reproduction of the tapped message.

**Takeaway for Cursor**: the product-card tap handler is real and already
sends a parseable, id-bearing message - CC-04's "tap a card" contract is
satisfied end to end once this fix is deployed. The earlier note in this
doc claiming `TheaAgent.tsx`'s cards have no `onClick` should be treated as
superseded by this live observation, not relied on.

## Explicit confirmation still not calling confirm_scheduled_gift (found via live testing - the most severe one)

After the tap-to-select fix above worked (a real review was shown, with
correct future-tense wording), replying "Yes, confirm it" - about as
unambiguous as a confirmation gets - still produced *another*
`select_gift`-style reply ("I've scheduled the Coffee Beans...") instead of
actually calling `confirm_scheduled_gift`. Confirmed via DB: no new
`scheduled_gifts` row was created; the "I've scheduled" claim was false
again, despite the review-wording fix from earlier (that fix addressed the
review step's own wording, not this separate failure to call the right
tool at all). This is the most severe compliance gap found this session -
it directly blocks the product's core function even when the user does
everything right.

**Fix**: same deterministic-directive pattern as the selection fixes above.
`fetchLastTurnContext` now also parses the prior turn's `reviewMarker` into
a structured `pendingReview` (`recipientId`/`productId`/`occasionDate`).
`looksLikeConfirmation` does a loose, intentionally permissive keyword match
on the user's newest message ("yes," "confirm," "do it," "sounds good,"
etc.) - safe to be permissive here specifically because it only matters
when `pendingReview` is also non-null, i.e. the immediately prior turn
specifically ended by presenting a review and asking to confirm, so a short
affirmative reply is overwhelmingly likely responding to exactly that. When
both are true, `buildConfirmDirectiveMessage` forces
`confirm_scheduled_gift` with the exact persisted ids/date, explicitly
forbidding another `select_gift` call. Covered by tests in
`index.test.ts`, including a direct reproduction of "Yes, confirm it."

## Directive instructions still weren't reliable enough - made selection/confirm deterministic

After the guide-based system prompt rewrite landed (separate PR), re-testing the same
"tap a card, then confirm" flow found the directive-instruction approach above still
wasn't reliable: tapping "Select gift" produced a plausible-looking review reply with
*no* `reviewMarker` persisted (meaning `select_gift` was never actually called - the
model just narrated a review from context), and the follow-up "Yes, confirm it"
produced another ungrounded narration instead of calling `confirm_scheduled_gift`. No
DB write happened either time, despite the replies reading as if something had.

This is the same class of problem as every fix in this section - a strongly-worded
system message is still something the model can choose not to follow - and after
several rounds of stronger wording, that approach has hit diminishing returns.

**Fix**: when the signal is unambiguous (a tapped product id via `extractTappedProductId`
with a known active recipient, or an explicit confirmation via `looksLikeConfirmation`
with a persisted `pendingReview`), the server now calls `handleSelectGift` /
`handleConfirmScheduledGift` directly, before the model is ever asked to decide
whether to call them. The real result is injected into the conversation as a synthetic
tool-call/tool-result exchange, so the model's only job for that turn is phrasing the
already-true outcome, not deciding whether the action happened. This removes the
failure mode entirely for the two cases where there was never any real ambiguity to
begin with; the model still drives tool calls normally for everything else (free-text
selection without a tapped id, searching, recipient edits, etc).

## Invented gift ideas when search_gifts comes up empty (found via live testing)

`supabase/functions/thea-chat/index.ts`. Reported from a live session: asking
for a narrow combination (e.g. "sports related, $50 or less") that genuinely
has no catalog matches, then asking Thea for "general examples," produced a
bulleted list of non-catalog, invented gift ideas ("Cozy Blanket," "Coffee
Gift Set," "Personalized Water Bottle") - a direct violation of the hard
"never invent products" rule. The existing hallucination guard
(`checkRecommendationIntegrity`, originally inline, now exported for unit
testing) only caught bold-product-name-plus-inline-price text
(`**Name** ... $24`); this bulleted list had no per-item price, so it slid
through untouched, and the user picking one of the fake items then hit a
dead end ("I couldn't find any water bottles available").

**Fix**: two parts, both covered by `index.test.ts`.
- System prompt: explicit instruction that an empty `search_gifts` result
  must lead to either a broader re-search or an honest "nothing matches
  right now," never a fallback list of hypothetical ideas.
- Server-side guard (defense in depth, same philosophy as the existing
  RECOMMENDED_IDS checks): a reply with 2+ bulleted, bolded item names and no
  `RECOMMENDED_IDS` line is now treated the same as unresolved ids - it
  forces a genuine re-search rather than asking the model to "add ids" to
  products that were never real.

## CC-08: legacy-catalog verification (investigation, narrow cleanup only)

Investigated via a live read-only DB query plus direct code reading, per the
brief's "report evidence before cleanup" instruction.

- **Confirmed dead, deleted**: `src/lib/giftDefaults.ts` (unimported
  anywhere, hardcoded ~13 legacy `gid://shopify/...` ids),
  `src/components/ShopifySetupGuide.tsx`, `src/components/ShopifyOrderStatus.tsx`
  (both fully unreferenced outside their own file).
- **Confirmed live data issue, not fixed here**: 2 production recipients
  (same VIP user) still hold a pre-migration `gid://shopify/ProductVariant/...`
  in `default_gift_variant_id`. Traced the consequence all the way through
  `process-automation-lifecycle/index.ts`: `handleFundReservation` already
  catches its own errors and logs an `"error"` automation_logs row per
  recipient - it does **not** abort other recipients or the batch (locked in
  by `process-automation-lifecycle/index.test.ts`). So this is a contained,
  silent per-recipient failure (that recipient's automation just never
  funds), not a system-wide risk. Left as-is, flagged for a product decision
  (clear the stale default vs. pick a live replacement) rather than silently
  rewritten.
- **Confirmed dormant, not removed**: `fulfillment_orders`/`fulfillment_options`
  tables are actively coded against (`fulfillment-router/index.ts`,
  `GiftHistory.tsx`) but hold 0 rows in production - not the live order path
  today. No code change; worth a product conversation about whether to
  finish wiring it up or retire it later.
- Historical `scheduled_gifts`/`shopify_order_id` values (6 rows) were left
  untouched - they're fulfilled history, not something to "fix."

## CC-05: catalog relevance - existing contract (no change made)

Both `thea-chat`'s `search_gifts` tool and the `gift-catalog` edge function
already rank/filter by stated interests rather than plain substring
matching: `thea-chat` scores against a per-interest keyword list with
word-boundary matching and a false-friend scrub (e.g. "coffee table" doesn't
match "coffee" - see `scoreInterestText`/`scrubFalseFriends`, covered by
`index.test.ts`); `gift-catalog` goes further with an LLM curation pass that
returns `why`/`fit: "exact" | "adjacent"` per pick and an `askUser` array for
substitutes that need permission (red wine requested, only white wine live,
etc). Both return a verified image URL or `null`, never a fabricated one.
Reviewed this pass and found no reproduced failure beyond S06 above (fixed
under CC-02) - no ranking behavior was changed.

## Frontend gaps confirmed this pass (not implemented here - Cursor's job)

- ~~`TheaAgent.tsx`'s product cards render with no `onClick`/handler~~ -
  **superseded, see "Tapped product cards" section below**: live testing
  found a working "Select gift" button that sends a parseable, id-bearing
  message. This earlier note was wrong (or the UI has since changed); the
  tap-to-select path is real and now has a backend fix to go with it.
- No caller reads the top-level `writes` array from a chat response to
  invalidate `recipients`/gift queries - the write-acknowledgement contract
  from CC-01/03/04 has no frontend consumer yet.
- `action: "history"` (CC-03's chat-restore-on-mount contract) is still
  unused by any frontend caller - unchanged known gap from before.

## Running the regression tests

Edge functions run on Deno, which has a built-in test runner - no new
dependency needed. Each `index.ts` guards its `Deno.serve`/`serve(...)` call
behind `if (import.meta.main)` so a test file can import it for its exported
helpers without starting a live listener (production behavior - the
Supabase Dashboard function editor running the file as the entry point - is
unchanged).

```
deno test --allow-env --allow-read supabase/functions/thea-chat/index.test.ts
deno test --allow-env supabase/functions/process-automation-lifecycle/index.test.ts
```

No CI wiring - not requested by the brief.
