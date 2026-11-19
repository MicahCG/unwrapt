---
id: FB-20261119-c082
type: bug
status: open
title: Thea reports a gift as 'unavailable' when it is really too late to deliver on time
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: 
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
