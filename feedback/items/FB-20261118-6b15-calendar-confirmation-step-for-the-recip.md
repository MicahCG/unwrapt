---
id: FB-20261118-6b15
type: feature
status: fixed
title: Calendar confirmation step for the recipient
reporter: kevin
created: 2026-11-18
area: onboarding
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
Reporter's note: 'Calendar confirmation for the recipient.'

## Expected / desired
A confirmation step so the user can confirm the calendar event/birthday details for a recipient. (Needs a design decision before building; see PR discussion.)

## Message context
(none attached)

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: Design: when the calendar auto-sync adds one person, the notice has a Review action that opens that person's details so the birthday can be confirmed and an address added. Also fixed a retry storm: a failed background sync is now throttled like a successful one. Awaiting verification.
