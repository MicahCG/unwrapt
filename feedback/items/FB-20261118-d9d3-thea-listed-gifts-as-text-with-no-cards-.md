---
id: FB-20261118-d9d3
type: bug
status: fixed
title: Thea listed gifts as text with no cards and claimed a selection it never made
reporter: kevin
created: 2026-11-18
area: thea
platform: 
assignee: 
fix: b2d2d1a
verified_by: 
---

## What happened
Asked to pick a gift for Kora: Thea reprinted a numbered list with no product cards, then said 'I've selected the cookies' and invented a $15 shortfall without calling select_gift.

## Expected / desired
Real search results shown as cards; selection only after select_gift.

## Message context
(none attached)

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-18 fixed: Unbacked lists force a real search; selection claims without select_gift are retried; list text stripped when cards are shown.
