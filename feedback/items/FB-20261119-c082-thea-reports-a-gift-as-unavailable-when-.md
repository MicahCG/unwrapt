---
id: FB-20261119-c082
type: bug
status: fixed
title: Thea reports a gift as 'unavailable' when it is really too late to deliver on time
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
With an occasion the next day, Thea reviewed a gift whose estimated arrival was weeks after the occasion, then after the user confirmed it said the item was 'currently unavailable' and listed alternatives. No scheduled gift was written and no Thea error was logged, so the item was not actually unavailable; the late-delivery rejection was misreported.

## Expected / desired
Say plainly that it cannot arrive in time (and when it would), and offer fast-shipping options or to send it late, instead of calling it unavailable.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: Root cause found in a live chat: follow-up searches were shown as text only and saved nothing, so a later pick had no product to fall back on and the lookup error read as 'unavailable'. Now every search shows cards and is saved, the lookup retries a fresh catalog, the error says it is not an out-of-stock, and the prompt forbids calling a gift unavailable. Awaiting verification.
