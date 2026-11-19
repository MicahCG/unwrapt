---
id: FB-20261119-5c9f
type: bug
status: fixed
title: Unpaid-gift nudge for another person appears mid-chat, and lists stale or far-off gifts
reporter: kevin
created: 2026-11-19
area: dashboard
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
While finishing Kora's gift, the chat ended with 'Happy!'s Grateful Mug is scheduled but payment isn't finished yet' plus 'Finish Jake's/Luigi's payment' chips. That line is a client-side nudge (not Thea) that picks any unpaid wallet gift regardless of occasion date: Happy!'s mug is for Sept 2027, and the same recipients have unpaid gifts from 2025 and Jan 2026.

## Expected / desired
Nudge only for gifts whose occasion is coming up, and never interrupt a conversation already in progress.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: unpaid wallet gifts only count when the occasion is 0-45 days away (fundsDueSoon); the arrival nudge never inserts itself once the user has sent a message. Awaiting verification.
