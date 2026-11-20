---
id: FB-20261119-4ba3
type: bug
status: fixed
title: Goody receives single-name recipients as 'Kora Recipient'; Automation-API webhook signatures would be rejected
reporter: claude
created: 2026-11-19
area: fulfillment
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
After Kora's first order, Goody showed the recipient as 'Kora Recipient' (goody-order padded a missing last name with 'Recipient'). Also goody-webhook verified only one signing secret, but the Automation API webhook gets its own, so tracking events for orders placed with the Automation key would be rejected.

## Expected / desired
Send only the first name when there is no last name (Goody makes last_name optional); accept either signing secret.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: goodyRecipientName omits last_name when absent; goody-webhook accepts GOODY_WEBHOOK_SIGNING_SECRET or GOODY_AUTOMATION_WEBHOOK_SIGNING_SECRET. Awaiting verification on the next real order and a real webhook event.
