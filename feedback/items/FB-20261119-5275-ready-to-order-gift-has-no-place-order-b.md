---
id: FB-20261119-5275
type: feature
status: fixed
title: Ready-to-order gift has no Place order button; only chat could place it
reporter: kevin
created: 2026-11-19
area: recipient-detail
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Kora's detail sheet shows 'Ready to order: the order can be reviewed and placed' but offers no way to place it; the only manual path was asking Thea in chat.

## Expected / desired
A 'Place order now' button with a confirmation step on the gift card.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: 'Place order now' on ready-to-order gift cards, with a confirm dialog; calls process-gift-fulfillment (manualTrigger), same as chat; plain-language result, nothing reported as ordered unless the backend says so. Awaiting verification on a real order.
