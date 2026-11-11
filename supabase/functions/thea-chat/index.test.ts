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
  giftStage,
  looksLikeConfirmation,
  matchNamedRecommendedProduct,
  nextOccasionDate,
  normalizeInterests,
  resolvePresentUi,
  looksLikeCalendarConnectIntent,
  shouldForceCalendarConnectUi,
  buildCalendarConnectDirectiveMessage,
  looksLikeRecipientStatusIntent,
  shouldForceRecipientStatusUi,
  looksLikePaymentIntent,
  shouldForceWalletTopUpUi,
  buildWalletTopUpDirectiveMessage,
  isSwappableExistingGift,
  giftOrderTiming,
  decidePlaceBy,
  timingForStoredGift,
  resolveShippingLeadDays,
  shippingLeadDaysFromProduct,
  looksLikeOrderNowIntent,
  buildOrderNowDirectiveMessage,
  systemPromptIncludesReservedOrderRules,
  systemPromptIncludesPlaceDateAsk,
  looksLikePlaceDateChange,
  handleSetPlaceDate,
  RESERVED_ORDER_RULES,
  decideReservedOrder,
  buildRecipientStatusEntries,
  buildAccountRosterFromRows,
  formatAccountRosterSection,
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

Deno.test("giftStage follows a gift from approval to delivery", () => {
  const gift = { status: "approved", payment_status: "unpaid", wallet_reserved: false, goody_order_id: null };
  assertEquals(giftStage(gift), "scheduled");
  assertEquals(giftStage({ ...gift, wallet_reserved: true }), "funded");
  assertEquals(giftStage({ ...gift, status: "confirmed", payment_status: "paid" }), "funded");
  assertEquals(giftStage({ ...gift, status: "ordered", goody_order_id: "g1" }), "ordered");
  assertEquals(giftStage({ ...gift, status: "shipped", goody_order_id: "g1" }), "in_transit");
  assertEquals(giftStage({ ...gift, status: "delivered", goody_order_id: "g1" }), "delivered");
});

Deno.test("looksLikeCalendarConnectIntent catches connect / import asks", () => {
  assert(looksLikeCalendarConnectIntent("can i connect my calendar and add more"));
  assert(looksLikeCalendarConnectIntent("sync Google Calendar"));
  assert(looksLikeCalendarConnectIntent("import birthdays from google"));
  assert(looksLikeCalendarConnectIntent("reconnect my calendar"));
  assertEquals(looksLikeCalendarConnectIntent("what's a good gift for mom?"), false);
});

Deno.test("looksLikeCalendarConnectIntent ignores count/list questions about the calendar", () => {
  assertEquals(looksLikeCalendarConnectIntent("how many ppl are in my calendar"), false);
  assertEquals(looksLikeCalendarConnectIntent("how many people are in my calendar"), false);
  assertEquals(looksLikeCalendarConnectIntent("who's on my calendar"), false);
  assertEquals(looksLikeCalendarConnectIntent("who is in my calendar"), false);
  assertEquals(looksLikeCalendarConnectIntent("what people are on my calendar"), false);
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
  assertEquals(shouldForceCalendarConnectUi("how many ppl are in my calendar", [], "", []), false);
});

Deno.test("buildCalendarConnectDirectiveMessage is present only when forced", () => {
  assertEquals(buildCalendarConnectDirectiveMessage(false), null);
  assert(buildCalendarConnectDirectiveMessage(true)?.includes('present_ui'));
});

Deno.test("formatAccountRosterSection lists saved people and connected calendar guidance", () => {
  const roster = buildAccountRosterFromRows(
    [
      { name: "Aunty Andrea", birthday: "1960-05-01", notes: "Imported from Google Calendar" },
      { name: "Jordan", anniversary: "2019-06-12", notes: null },
    ],
    true,
  );
  const section = formatAccountRosterSection(roster);
  assert(section?.includes("Saved people (2)"));
  assert(section?.includes("Aunty Andrea"));
  assert(section?.includes("from calendar"));
  assert(section?.includes("Google Calendar is connected"));
  assert(section?.includes("do not open calendar_connect"));
});

Deno.test("account roster orders by next occurrence across the new year", () => {
  const dec15 = new Date(2026, 11, 15);
  const roster = buildAccountRosterFromRows(
    [
      { name: "March", birthday: "1990-03-01" },
      { name: "January", birthday: "1985-01-04" },
      { name: "December", birthday: "1970-12-20" },
      { name: "No date" },
    ],
    true,
    dec15,
  );
  assertEquals(roster.people.map((p) => p.name), ["December", "January", "March", "No date"]);
  assertEquals(roster.people.map((p) => p.daysAway), [5, 20, 76, null]);
  assert(roster.people[1].occasion?.includes("2027-01-04"));
  assert(formatAccountRosterSection(roster)?.includes("2 of them have an occasion in the next 30 days"));
});

Deno.test("formatAccountRosterSection notes when calendar is disconnected", () => {
  const section = formatAccountRosterSection(buildAccountRosterFromRows([], false));
  assert(section?.includes("Saved people: none yet"));
  assert(section?.includes("not connected"));
});

Deno.test("looksLikeRecipientStatusIntent catches who's-scheduled / readiness asks", () => {
  assert(looksLikeRecipientStatusIntent("yeah who has stuff scheduled and who doesnt"));
  assert(looksLikeRecipientStatusIntent("who has a gift scheduled?"));
  assert(looksLikeRecipientStatusIntent("who's missing an address"));
  assert(looksLikeRecipientStatusIntent("people status overview"));
  assertEquals(looksLikeRecipientStatusIntent("what's a good gift for mom?"), false);
  assertEquals(looksLikeRecipientStatusIntent("how many people are in my calendar"), false);
});

Deno.test("shouldForceRecipientStatusUi forces once, then skips when cards already present", () => {
  assert(shouldForceRecipientStatusUi("who has stuff scheduled", []));
  assertEquals(
    shouldForceRecipientStatusUi("who has stuff scheduled", [{ module: "recipient_status", recipients: [] }]),
    false,
  );
});

Deno.test("looksLikePaymentIntent catches unpaid / funding asks", () => {
  assert(looksLikePaymentIntent("did we pay for ulan"));
  assert(looksLikePaymentIntent("have we paid for Aunty Ulan?"));
  assert(looksLikePaymentIntent("finish payment"));
  assert(looksLikePaymentIntent("add funds for her gift"));
  assert(looksLikePaymentIntent("is the gift unpaid?"));
  assertEquals(looksLikePaymentIntent("who needs an address"), false);
  assertEquals(looksLikePaymentIntent("what's a good gift for mom?"), false);
});

Deno.test("shouldForceWalletTopUpUi forces once, then skips when card already present", () => {
  assert(shouldForceWalletTopUpUi("did we pay for ulan", []));
  assertEquals(
    shouldForceWalletTopUpUi("did we pay for ulan", [{
      module: "wallet_topup",
      scheduledGiftId: "g1",
      recipientName: "Aunty Ulan",
      giftTitle: "Coffee Beans",
      needed: 40,
      available: 0,
    }]),
    false,
  );
  assert(buildWalletTopUpDirectiveMessage(true)?.includes("wallet_topup"));
  assertEquals(buildWalletTopUpDirectiveMessage(false), null);
});

Deno.test("isSwappableExistingGift allows replacing a different pre-order gift", () => {
  const coffee = { status: "approved", goody_order_id: null, gift_variant_id: "prod_coffee" };
  assert(isSwappableExistingGift(coffee, "prod_chocolate"));
  assertEquals(isSwappableExistingGift(coffee, "prod_coffee"), false);
  assertEquals(isSwappableExistingGift({ ...coffee, goody_order_id: "goody_1" }, "prod_chocolate"), false);
  assertEquals(isSwappableExistingGift({ ...coffee, status: "ordered" }, "prod_chocolate"), false);
  assertEquals(isSwappableExistingGift({ ...coffee, status: "cancelled" }, "prod_chocolate"), false);
});

Deno.test("giftOrderTiming places the order from occasion minus shipping lead minus buffer", () => {
  // Default lead 21 + arrival buffer 3 = 24 days before the occasion.
  const timing = giftOrderTiming("2026-12-02", { today: "2026-10-01" });
  assertEquals(timing?.placeOrderOn, "2026-11-08");
  assertEquals(timing?.idealPlaceOrderOn, "2026-11-08");
  assertEquals(timing?.deliveryBy, "2026-11-29");
  assertEquals(timing?.shippingLeadDays, 21);
  assertEquals(timing?.placeOrderASAP, false);
  assertEquals(timing?.feasible, true);
  assert(timing?.shippingEstimate.includes("2–3 weeks"));
});

Deno.test("giftOrderTiming clamps past place dates to today and marks tight windows infeasible", () => {
  // Mid-November for a Dec 2 birthday: ideal place (Nov 8) is past; 21-day ship can't hit Nov 29.
  const timing = giftOrderTiming("2026-12-02", { today: "2026-11-11" });
  assertEquals(timing?.placeOrderOn, "2026-11-11");
  assertEquals(timing?.idealPlaceOrderOn, "2026-11-08");
  assertEquals(timing?.deliveryBy, "2026-11-29");
  assertEquals(timing?.placeOrderASAP, true);
  assertEquals(timing?.feasible, false);
  // Never invent day-before-occasion (Dec 1) when shipping takes weeks.
  assert(timing?.placeOrderOn !== "2026-12-01");
});

Deno.test("giftOrderTiming uses per-gift shipping lead when provided", () => {
  const timing = giftOrderTiming("2026-12-02", { shippingLeadDays: 7, today: "2026-10-01" });
  assertEquals(timing?.shippingLeadDays, 7);
  assertEquals(timing?.placeOrderOn, "2026-11-22");
  assertEquals(timing?.deliveryBy, "2026-11-29");
  assertEquals(timing?.feasible, true);
  assert(timing?.shippingEstimate.includes("1 week"));
});

Deno.test("resolveShippingLeadDays and shippingLeadDaysFromProduct fall back sensibly", () => {
  assertEquals(resolveShippingLeadDays(undefined), 21);
  assertEquals(resolveShippingLeadDays(null), 21);
  assertEquals(resolveShippingLeadDays(0), 21);
  assertEquals(resolveShippingLeadDays(10.2), 11);
  assertEquals(shippingLeadDaysFromProduct(null), undefined);
  assertEquals(shippingLeadDaysFromProduct({ shipping_lead_days: 14 }), 14);
  assertEquals(shippingLeadDaysFromProduct({ estimated_delivery_days: 5 }), 5);
});

Deno.test("default confirm stores the computed place-by for that gift's shipping lead", () => {
  assert(systemPromptIncludesPlaceDateAsk());
  const decision = decidePlaceBy({ occasionDate: "2026-12-02", today: "2026-10-01" });
  assert(decision.ok);
  if (!decision.ok) return;
  assertEquals(decision.saved, true);
  assertEquals(decision.usedOverride, false);
  assertEquals(decision.placeByDate, "2026-11-08");
  assertEquals(decision.shippingLeadDays, 21);
  assertEquals(decision.timing.placeOrderOn, "2026-11-08");
  assertEquals(decision.timing.expectedArrival, "2026-11-29");
  assert(decision.confirmationCopy.includes("about 21 days"));
  assert(decision.confirmationCopy.includes("November 8, 2026"));
  assert(decision.confirmationCopy.includes("Does that work?"));

  const faster = decidePlaceBy({ occasionDate: "2026-12-02", shippingLeadDays: 7, today: "2026-10-01" });
  assert(faster.ok);
  if (!faster.ok) return;
  assertEquals(faster.placeByDate, "2026-11-22");
  assertEquals(faster.timing.shippingLeadDays, 7);
});

Deno.test("a user place-date override is saved and a too-late one is not", () => {
  const today = "2026-11-11";
  const saved = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 7,
    requestedPlaceOn: "place it on Nov 15",
    today,
  });
  assert(saved.ok);
  if (!saved.ok) return;
  assertEquals(saved.saved, true);
  assertEquals(saved.feasible, true);
  assertEquals(saved.placeByDate, "2026-11-15");
  assertEquals(saved.timing.placeOrderOn, "2026-11-15");
  assertEquals(saved.timing.expectedArrival, "2026-11-22");
  assertEquals(saved.shippingLeadDays, 7);
  assert(saved.confirmationCopy.includes("about 7 days"));
  assert(saved.confirmationCopy.includes("November 15, 2026"));
  assert(saved.confirmationCopy.includes("November 22, 2026"));

  const sooner = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 7,
    requestedPlaceOn: "place it sooner",
    today,
  });
  assert(sooner.ok);
  if (!sooner.ok) return;
  assertEquals(sooner.placeByDate, "2026-11-11");
  assertEquals(sooner.feasible, true);

  const nextWeek = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 7,
    requestedPlaceOn: "wait until next week",
    today,
  });
  assert(nextWeek.ok);
  if (!nextWeek.ok) return;
  assertEquals(nextWeek.placeByDate, "2026-11-18");

  const the20th = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 7,
    requestedPlaceOn: "place it on the 20th instead",
    today,
  });
  assert(the20th.ok);
  if (!the20th.ok) return;
  assertEquals(the20th.placeByDate, "2026-11-20");
  assertEquals(the20th.timing.expectedArrival, "2026-11-27");

  const late = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 21,
    requestedPlaceOn: "place it on Nov 20",
    today,
  });
  assert(late.ok);
  if (!late.ok) return;
  assertEquals(late.saved, false);
  assertEquals(late.feasible, false);
  assertEquals(late.tooLate, true);
  assertEquals(late.placeByDate, null);
  assertEquals(late.timing.placeOrderOn, "2026-11-20");
  assertEquals(late.timing.expectedArrival, "2026-12-11");
  assert(late.confirmationCopy.toLowerCase().includes("didn't change"));
  assertEquals(late.options, ["place_asap", "pick_earlier_date", "accept_late_arrival"]);

  const accepted = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 21,
    requestedPlaceOn: "Nov 20",
    acceptLate: true,
    today,
  });
  assert(accepted.ok);
  if (!accepted.ok) return;
  assertEquals(accepted.saved, true);
  assertEquals(accepted.feasible, false);
  assertEquals(accepted.placeByDate, "2026-11-20");

  const past = decidePlaceBy({
    occasionDate: "2026-12-02",
    shippingLeadDays: 7,
    requestedPlaceOn: "Nov 1",
    today,
  });
  assertEquals(past.ok, false);

  const stored = timingForStoredGift("2026-12-02", {
    shippingLeadDays: 7,
    placeByDate: "2026-11-15",
    today,
  });
  assertEquals(stored?.placeOrderOn, "2026-11-15");
  assertEquals(stored?.expectedArrival, "2026-11-22");
  assertEquals(stored?.shippingLeadDays, 7);

  assert(looksLikePlaceDateChange("place it on Nov 15"));
  assert(looksLikePlaceDateChange("place it sooner"));
  assert(looksLikePlaceDateChange("wait until next week"));
  assert(looksLikePlaceDateChange("place it on the 20th instead"));
  assertEquals(looksLikePlaceDateChange("yes"), false);
  assertEquals(looksLikePlaceDateChange("please order it now"), false);
});

Deno.test("set_place_date writes the override and refuses a date that cannot arrive in time", async () => {
  const rows = [{
    id: "gift_coffee",
    user_id: "user_1",
    recipient_id: "rec_aunty",
    occasion_date: "2026-12-02",
    status: "confirmed",
    goody_order_id: null,
    shipping_lead_days: 7,
    place_by_date: "2026-11-22",
    gift_type: "Coffee O'Clock",
  }];
  const updates: Array<{ row: Record<string, unknown>; filters: Record<string, unknown> }> = [];
  const client = {
    from() {
      const filters: Record<string, unknown> = {};
      const builder = {
        select() { return builder; },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return builder;
        },
        order() { return builder; },
        limit() { return builder; },
        update(row: Record<string, unknown>) {
          const updateFilters: Record<string, unknown> = {};
          const updater = {
            eq(col: string, val: unknown) {
              updateFilters[col] = val;
              return updater;
            },
            then(resolve: (value: { error: null }) => unknown) {
              updates.push({ row, filters: { ...updateFilters } });
              return Promise.resolve({ error: null }).then(resolve);
            },
          };
          return updater;
        },
        then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
          const matched = rows.filter((row) => Object.entries(filters).every(([col, val]) => row[col as keyof typeof row] === val));
          return Promise.resolve({ data: matched, error: null }).then(resolve);
        },
      };
      return builder;
    },
  };

  const saved = await handleSetPlaceDate(client as never, "user_1", {
    recipientId: "rec_aunty",
    placeOn: "place it on Nov 15",
  }, { today: "2026-11-11" });
  assertEquals(saved.ok, true);
  assertEquals(saved.saved, true);
  assertEquals((saved.timing as { placeOrderOn: string }).placeOrderOn, "2026-11-15");
  assertEquals((saved.timing as { expectedArrival: string }).expectedArrival, "2026-11-22");
  assertEquals((saved.timing as { shippingLeadDays: number }).shippingLeadDays, 7);
  assertEquals(saved.feasible, true);
  assertEquals(updates.length, 1);
  assertEquals(updates[0].row.place_by_date, "2026-11-15");
  assertEquals(updates[0].row.shipping_lead_days, 7);
  assertEquals(updates[0].filters.id, "gift_coffee");

  const late = await handleSetPlaceDate(client as never, "user_1", {
    scheduledGiftId: "gift_coffee",
    placeOn: "Nov 28",
  }, { today: "2026-11-11" });
  assertEquals(late.ok, true);
  assertEquals(late.saved, false);
  assertEquals(late.feasible, false);
  assertEquals(late.tooLate, true);
  assertEquals(updates.length, 1);
  assert(String(late.confirmationCopy).includes("about 7 days"));
  assert(String(late.confirmationCopy).includes("November 28, 2026"));
});

Deno.test("buildRecipientStatusEntries maps gift/address/preferences checks", () => {
  const giftTitles = new Map([["rec_1", "Coffee Beans by Methodical Coffee"]]);
  const entries = buildRecipientStatusEntries(
    [
      {
        id: "rec_1",
        name: "Aunty Ulan",
        relationship: null,
        birthday: null,
        anniversary: null,
        interests: ["coffee"],
        street: "1 Main",
        apartment: null,
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        country: "United States",
      },
      {
        id: "rec_2",
        name: "Brianna Friedman",
        relationship: null,
        birthday: null,
        anniversary: null,
        interests: [],
        street: null,
        apartment: null,
        city: null,
        state: null,
        zip_code: null,
        country: null,
      },
    ],
    giftTitles,
  );
  assertEquals(entries[0], {
    recipientId: "rec_1",
    recipientName: "Aunty Ulan",
    giftScheduled: true,
    giftTitle: "Coffee Beans by Methodical Coffee",
    hasAddress: true,
    hasPreferences: true,
  });
  assertEquals(entries[1].giftScheduled, false);
  assertEquals(entries[1].hasAddress, false);
  assertEquals(entries[1].hasPreferences, false);
});

Deno.test("a fully reserved gift never gets top-up wording, and a short hold states the exact difference", () => {
  assert(systemPromptIncludesReservedOrderRules());
  assert(/never request a top-up/i.test(RESERVED_ORDER_RULES));
  assert(RESERVED_ORDER_RULES.includes("place_order_now"));
  assert(!/place immediately/.test(RESERVED_ORDER_RULES));

  const covered = decideReservedOrder({
    owned: true,
    hasAddress: true,
    alreadyOrdered: false,
    recipientName: "Alex",
    productPrice: 40,
    pendingReserved: 47,
    paymentStatus: "unpaid",
  });
  assertEquals(covered.action, "place");
  if (covered.action !== "place") return;
  assert(!/top-?up/i.test(covered.confirmationCopy));
  assert(!/add funds/i.test(covered.confirmationCopy));
  assert(/nothing new will be charged/i.test(covered.confirmationCopy));
  assert(covered.confirmationCopy.includes("$47"));

  const short = decideReservedOrder({
    owned: true,
    hasAddress: true,
    alreadyOrdered: false,
    recipientName: "Alex",
    productPrice: 50,
    pendingReserved: 47,
    paymentStatus: "unpaid",
  });
  assertEquals(short.action, "shortfall");
  if (short.action !== "shortfall") return;
  assertEquals(short.shortfall, 10);
  assert(short.confirmationCopy.includes("$10"));
  assert(!/top-?up/i.test(short.confirmationCopy));

  assert(looksLikeOrderNowIntent("please order it now, shipping takes weeks"));
  assertEquals(shouldForceWalletTopUpUi("please order it now", []), false);
  const directive = buildOrderNowDirectiveMessage(true) || "";
  assert(directive.includes("place_order_now"));
  assert(/do not ask for a top-up/i.test(directive));
});
