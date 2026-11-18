# Feedback queue (bugs & ideas)

You never run a script. Just talk to Codex or Claude in this repo; it handles the files, commands and git.
Nothing to install.

## Say things like this

**Report a bug or idea** (paste the message text and attach screenshots right in the prompt):
> Log this bug: [paste chat text or describe it]. Here's the screenshot. It's a mobile issue.

> Add a feature idea: let people pick a birthday manually in the calendar pop-up.

**Fix everything:**
> Work through the feedback queue. Fix every open item. Don't stop until all are fixed and checked.

**Double-check someone else's fix:**
> Verify the items marked fixed. Re-test each one; verify it or reopen it.

**See where we are:**
> What's left in the feedback queue? Are we done?

That's the whole process. The agent keeps the list in `feedback/`, commits and pushes, and says "done" only when every item is verified.

Rule of thumb: whoever fixes an item doesn't verify it. Ask the other person, or the other AI, to verify.

(Agents: see `AGENTS.md`. Humans who want the details: `docs/FEEDBACK_INTAKE.md`.)
