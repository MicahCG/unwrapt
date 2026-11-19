---
id: FB-20261119-bfef
type: bug
status: fixed
title: Chat-confirmed gift sends no email; header wallet balance stale on phone; Thea called the arrive-by date the birthday
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
After confirming the Cravory cookies for Kora in chat: no confirmation email arrived, the phone header still showed $32.00 while desktop (refreshed) showed $0.00 available, and Thea said 'her birthday on November 30' when the arrive-by date was Nov 30 and the birthday is Dec 3. Chips also rendered "Eric's's gift" for a person saved as an event title.

## Expected / desired
A confirmation email on chat confirm; the pill reloads after a hold; dates named correctly; no doubled possessive.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: chat confirm now emails (gift_scheduled, with picture, accurate next-steps); wallet pill refreshes on hold/top-up and when the tab returns to the foreground; prompt separates deliveryBy from the occasion date; chip names stripped of event-title possessive. Awaiting verification.
