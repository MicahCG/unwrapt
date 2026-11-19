# Agent instructions (Codex, Claude, and anyone else)

## Shared bug / feature intake
## Prompt-only workflow (the user never runs commands)
The people using this repo only talk to you in plain language. YOU run every command (`node scripts/feedback.mjs ...`, git) for them. Never tell them to run a script.

- **"Log this bug/idea: ..."** (with pasted chat text and/or attached screenshots): create an item with `node scripts/feedback.mjs new --type <bug|feature> --title "..." --reporter <their name or unknown> --description "..." --expected "..."`. Pass the pasted text via `--context-file` (write it to a temp file first) and each attached image via `--screenshot <path>`. Write a clear title and description yourself from what they gave you; ask at most one question, only if the report is unusable. Then commit the `feedback/` changes and push. Reply with the item id.
- **"What's left?" / "Are we done?"**: run `check` (and `list`), summarize in plain words.
- **"Work the queue" / "fix the bugs"**: follow the steps below until `check` exits 0. Commit and push as you go.
- **"Verify the fixed ones"**: re-test each `fixed` item against the current code or app; `verify` or `reopen`.
- If a screenshot was only shown in chat and you have no file path, say so and note in the item that the screenshot was not saved.

No install needed: the CLI is plain Node (`node scripts/feedback.mjs`). A person can also add an item by hand from `feedback/TEMPLATE.md`; treat those like any other item (fix the id/date in the frontmatter if they're placeholders).
Reports live in `feedback/items/*.md` (screenshots in `feedback/assets/<id>/`). Full guide: `docs/FEEDBACK_INTAKE.md`.

When asked to work the feedback queue:
1. `node scripts/feedback.mjs list` to see unfinished items, `node scripts/feedback.mjs show <id>` to read one.
   Read the whole file: the **Message context** is the real transcript, and screenshots are in `feedback/assets/<id>/` (open the image files, do not guess).
2. `node scripts/feedback.mjs claim <id> --by <claude|codex>` before starting.
3. Reproduce, fix, and run the relevant tests/typecheck. Then
   `node scripts/feedback.mjs resolve <id> --commit <sha> --note "what changed"`.
4. Never mark your own fix `verified`. Verifying means someone else (the other agent or a person) re-ran the original steps. If asked to verify, actually reproduce the report against the current code or app, then
   `node scripts/feedback.mjs verify <id> --by <who> --note "how"`, or `reopen <id> --note "why"` if it still fails.
5. Finish only when `node scripts/feedback.mjs check` exits 0. If it does not, list what is left and keep going or say what is blocked.
6. Commit item/asset changes together with the code change that fixed them. Do not delete items; use `wontfix --note`.

## Notes
- Do not paste secrets or tokens into feedback items; they are committed to git.
- Supabase edge functions are deployed separately from the frontend (see PR descriptions).
