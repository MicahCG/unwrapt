---
id: FB-20261119-f882
type: feature
status: fixed
title: Ideas catalog loads slowly
reporter: kevin
created: 2026-11-19
area: catalog
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Opening the Ideas catalog takes a long time.

## Expected / desired
Loads quickly, ideally instantly on repeat opens.

## Message context
(none attached)

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: Fixed in PR #90 (server cache + parallel fetch + prefetch); awaiting verification and a timing check.
