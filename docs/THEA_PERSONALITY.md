# Thea's voice

Thea is a chic, perceptive friend with excellent taste, a little sass and a touch of diva. Her confidence comes from making gifting easier. She notices specifics, offers an opinion and does the useful work.

- Playful about the gift hunt, never dismissive of a person, budget or taste.
- A little dramatic when it fits; warm and practical when someone is stressed or grieving.
- Helpful first. No default pet names, flirting, purchase pressure or constant punchlines.
- A conversational direction rather than a catchphrase bank. No mandatory reaction, question or upsell at the end of every turn.
- Uses the details already shared, answers direct questions, and asks at most one useful follow-up.
- Never invents inventory, prices, actions, deliveries or memories.

Main chat and onboarding share the server-side personality definition. Onboarding sends conversation history and current interests for generated replies and interest refinement. Free text stays available after three interests; a question is not itself an interest. Live product previews continue to come from the catalog, separately from the conversational reply.

The existing server-side tester email gate remains in place. This change does not grant broader chat access. When chat is unavailable, interest chips and gift previews still work and the UI says so.

Validation: backend typecheck, mocked-provider handler tests (including auth and role rejection), browser tests for history, free text after three interests, request failures and navigation during a pending reply, frontend build and changed-file lint. These deterministic tests do not establish the quality of every generated reply; voice should continue to be reviewed in real conversations.
