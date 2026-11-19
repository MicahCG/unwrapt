---
id: FB-20261119-228f
type: feature
status: fixed
title: Late-delivery acceptance: make accepting a late gift explicit and one tap
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
A gift that cannot arrive by the occasion was saved by a plain confirm with no explicit acceptance, Thea only described the lateness afterwards, the card timing used a default lead time instead of the gift's own, and a side question between the review and 'Yes' cancelled the pending review so the user had to confirm twice.

## Expected / desired
Say plainly it won't arrive in time and when it would; require an explicit one-tap 'Send it late anyway' (or pick another gift); keep a review pending through a side question.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: confirm no longer saves a late gift without acceptLate; review card shows the server's timing and a 'Send it late anyway' button; pending review survives side questions (last 4 replies). Awaiting verification.
