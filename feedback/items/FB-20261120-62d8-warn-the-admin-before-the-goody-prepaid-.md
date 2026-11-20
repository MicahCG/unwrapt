---
id: FB-20261120-62d8
type: feature
status: fixed
title: Warn the admin before the Goody prepaid balance runs out
reporter: kevin
created: 2026-11-20
area: fulfillment
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Goody orders are paid from a prepaid Goody Balance that cannot be topped up from code; after Kora's order it was $5.75. When it runs dry orders fail.

## Expected / desired
An email to the admin(s) when the Goody balance drops below about two orders' worth, at most once a day.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-20 fixed: PR: goodyBalance helper checks GET /v1/payment_methods after each order and in the nightly job; emails admins (user_roles) a goody_balance_low email below $55 (GOODY_LOW_BALANCE_THRESHOLD_USD), once per 24h via automation_logs. Awaiting verification.
