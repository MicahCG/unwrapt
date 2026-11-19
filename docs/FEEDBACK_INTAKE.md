# Shared bug / feature intake

One place for bugs and feature ideas that you, your partner, Claude and Codex all read and update.
Everything lives in the repo (no extra service), so it travels with `git pull` / `git push`.

```
feedback/items/FB-<date>-<id>-<slug>.md   one file per report (description, message context, notes)
feedback/assets/FB-<date>-<id>/1.png ...  its screenshots
scripts/feedback.mjs                      the CLI (plain Node, no install: node scripts/feedback.mjs ...)
AGENTS.md / CLAUDE.md                     tell Codex / Claude how to work the queue
```

## One-time setup (each person)
1. `git pull` the repo, (no install needed; Node 20+).
2. Claude Code reads `CLAUDE.md` automatically and Codex reads `AGENTS.md`. Nothing else to configure.
3. Check it works: `node scripts/feedback.mjs list`

## Reporting a bug or idea
```bash
node scripts/feedback.mjs new --type bug --title "Short title" --reporter kevin \
  --platform mobile --area thea \
  --description "What happened" --expected "What should happen" \
  --screenshot ~/Desktop/shot.png --screenshot ~/Desktop/shot2.png \
  --context-file chat.txt          # or pipe the pasted chat/message text in: pbpaste | node scripts/feedback.mjs new ...
git add feedback && git commit -m "feedback: <title>" && git push
```
`--type` is `bug` or `feature`. Attach as much message context as you can: the exact chat transcript,
what you typed, what Thea replied. Screenshots are copied into `feedback/assets/<id>/`.
The ID is date + random (e.g. `FB-20261118-2771`), so you and your partner can file at the same time
without clashing.

## Lifecycle
`open` -> `in-progress` -> `fixed` -> `verified` (or `wontfix` with a reason)

| Command | Meaning |
|---|---|
| `node scripts/feedback.mjs list` | unfinished items (`--all` for everything, `--status open`) |
| `node scripts/feedback.mjs show <id>` | read one item in full |
| `node scripts/feedback.mjs claim <id> --by claude` | take it (so two people/agents don't double up) |
| `node scripts/feedback.mjs resolve <id> --commit <sha> --note "what changed"` | code is done; still needs a re-check |
| `node scripts/feedback.mjs verify <id> --by codex --note "how it was checked"` | independently re-tested |
| `node scripts/feedback.mjs reopen <id> --note "still broken because..."` | not actually fixed |
| `node scripts/feedback.mjs wontfix <id> --note "why"` | decided not to do it |

A person or agent that fixed something should not be the only one to mark it `verified`; use the other
person or the other agent (Claude <-> Codex), or re-test in the running app.

## The "is everything fixed?" gate
```bash
node scripts/feedback.mjs check
```
Exits `1` and lists every item that is `open`, `in-progress` or `fixed` (not yet verified). Exits `0` only
when every item is `verified` or `wontfix`. Ask Claude or Codex: *"Work the feedback queue, then run
`node scripts/feedback.mjs check` and don't stop until it passes."*

## Typical flow
1. You or your partner file reports (`new`) and push.
2. Whoever picks one up runs `claim`, fixes it, runs tests, then `resolve`.
3. The other person, or the other agent, reproduces the original steps and runs `verify` (or `reopen`).
4. Before shipping, run `node scripts/feedback.mjs check`; it must pass.

Optional: add `node scripts/feedback.mjs check` as a required CI step if you want merges blocked while items are open.
