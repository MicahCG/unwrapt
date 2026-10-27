// Regression tests for the CC-02 cross-turn context fix and the pure
// catalog-matching helpers. Run with:
//   deno test --allow-env supabase/functions/thea-chat/index.test.ts
// (index.ts guards its Deno.serve call behind `import.meta.main` so this
// import doesn't start a live HTTP listener - see the comment there.)
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  buildDirectSelectionMessage,
  buildTurnContextMessage,
  checkRecommendationIntegrity,
  matchNamedRecommendedProduct,
  nextOccasionDate,
  normalizeInterests,
  scoreInterestText,
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
