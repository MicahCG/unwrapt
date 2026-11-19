---
id: FB-20261119-9cf5
type: feature
status: fixed
title: Simplify Thea's gift flow and show proposals as cards, not text lists
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
After 'more options' or 'something festive', Thea answers with a plain text bullet list instead of gift cards, and getting from asking to ordering takes many turns (find, add funds, confirm, confirm again).

## Expected / desired
Every set of proposals renders as selectable cards; fewer turns from pick to scheduled; confirm once.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: Search results now always render as cards (matching loosely-worded titles, else the top results) and the bullet list is stripped. The longer confirm-twice path is not changed here. Awaiting verification.
