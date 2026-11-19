---
id: FB-20261119-8afa
type: feature
status: fixed
title: Helpful chips under the chat that follow the conversation; fresh options when trying again
reporter: kevin
created: 2026-11-19
area: thea-chat
platform: 
assignee: claude
fix: 
verified_by: 
---

## What happened
The chips under the chat stay on 'Finish X's payment' throughout. Wanted: chips that follow scheduling a gift (show options, price limits, pick for me, someone else), then other people once a gift is scheduled, and that update when the user says to focus on another person. Also, trying Kora again should give different options.

## Expected / desired
Context-aware suggestion buttons that send ready-made messages; new searches skip gifts already shown for that person.

## Message context
```text
(none)
```

## Screenshots
(none attached)

## Notes / fix log
- 2026-11-19 fixed: PR: chatSuggestions rules (options / under $25 / under $50 / pick for me / someone else; people after a gift is scheduled; people picker on 'focus on someone else'); every new search skips gifts already shown for the same person. Awaiting verification.
