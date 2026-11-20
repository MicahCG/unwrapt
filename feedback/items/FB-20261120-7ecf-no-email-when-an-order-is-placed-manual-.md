---
id: FB-20261120-7ecf
type: bug
status: fixed
title: No email when an order is placed (manual button / chat orders)
reporter: kevin
created: 2026-11-20
area: notifications
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
After placing Kora's order via Place order now, no email arrived. Manual orders go through process-gift-fulfillment, which sends no email; only the nightly job emailed, and that one used the 'Gift shipped' template at order time.

## Expected / desired
One 'order placed' email for every route (button, chat, nightly job); 'shipped' only when Goody says so.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-20 fixed: PR: new order_placed email sent by process-gift-fulfillment on a real success (skips already-fulfilled); nightly job no longer sends a premature 'Gift shipped'. Awaiting verification on the next real order.
