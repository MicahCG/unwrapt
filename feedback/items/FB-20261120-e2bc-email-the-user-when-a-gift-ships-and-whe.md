---
id: FB-20261120-e2bc
type: feature
status: fixed
title: Email the user when a gift ships and when it is delivered
reporter: kevin
created: 2026-11-20
area: fulfillment
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Goody tracking webhook is registered; shipped sent no email and delivered used the old gift_sent copy.

## Expected / desired
A shipped email (with tracking when available) and a separate delivered email, each sent once.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-20 fixed: PR: goody-webhook emails gift_sent on first shipped event and new gift_delivered on first delivered event; replays do not re-email. Awaiting verification.
