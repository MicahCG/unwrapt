---
id: FB-20261119-9195
type: bug
status: fixed
title: First real Goody order failed: Payment method not found (hard-coded COMMERCE_STORED_VALUE)
reporter: kevin
created: 2026-11-19
area: fulfillment
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Pressing Place order now for Kora's cookies failed with 'Goody order creation failed with 400'. Logs: order_batches 400 {"error":"Payment method not found"}. goody-order sent payment_method_id: COMMERCE_STORED_VALUE, which this production account does not recognise. Wallet hold was restored; nothing charged.

## Expected / desired
Order uses a real payment method (the prepaid balance) and Goody's reason reaches the user.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: goody-order lists GET /v1/payment_methods, uses the method holding a prepaid balance (or GOODY_PAYMENT_METHOD_ID), refuses to silently use a card, and includes Goody's reason in errors. Awaiting verification with a real order.
