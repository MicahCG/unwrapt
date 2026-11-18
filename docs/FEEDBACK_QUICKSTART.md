# Reporting bugs & ideas: the 2-minute guide

**Fastest path:** open Codex in this repo and paste the prompt in `feedback/README.md`. It does the rest.

We keep all bugs and feature ideas in one shared folder in the repo (`feedback/`).
Claude and Codex read the same folder, so they can fix things and tell us when nothing is left.

## Set up (once)
1. Pull the latest code: `git pull`
2. Test it: `node scripts/feedback.mjs list` (you should see a list of items). Nothing to install.

## Report a bug or idea
```bash
node scripts/feedback.mjs new --type bug --title "Short title" --reporter yourname \
  --description "What happened" --expected "What should happen" \
  --screenshot ~/Desktop/screenshot.png
```
- `--type` is `bug` or `feature`.
- Add `--platform mobile` or `--platform desktop` if it matters.
- Paste the chat/message text too: copy it, then run `pbpaste | node scripts/feedback.mjs new --title "..." ...`
- Add more than one screenshot by repeating `--screenshot`.

Then share it:
```bash
git add feedback && git commit -m "feedback: short title" && git push
```

## See what's left
```bash
node scripts/feedback.mjs list          # everything not finished
node scripts/feedback.mjs show <id>     # read one in full
```

## Let Claude or Codex fix things
Tell either one:
> Work through the feedback queue. Don't stop until `node scripts/feedback.mjs check` passes.

The steps an item goes through: `open` → `in-progress` → `fixed` → `verified`.
Whoever fixes it marks it `fixed`; the **other person or the other AI** re-tests it and marks it `verified`.

## Are we done?
```bash
node scripts/feedback.mjs check
```
- It says **OK** only when every item is `verified` (or `wontfix`).
- Otherwise it lists what's still open.

More detail: `docs/FEEDBACK_INTAKE.md`
