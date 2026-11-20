---
id: FB-20261120-95f1
type: feature
status: fixed
title: Shipped email: link tracking number, drop Track in Goody, fix unstyled body
reporter: kevin
created: 2026-11-20
area: emails
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
First live shipped email: Track in Goody needs a Goody account; tracking number not clickable; body rendered without padding/panels.

## Expected / desired
Tracking number links to the carrier; no Goody button; layout renders without <style>.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-20 fixed: PR #119: trackingUrl helper, hyperlinked number, Goody button replaced, key styles inlined. Awaiting verification.
