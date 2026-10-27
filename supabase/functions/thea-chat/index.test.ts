// Regression tests for the CC-02 cross-turn context fix and the pure
// catalog-matching helpers. Run with:
//   deno test --allow-env supabase/functions/thea-chat/index.test.ts
// (index.ts guards its Deno.serve call behind `import.meta.main` so this
// import doesn't start a live HTTP listener - see the comment there.)
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  buildTurnContextMessage,
  checkRecommendationIntegrity,
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
  assert(message?.includes("do not call search_gifts again"));
});

Deno.test("buildTurnContextMessage surfaces the in-focus recipient so a write doesn't need a redundant get_recipients call (fixes S03)", () => {
  const message = buildTurnContextMessage({ activeRecipient: { id: "rec_1", name: "Jordan" } });
  assert(message?.includes("rec_1"));
  assert(message?.includes("Jordan"));
  assert(message?.includes("instead of re-calling get_recipients"));
});

Deno.test("checkRecommendationIntegrity passes a real recommendation backed by RECOMMENDED_IDS and a seen product", () => {
  const content = [
    "Here's a great pick:",
    "**Coffee Beans by Methodical Coffee** - $24, perfect for a coffee lover.",
    "RECOMMENDED_IDS: prod_123",
  ].join("\n");
  const result = checkRecommendationIntegrity(content, new Set(["prod_123"]));
  assertEquals(result.mentionedIds, ["prod_123"]);
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, false);
});

Deno.test("checkRecommendationIntegrity flags a real-looking product named without the required RECOMMENDED_IDS line", () => {
  const content = "Here's a great pick:\n**Coffee Beans by Methodical Coffee** - $24, perfect for a coffee lover.";
  const result = checkRecommendationIntegrity(content, new Set());
  assertEquals(result.missingMarker, true);
  assertEquals(result.needsRealSearch, false);
});

Deno.test("checkRecommendationIntegrity flags RECOMMENDED_IDS referencing an id never returned by search_gifts this turn", () => {
  const content = "**Coffee Beans by Methodical Coffee** - $24.\nRECOMMENDED_IDS: prod_999";
  const result = checkRecommendationIntegrity(content, new Set(["prod_123"]));
  assertEquals(result.needsRealSearch, true);
});

Deno.test("checkRecommendationIntegrity flags an invented bulleted list of generic gift ideas with no RECOMMENDED_IDS (reproduces the live audit bug)", () => {
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
  const result = checkRecommendationIntegrity(content, new Set());
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, true);
});

Deno.test("checkRecommendationIntegrity leaves ordinary conversational replies alone", () => {
  const result = checkRecommendationIntegrity("What's your budget for this gift?", new Set());
  assertEquals(result.missingMarker, false);
  assertEquals(result.needsRealSearch, false);
});
