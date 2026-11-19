---
id: FB-20261118-2fbf
type: bug
status: fixed
title: Mobile Ask Thea sheet does not chat, only routes to preset ideas
reporter: kevin
created: 2026-11-18
area: thea
platform: mobile
assignee: 
fix: ca171cc
verified_by: 
---

## What happened
Typing 'Kora liked food' in the Ask Thea sheet shows a 'best next step: find a gift' card and start-here tiles instead of a reply.

## Expected / desired
Typed messages go to Thea and get a real reply.

## Message context
```text
Kora liked food
Thea: Here are some options...
(listed gifts with no cards)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-18 fixed: Real chat now enabled for VIP accounts (was an email allowlist). Free users still use intent routing by design.
