# Feedback queue (bugs & ideas)

Everything reported lives here as plain files, so people, Codex and Claude all see the same list.
**Nothing to install.** You only need git and Node (already needed for the app).

## Hand it to Codex (or Claude): paste this

> Work through the feedback queue in `feedback/`. Read `AGENTS.md` first.
> Take every item that is not verified, fix it, and mark it fixed.
> If an item is already fixed by someone else, re-check it yourself and verify it or reopen it.
> Do not stop until `node scripts/feedback.mjs check` says OK.

That is the whole job. The agent uses `node scripts/feedback.mjs ...` (no `npm install`).

## Report something
Easiest, with a command:
```bash
node scripts/feedback.mjs new --type bug --title "Short title" --reporter yourname \
  --description "What happened" --expected "What should happen" \
  --screenshot ~/Desktop/shot.png
```
No terminal? Copy `feedback/TEMPLATE.md` to `feedback/items/<anything>.md`, fill it in, drop screenshots in `feedback/assets/<id>/`. Agents will pick it up.
Then `git add feedback && git commit -m "feedback: title" && git push`.

## Is it all done?
`node scripts/feedback.mjs check` → `OK` only when every item is verified (or won't-fix).

Statuses: `open` → `in-progress` → `fixed` → `verified`. The one who fixes it never verifies it; the other person or AI does.
More: `docs/FEEDBACK_INTAKE.md`.
