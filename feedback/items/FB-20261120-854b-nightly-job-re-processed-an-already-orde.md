---
id: FB-20261120-854b
type: bug
status: fixed
title: Nightly job re-processed an already-ordered gift and sent false emails
reporter: kevin
created: 2026-11-20
area: fulfillment
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
At 3:00 AM Kora's gift (already ordered) got a 'Gift confirmed' email and an 'Automation issue' email.

## Expected / desired
Ordered gifts are skipped by the nightly job.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-20 fixed: PR: nightly query and processGiftStage skip gifts with a goody_order_id or ordered/fulfilled/shipped status. Awaiting verification.
