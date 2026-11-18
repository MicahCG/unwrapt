# Reporting bugs & ideas: the 2-minute guide

We keep all bugs and feature ideas in one shared folder in the repo (`feedback/`).
Claude and Codex read the same folder, so they can fix things and tell us when nothing is left.

## Set up (once)
1. Pull the latest code: `git pull`
2. Install: `npm install`
3. Test it: `npm run feedback -- list` (you should see a list of items)

## Report a bug or idea
```bash
npm run feedback -- new --type bug --title "Short title" --reporter yourname \
  --description "What happened" --expected "What should happen" \
  --screenshot ~/Desktop/screenshot.png
```
- `--type` is `bug` or `feature`.
- Add `--platform mobile` or `--platform desktop` if it matters.
- Paste the chat/message text too: copy it, then run `pbpaste | npm run feedback -- new --title "..." ...`
- Add more than one screenshot by repeating `--screenshot`.

Then share it:
```bash
git add feedback && git commit -m "feedback: short title" && git push
```

## See what's left
```bash
npm run feedback -- list          # everything not finished
npm run feedback -- show <id>     # read one in full
```

## Let Claude or Codex fix things
Tell either one:
> Work through the feedback queue. Don't stop until `npm run feedback:check` passes.

The steps an item goes through: `open` → `in-progress` → `fixed` → `verified`.
Whoever fixes it marks it `fixed`; the **other person or the other AI** re-tests it and marks it `verified`.

## Are we done?
```bash
npm run feedback:check
```
- It says **OK** only when every item is `verified` (or `wontfix`).
- Otherwise it lists what's still open.

More detail: `docs/FEEDBACK_INTAKE.md`
