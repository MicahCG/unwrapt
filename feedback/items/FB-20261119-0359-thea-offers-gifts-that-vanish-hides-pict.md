---
id: FB-20261119-0359
type: bug
status: fixed
title: Thea offers gifts that vanish, hides pictures, and shows a fee line; catalog is shallower than Goody's site
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Checking out: a gift Thea offered could not be confirmed ('couldn't confirm the details') twice in a row; asking to see a picture got 'I can't show pictures'; cards listed a $7 fee and 'shipping & tax' where Goody shows free shipping; and Goody's own site has more options than Thea's list.

## Expected / desired
Read Goody's whole catalog, use the brand's real shipping, show a picture for any gift named, prefer gifts filed under the occasion, and say plainly when a gift is no longer sold.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: full catalog read (was first 300), shipping from Goody brand.shipping_price, retrieve-by-id with a real 'gone' check, occasion categories boost ranking, pictures for named gifts, fee line removed from cards. Awaiting verification.
