// Regression tests for the CC-02 cross-turn context fix and the pure
// catalog-matching helpers. Run with:
//   deno test --allow-env --allow-read supabase/functions/thea-chat/index.test.ts
// (index.ts guards its Deno.serve call behind `import.meta.main` so this
// import doesn't start a live HTTP listener - see the comment there.)
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  buildConfirmDirectiveMessage,
  buildDirectSelectionMessage,
  buildTappedSelectionMessage,
  buildTurnContextMessage,
  checkRecommendationIntegrity,
  extractTappedProductId,
  looksLikeConfirmation,
  matchNamedRecommendedProduct,
  nextOccasionDate,
  normalizeInterests,
  resolvePresentUi,
  looksLikeCalendarConnectIntent,
  shouldForceCalendarConnectUi,
  buildCalendarConnectDirectiveMessage,
  scoreInterestText,
  shouldPersistReviewMarker,
  scrubFalseFriends,
} from "./index.ts";

Deno.test("normalizeInterests dedupes case-insensitively, caps at 3, newest wins on overflow", () => {
  const result = normalizeInterests(["Coffee", "Plants"], ["coffee", "Cooking", "Travel"]);
  assertEquals(result, ["Plants", "Cooking", "Travel"]);
});

Deno.test("normalizeInterests treats a null existing list as empty", () => {
  assertEquals(normalizeInterests(null, ["Coffee"]), ["Coffee"]);
});

Deno.test("normalizeInterests drops non-strings and overlong entries", () => {
  const result = normalizeInterests([], ["Coffee", 42, "x".repeat(41), "Tea"]);
  assertEquals(result, ["Coffee", "Tea"]);
});

Deno.test("nextOccasionDate prefers birthday over anniversary when both are set", () => {
  const result = nextOccasionDate("2020-05-01", "2020-06-01");
  assert(result);
  assertEquals(result?.occasion, "Birthday");
  assertEquals(result?.occasionType, "birthday");
});

Deno.test("nextOccasionDate returns null when neither date is known", () => {
  assertEquals(nextOccasionDate(null, null), null);
});

Deno.test("scoreInterestText scrubs the 'coffee table' false-friend to zero", () => {
  const score = scoreInterestText("a lovely coffee table book for the living room", ["coffee"]);
  assertEquals(score, 0);
});

Deno.test("scoreInterestText still scores a real coffee gift above zero", () => {
  const score = scoreInterestText("whole bean coffee roast from a local coffee shop", ["coffee"]);
  assert(score > 0);
});

Deno.test("scrubFalseFriends removes only the known false-friend phrase, not unrelated uses of the word", () => {
  const scrubbed = scrubFalseFriends("a coffee table and a coffee mug", ["coffee"]);
  assert(!scrubbed.includes("coffee table"));
  assert(scrubbed.includes("coffee mug"));
});

Deno.test("buildTurnContextMessage returns null when there's nothing carried over", () => {
  assertEquals(buildTurnContextMessage(null), null);
  assertEquals(buildTurnContextMessage({}), null);
});

Deno.test("buildTurnContextMessage surfaces last-shown products so a same-text pick resolves without re-searching (fixes S06)", () => {
  const message = buildTurnContextMessage({
    recommendedProducts: [{ id: "prod_123", title: "Coffee Beans by Methodical Coffee", price: 24 }],
  });
  assert(message?.includes("prod_123"));
  assert(message?.includes("Coffee Beans by Methodical Coffee"));
  assert(message?.includes("call select_gift directly"));
});

Deno.test("buildTurnContextMessage explicitly tells the model to search again for a different request, not force-fit the carried-over list (regression: a follow-up asking for a new price range hit the MAX_TOOL_ITERATIONS fallback because the old wording read as an absolute 'never search again')", () => {
  const message = buildTurnContextMessage({
    recommendedProducts: [{ id: "prod_123", title: "Coffee Beans by Methodical Coffee", price: 16 }],
  });
  assert(message?.includes("If, and only if"));
  assert(message?.includes("ignore this list entirely and call search_gifts fresh"));
  assert(message?.includes("a new or different budget/price range"));
});

Deno.test("buildTurnContextMessage surfaces the in-focus recipient so a write doesn't need a redundant get_recipients call (fixes S03)", () => {
  const message = buildTurnContextMessage({ activeRecipient: { id: "rec_1", name: "Jordan" } });
  assert(message?.includes("rec_1"));
  assert(message?.includes("Jordan"));
  assert(message?.includes("instead of re-calling get_recipients"));
});

const seenProducts = (entries: Array<[string, string]>) =>
  new Map(entries.map(([id, title]) => [id, { title }]));

Deno.test("checkRecommendationIntegrity passes a real recommendation backed by RECOMMENDED_IDS and a seen product", () => {
  const content = [
    "Here's a great pick:",
    "**Coffee Beans by Methodical Coffee** - $24, perfect for a coffee lover.",
    "RECOMMENDED_IDS: prod_123",
  ].join("\n");
  const result = checkRecommendationIntegrity(content, seenProducts([["prod_123", "Coffee Beans by Methodical Coffee"]]));
  assertEquals(result.mentionedIds, ["prod_123"]);
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, false);
});

Deno.test("checkRecommendationIntegrity recovers via exact title match when the model forgets RECOMMENDED_IDS but names a real product correctly (regression: this silently broke CC-02's cross-turn carryover, since nothing got persisted for the next turn to read back)", () => {
  const content = "Here's a great pick:\n**Coffee Beans by Methodical Coffee** - $24, perfect for a coffee lover.";
  const result = checkRecommendationIntegrity(content, seenProducts([["prod_123", "Coffee Beans by Methodical Coffee"]]));
  assertEquals(result.mentionedIds, ["prod_123"]);
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, false);
});

Deno.test("checkRecommendationIntegrity still flags a bolded product with a price that matches no real search result by title (genuinely unresolvable, not just marker-less)", () => {
  const content = "Here's a great pick:\n**Something Made Up** - $24, perfect for a coffee lover.";
  const result = checkRecommendationIntegrity(content, seenProducts([["prod_123", "Coffee Beans by Methodical Coffee"]]));
  assertEquals(result.missingMarker, true);
});

Deno.test("checkRecommendationIntegrity does not title-match an unrelated bolded phrase that merely contains a product name as a substring", () => {
  const content = "**Coffee Beans by Methodical Coffee is out of stock** - sorry about that, no price here though.";
  const result = checkRecommendationIntegrity(content, seenProducts([["prod_123", "Coffee Beans by Methodical Coffee"]]));
  assertEquals(result.mentionedIds, []);
});

Deno.test("checkRecommendationIntegrity flags RECOMMENDED_IDS referencing an id never returned by search_gifts this turn", () => {
  const content = "**Coffee Beans by Methodical Coffee** - $24.\nRECOMMENDED_IDS: prod_999";
  const result = checkRecommendationIntegrity(content, seenProducts([["prod_123", "Coffee Beans by Methodical Coffee"]]));
  assertEquals(result.needsRealSearch, true);
});

Deno.test("checkRecommendationIntegrity flags an invented bulleted list of generic gift ideas with no RECOMMENDED_IDS and no title match (reproduces the live audit bug)", () => {
  const content = [
    "Here are some general gift ideas under $50:",
    "",
    "- **Cozy Blanket** - Perfect for relaxing at home.",
    "- **Coffee Gift Set** - Great for any coffee lover.",
    "- **Personalized Water Bottle** - Useful and stylish.",
    "- **Succulent Planter** - A fun touch for home decor.",
    "",
    "Let me know if any of these resonate, or if you want to explore more options!",
  ].join("\n");
  const result = checkRecommendationIntegrity(content, seenProducts([]));
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, true);
});

Deno.test("checkRecommendationIntegrity recognizes an explicit, unambiguous selection of a real product by its exact bolded title (reproduces the live S06-style bug: 'Let's go with the Packable Tote Bag' re-listed instead of selecting)", () => {
  const content = "Here are the available gifts for Jake between $25 and $50:\n\n• **Packable Tote Bag** - $25  \nPractical and perfect for everyday use.\n\nWould you like to go with the **Packable Tote Bag**?";
  const result = checkRecommendationIntegrity(content, seenProducts([["prod_tote", "Packable Tote Bag"]]));
  assertEquals(result.mentionedIds, ["prod_tote"]);
  assertEquals(result.missingMarker, false);
});

Deno.test("checkRecommendationIntegrity leaves ordinary conversational replies alone", () => {
  const result = checkRecommendationIntegrity("What's your budget for this gift?", seenProducts([]));
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, false);
});

const RECOMMENDED = [
  { id: "prod_tote", title: "Packable Tote Bag", price: 25 },
  { id: "prod_coffee", title: "Coffee Beans by Methodical Coffee", price: 16 },
];

Deno.test("matchNamedRecommendedProduct finds an unambiguous text match (reproduces the live bug: 'Let's go with the Packable Tote Bag' still re-listed instead of selecting, even with the conditional carried-over instruction present)", () => {
  const match = matchNamedRecommendedProduct("Let's go with the Packable Tote Bag", RECOMMENDED);
  assertEquals(match, { id: "prod_tote", title: "Packable Tote Bag", price: 25 });
});

Deno.test("matchNamedRecommendedProduct is case-insensitive", () => {
  const match = matchNamedRecommendedProduct("i'll take the packable tote bag please", RECOMMENDED);
  assertEquals(match?.id, "prod_tote");
});

Deno.test("matchNamedRecommendedProduct returns null when nothing in the message matches a carried-over title", () => {
  assertEquals(matchNamedRecommendedProduct("What else do you have?", RECOMMENDED), null);
});

Deno.test("matchNamedRecommendedProduct returns null (ambiguous) when the message names more than one carried-over product", () => {
  assertEquals(matchNamedRecommendedProduct("Maybe the Packable Tote Bag or the Coffee Beans by Methodical Coffee", RECOMMENDED), null);
});

Deno.test("matchNamedRecommendedProduct returns null with no carried-over products", () => {
  assertEquals(matchNamedRecommendedProduct("Let's go with the Packable Tote Bag", undefined), null);
});

Deno.test("buildDirectSelectionMessage returns null without a match", () => {
  assertEquals(buildDirectSelectionMessage(null, { id: "rec_1", name: "Jake" }), null);
});

Deno.test("buildDirectSelectionMessage includes the recipient hint when the active recipient is known", () => {
  const message = buildDirectSelectionMessage({ id: "prod_tote", title: "Packable Tote Bag", price: 25 }, { id: "rec_1", name: "Jake" });
  assert(message?.includes("prod_tote"));
  assert(message?.includes("rec_1"));
  assert(message?.includes("Jake"));
  assert(message?.includes("Call select_gift right now"));
});

Deno.test("buildDirectSelectionMessage omits the recipient hint when no active recipient is known yet", () => {
  const message = buildDirectSelectionMessage({ id: "prod_tote", title: "Packable Tote Bag", price: 25 }, null);
  assert(message?.includes("prod_tote"));
  assert(!message?.includes("recipientId"));
});

Deno.test("shouldPersistReviewMarker returns false with no marker", () => {
  assertEquals(shouldPersistReviewMarker(null, "anything", []), false);
});

Deno.test("shouldPersistReviewMarker is true when the final reply echoes the literal GIFT_REVIEW marker", () => {
  const marker = "rec_1:prod_tote:2026-11-01";
  assertEquals(shouldPersistReviewMarker(marker, "I'll schedule this. GIFT_REVIEW: rec_1:prod_tote:2026-11-01", []), true);
});

Deno.test("shouldPersistReviewMarker is true when the reviewed product is title-matched in the final reply even without the literal marker", () => {
  const marker = "rec_1:prod_tote:2026-11-01";
  assertEquals(shouldPersistReviewMarker(marker, "I'll schedule the Packable Tote Bag for Jake's birthday.", ["prod_tote"]), true);
});

Deno.test("shouldPersistReviewMarker is false (reproduces the live stale-marker bug) when select_gift ran earlier in the turn but the final reply is an unrelated list - e.g. the model also called search_gifts and presented that instead", () => {
  const marker = "rec_1:prod_tote:2026-11-01";
  const finalReply = "Here are the available gifts under $50 for Jake:\n\n• **Sterling Silver Birth Flower Bolo Bracelet** - $13\n• **Set of 3 Pickleballs** - $15";
  assertEquals(shouldPersistReviewMarker(marker, finalReply, ["prod_bracelet", "prod_pickleballs"]), false);
});

Deno.test("extractTappedProductId parses the frontend's tap-to-select message format (reproduces the live bug: tapping 'Select gift' still re-searched instead of calling select_gift with the embedded id)", () => {
  const message = "I'd like the Coffee Beans by Methodical Coffee (product 0884fcbe-720f-4119-ba3a-472ebdf7da66).";
  assertEquals(extractTappedProductId(message), "0884fcbe-720f-4119-ba3a-472ebdf7da66");
});

Deno.test("extractTappedProductId returns null for an ordinary typed message", () => {
  assertEquals(extractTappedProductId("Let's go with the Packable Tote Bag"), null);
});

Deno.test("buildTappedSelectionMessage returns null without a tapped id", () => {
  assertEquals(buildTappedSelectionMessage(null, { id: "rec_1", name: "Jake" }), null);
});

Deno.test("buildTappedSelectionMessage is directive and includes the recipient hint when known", () => {
  const message = buildTappedSelectionMessage("0884fcbe-720f-4119-ba3a-472ebdf7da66", { id: "rec_1", name: "Jake" });
  assert(message?.includes("0884fcbe-720f-4119-ba3a-472ebdf7da66"));
  assert(message?.includes("rec_1"));
  assert(message?.includes("Call select_gift right now"));
});

const PENDING_REVIEW = { recipientId: "rec_1", productId: "prod_coffee", occasionDate: "2026-10-28" };

Deno.test("looksLikeConfirmation recognizes an explicit confirmation (reproduces the live bug: 'Yes, confirm it' still produced another select_gift call and a falsely-worded 'I've scheduled...' reply instead of actually confirming)", () => {
  assert(looksLikeConfirmation("Yes, confirm it"));
  assert(looksLikeConfirmation("do it"));
  assert(looksLikeConfirmation("sounds good"));
  assert(looksLikeConfirmation("yep, go ahead"));
});

Deno.test("looksLikeConfirmation returns false for an unrelated message", () => {
  assertEquals(looksLikeConfirmation("What's the price again?"), false);
});

Deno.test("buildConfirmDirectiveMessage returns null without a pending review", () => {
  assertEquals(buildConfirmDirectiveMessage(undefined, true), null);
});

Deno.test("buildConfirmDirectiveMessage returns null when the message doesn't look like a confirmation, even with a pending review", () => {
  assertEquals(buildConfirmDirectiveMessage(PENDING_REVIEW, false), null);
});

Deno.test("buildConfirmDirectiveMessage is directive and carries all three review fields", () => {
  const message = buildConfirmDirectiveMessage(PENDING_REVIEW, true);
  assert(message?.includes("rec_1"));
  assert(message?.includes("prod_coffee"));
  assert(message?.includes("2026-10-28"));
  assert(message?.includes("Call confirm_scheduled_gift right now"));
  assert(message?.includes("do not call select_gift again"));
});

Deno.test("resolvePresentUi accepts calendar_connect and add_recipient without a recipient lookup", () => {
  assertEquals(resolvePresentUi({ module: "calendar_connect" }, null), { ok: true, ui: { module: "calendar_connect" } });
  assertEquals(resolvePresentUi({ module: "add_recipient", focus: "birthday" }, null), {
    ok: true,
    ui: { module: "add_recipient", focus: "birthday" },
  });
});

Deno.test("resolvePresentUi requires an owned recipient for edit_recipient", () => {
  assertEquals(resolvePresentUi({ module: "edit_recipient", recipientId: "missing" }, null).ok, false);
  assertEquals(
    resolvePresentUi({ module: "edit_recipient", recipientId: "rec_1", focus: "address" }, { id: "rec_1", name: "Aunty Andrea" }),
    { ok: true, ui: { module: "edit_recipient", recipientId: "rec_1", recipientName: "Aunty Andrea", focus: "address" } },
  );
});

Deno.test("resolvePresentUi rejects unknown modules and bogus focus values", () => {
  assertEquals(resolvePresentUi({ module: "wallet" }, null).ok, false);
  assertEquals(resolvePresentUi({ module: "add_recipient", focus: "ssn" }, null), { ok: true, ui: { module: "add_recipient" } });
});

Deno.test("looksLikeCalendarConnectIntent catches connect / import asks", () => {
  assert(looksLikeCalendarConnectIntent("can i connect my calendar and add more"));
  assert(looksLikeCalendarConnectIntent("sync Google Calendar"));
  assert(looksLikeCalendarConnectIntent("import birthdays from google"));
  assertEquals(looksLikeCalendarConnectIntent("what's a good gift for mom?"), false);
});

Deno.test("shouldForceCalendarConnectUi forces on intent, refusal, and short follow-ups", () => {
  assert(shouldForceCalendarConnectUi("connect my calendar", [], "", []));
  assert(shouldForceCalendarConnectUi("are you sure?", [
    { role: "user", content: "connect calendar" },
    { role: "assistant", content: "I can't connect to calendars." },
  ], "", []));
  assert(shouldForceCalendarConnectUi("hmm", [], "I'm sure! I can't access calendars or connect them.", []));
  assertEquals(
    shouldForceCalendarConnectUi("connect calendar", [], "", [{ module: "calendar_connect" }]),
    false,
  );
});

Deno.test("buildCalendarConnectDirectiveMessage is present only when forced", () => {
  assertEquals(buildCalendarConnectDirectiveMessage(false), null);
  assert(buildCalendarConnectDirectiveMessage(true)?.includes('present_ui'));
});
