---
id: FB-20261119-f798
type: bug
status: fixed
title: goody-order only searched the first 300 Goody products, so gifts deeper in the catalog would fail to order
reporter: claude
created: 2026-11-19
area: fulfillment
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Thea now picks from Goody's whole catalog, but goody-order located the product by paging only 3 pages of 100, returning 'Selected Goody product is no longer available' for anything beyond. Found while tracing how Kora's cookies would ship.

## Expected / desired
Look the product up by id; page through the whole list only as a fallback.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: goody-order retrieves GET /v1/products/{id} first (404 = gone), then falls back to paging up to 40 pages. Awaiting verification against a live order.
