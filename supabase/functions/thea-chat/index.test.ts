// Regression tests for the CC-02 cross-turn context fix and the pure
// catalog-matching helpers. Run with:
//   deno test --allow-env --allow-read supabase/functions/thea-chat/index.test.ts
// (index.ts guards its Deno.serve call behind `import.meta.main` so this
// import doesn't start a live HTTP listener - see the comment there.)
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  pickPendingReviewMarker,
  affirmedSingleOffer,
  pickCardProducts,
  searchGoodyGifts,
  looksLikeMoreOptionsIntent,
  wantsPetGifts,
  isPetProductText,
  restoreHistoryMessage,
  toDisplayProduct,
  buildConfirmDirectiveMessage,
  buildDirectSelectionMessage,
  buildTappedSelectionMessage,
  buildTurnContextMessage,
  checkRecommendationIntegrity,
  needsFallbackDisclosure,
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
  systemPromptIncludesSwapReservedReuse,
  systemPromptIncludesPlaceDateAsk,
  looksLikePlaceDateChange,
  handleSetPlaceDate,
  handleSelectGift,
  findMentionedRecipient,
  claimsGiftSelected,
  stripProductListFromReply,
  systemPromptIncludesAddressFormRules,
  RESERVED_ORDER_RULES,
  ADDRESS_FORM_RULES,
  decideReservedOrder,
  addressIsOnFile,
  replyClaimsMissingAddress,
  replyAsksToAddAddress,
  looksLikeAddressFormIntent,
  looksLikeAddressFormAgreement,
  shouldDirectAddressForm,
  decideAddressForm,
  stripAddressFormUnlessRequested,
  clearMissingAddressClaim,
  pickRecipientForAddress,
  editRecipientAddressUi,
  guardUnswappableSwapReply,
  replyRefusesSwap,
  swapSuccessCopy,
  reviewReplacesGift,
  markerToPersist,
  replyNamesReviewProduct,
  replyClaimsOnlyOtherGift,
  reviewOfferCopy,
  alignReviewReply,
  alignReviewPresentation,
  unswappableGiftReason,
  buildRecipientStatusEntries,
  buildAccountRosterFromRows,
  formatAccountRosterSection,
  scoreInterestText,
  shouldPersistReviewMarker,
  scrubFalseFriends,
  systemPromptIncludesWalletBalanceRules,
  WALLET_BALANCE_RULES,
  systemPromptIncludesWalletShortfallHeadsUp,
  needsConversationSummary,
  splitForSummary,
  needsWalletShortfallDisclosure,
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

Deno.test("scoreInterestText stays strict by default: a multi-word interest with no dictionary entry only matches the exact phrase, not its individual words (this is the deliberate 'curated, not padded' behavior - broadening only happens as an explicit second pass when the strict search finds nothing at all)", () => {
  const strict = scoreInterestText("Wall Hanging Art Print for the living room", ["wall art"]);
  assertEquals(strict, 0);
});

Deno.test("scoreInterestText still matches a multi-word interest by its exact phrase when that's what's in the catalog text", () => {
  const score = scoreInterestText("a framed wall art piece for the hallway", ["wall art"]);
  assert(score > 0);
});

Deno.test("scoreInterestText with broaden=true (the search's zero-result fallback) recovers a genuine catalog hit the exact phrase missed (regression: 'wall art' scored 0 against 'Wall Hanging Art Print' because only the verbatim phrase was tried)", () => {
  const broadened = scoreInterestText("Wall Hanging Art Print for the living room", ["wall art"], undefined, true);
  assert(broadened > 0);
});

Deno.test("scoreInterestText with broaden=true does not match a multi-word interest's short words inside unrelated longer words", () => {
  const score = scoreInterestText("a leather wallet for everyday carry", ["wall art"], undefined, true);
  assertEquals(score, 0);
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

Deno.test("needsFallbackDisclosure flags a reply recommending a fallback-sourced product with no disclosure marker (reproduces the live bug: 'Here are some gifts for men' presented fallback-only results, none of them gendered, as if they were a real match)", () => {
  const flagged = needsFallbackDisclosure(
    "Here are some gifts for men in the $25 to $50 range:\nRECOMMENDED_IDS: [prod_tote]",
    ["prod_tote"],
    new Set(["prod_tote"]),
  );
  assertEquals(flagged, true);
});

Deno.test("needsFallbackDisclosure passes once the reply includes the FALLBACK_DISCLOSED marker", () => {
  const flagged = needsFallbackDisclosure(
    "Nothing specifically for men right now, but here's what's live in that range:\nFALLBACK_DISCLOSED: true\nRECOMMENDED_IDS: [prod_tote]",
    ["prod_tote"],
    new Set(["prod_tote"]),
  );
  assertEquals(flagged, false);
});

Deno.test("needsFallbackDisclosure does not fire when the recommended products are all genuine matches, even if some other product this turn was a fallback result", () => {
  const flagged = needsFallbackDisclosure(
    "The Large Book Vase is a lovely cozy pick.\nRECOMMENDED_IDS: [prod_vase]",
    ["prod_vase"],
    new Set(["prod_tote"]),
  );
  assertEquals(flagged, false);
});

Deno.test("needsFallbackDisclosure does not fire when nothing was recommended from a fallback search this turn", () => {
  const flagged = needsFallbackDisclosure("What's your budget for this gift?", [], new Set());
  assertEquals(flagged, false);
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

Deno.test("resolvePresentUi accepts suggest_add_recipient with a name and trims it", () => {
  assertEquals(resolvePresentUi({ module: "suggest_add_recipient", name: "  Jordan  " }, null), {
    ok: true,
    ui: { module: "suggest_add_recipient", name: "Jordan" },
  });
});

Deno.test("resolvePresentUi rejects suggest_add_recipient with a missing or empty name", () => {
  assertEquals(resolvePresentUi({ module: "suggest_add_recipient" }, null).ok, false);
  assertEquals(resolvePresentUi({ module: "suggest_add_recipient", name: "   " }, null).ok, false);
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

Deno.test("a confirmed unpaid gift with no order can be swapped, and an ordered gift cannot", () => {
  const coffee = {
    status: "confirmed",
    goody_order_id: null,
    gift_variant_id: "prod_coffee",
    payment_status: "unpaid",
    wallet_reserved: true,
  };
  assert(isSwappableExistingGift(coffee, "prod_wine"));
  assertEquals(unswappableGiftReason(coffee, "prod_wine"), null);
  assertEquals(isSwappableExistingGift({ ...coffee, status: "approved" }, "prod_wine"), true);
  assertEquals(isSwappableExistingGift({ ...coffee, status: "ordered" }, "prod_wine"), false);
  assertEquals(isSwappableExistingGift({ ...coffee, status: "shipped" }, "prod_wine"), false);
  assertEquals(isSwappableExistingGift({ ...coffee, status: "delivered" }, "prod_wine"), false);
  assertEquals(isSwappableExistingGift({ ...coffee, goody_order_id: "goody_1" }, "prod_wine"), false);
  assertEquals(unswappableGiftReason({ ...coffee, status: "ordered", goody_order_id: "goody_1" }, "prod_wine"), "ordered");
  assertEquals(unswappableGiftReason({ ...coffee, status: "confirmed", gift_variant_id: "prod_wine" }, "prod_wine"), "same_gift");

  const offer = "Aunty already has Coffee O'Clock scheduled. Want to swap to the Layla Red Wine Glasses?";
  assertEquals(
    guardUnswappableSwapReply(offer, "already_ordered", "Coffee O'Clock"),
    "Coffee O'Clock is already ordered, so it can't be swapped.",
  );
  assertEquals(guardUnswappableSwapReply(offer, null, "Coffee O'Clock"), offer);
  assert(replyRefusesSwap("It can't be swapped for the Layla Red Wine Glasses."));
  assertEquals(swapSuccessCopy({
    replaced: "Coffee O'Clock",
    gift: "Layla Red Wine Glasses, Set of 4",
    recipientName: "Aunty",
    heldAmount: 41,
  }), "Done. Coffee O'Clock is now Layla Red Wine Glasses, Set of 4 for Aunty. $41 is now held for it.");
});

Deno.test("a swap review marker is persisted so yes can confirm, even without GIFT_REVIEW in the reply", () => {
  const marker = "rec_aunty:prod_wine:2026-12-02";
  const swapReview = { replacesGiftTitle: "Coffee O'Clock", productTitle: "Layla Red Wine Glasses" };
  assert(reviewReplacesGift(swapReview));
  assertEquals(markerToPersist(marker, "Want me to swap Coffee O'Clock for the wine glasses?", [], swapReview), marker);
  // Aligned bubble that names the gift also persists (non-swap).
  assertEquals(
    markerToPersist(marker, "I'll schedule the Layla Red Wine Glasses for Aunty. Confirm?", [], {
      productTitle: "Layla Red Wine Glasses",
    }),
    marker,
  );
  assertEquals(markerToPersist(marker, "Want me to schedule something nice?", [], { productTitle: "Layla Red Wine Glasses" }), null);
  assertEquals(markerToPersist(marker, "GIFT_REVIEW: rec_aunty:prod_wine:2026-12-02", [], { productTitle: "Layla" }), marker);
});

Deno.test("alignReviewPresentation rewrites cookie-only copy when the swap card is wine glasses", () => {
  const swapReview = {
    productId: "prod_wine",
    productTitle: "Layla Red Wine Glasses",
    recipientName: "Aunty Ulan",
    replacesGiftTitle: "Coffee O'Clock",
    price: 34,
  };
  const cookieOnly =
    "For a sweet option, only the Gluten-Free Cookie 4-Pack is available right now under budget.";
  assert(replyClaimsOnlyOtherGift(cookieOnly, swapReview.productTitle));
  assertEquals(replyNamesReviewProduct(cookieOnly, swapReview.productTitle), false);

  const aligned = alignReviewPresentation(cookieOnly, swapReview, [
    { id: "prod_cookie", title: "Gluten-Free Cookie 4-Pack" },
  ]);
  assert(aligned.review);
  assertEquals(aligned.products, []);
  assert(replyNamesReviewProduct(aligned.reply, "Layla Red Wine Glasses"));
  assertEquals(replyClaimsOnlyOtherGift(aligned.reply, "Layla Red Wine Glasses"), false);
  assert(aligned.reply.includes("Coffee O'Clock"));
  assert(aligned.reply.includes("Confirm?"));
});

Deno.test("alignReviewPresentation drops a non-swap review when the bubble pitches other catalog cards", () => {
  const review = {
    productId: "prod_wine",
    productTitle: "Layla Red Wine Glasses",
    recipientName: "Aunty",
    price: 34,
  };
  const pitch = "Here are a couple of sweet picks under $40.";
  const products = [{ id: "prod_cookie", title: "Gluten-Free Cookie 4-Pack" }];
  const aligned = alignReviewPresentation(pitch, review, products);
  assertEquals(aligned.review, null);
  assertEquals(aligned.products, products);
  assertEquals(aligned.reply, pitch);
});

Deno.test("alignReviewReply keeps a bubble that already names the reviewed gift", () => {
  const review = {
    productTitle: "Layla Red Wine Glasses",
    recipientName: "Aunty",
    replacesGiftTitle: "Coffee O'Clock",
  };
  const ok = "I'll swap Coffee O'Clock for the Layla Red Wine Glasses for Aunty. Confirm?";
  assertEquals(alignReviewReply(ok, review), ok);
  assertEquals(
    reviewOfferCopy({ ...review, price: 34 }),
    "I'll swap Coffee O'Clock for the Layla Red Wine Glasses ($34) for Aunty. Confirm?",
  );
  // The price shown is the gift plus the Unwrapt service fee when the review carries it.
  assertEquals(
    reviewOfferCopy({ ...review, price: 15, giftWithFee: 22 }),
    "I'll swap Coffee O'Clock for the Layla Red Wine Glasses ($22) for Aunty. Confirm?",
  );
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

Deno.test("swap funding copy tells Thea to move the prior hold and only ask for the delta", () => {
  assert(systemPromptIncludesSwapReservedReuse());
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
  assert(/never say the address is missing/i.test(directive));
});

Deno.test("a plain wallet-balance question is routed to get_wallet_status, not left unanswerable (reproduces the live bug: 'what's my wallet balance?' got 'I can't check your wallet balance directly' with no path to a real answer)", () => {
  assert(systemPromptIncludesWalletBalanceRules());
  assert(WALLET_BALANCE_RULES.includes("get_wallet_status"));
  assert(/don.t call get_wallet_status for those/i.test(WALLET_BALANCE_RULES));
  // Distinguishing wallet vs. stripe_checkout gifts: a Stripe-scheduled gift (scheduled
  // outside chat) must never be offered a wallet top-up, and its cost must come from
  // giftCost rather than Thea claiming she can't find it (the live Jake's-gift bug).
  assert(WALLET_BALANCE_RULES.includes("giftCost"));
  assert(WALLET_BALANCE_RULES.includes("paymentMethod"));
  assert(/never offer wallet_topup/i.test(WALLET_BALANCE_RULES));
  assert(/instead of saying you can.t find it/i.test(WALLET_BALANCE_RULES));
});

Deno.test("select_gift's review warns about a wallet shortfall up front as a courtesy, without blocking confirmation", () => {
  assert(systemPromptIncludesWalletShortfallHeadsUp());
});

Deno.test("needsWalletShortfallDisclosure (reproduces the live bug: a real $27 shortfall in the review result was silently dropped from the visible reply with no marker required to catch it)", () => {
  // No shortfall at all - nothing to disclose, regardless of marker.
  assertEquals(needsWalletShortfallDisclosure("Let's confirm that gift!", 0), false);
  assertEquals(needsWalletShortfallDisclosure("Let's confirm that gift!", null), false);
  assertEquals(needsWalletShortfallDisclosure("Let's confirm that gift!", undefined), false);
  // A real shortfall, but the reply never said so and has no marker - must retry.
  assertEquals(needsWalletShortfallDisclosure("Let's confirm that gift! Expected delivery is about 5 days.", 27), true);
  // A real shortfall, properly disclosed with the marker - passes.
  assertEquals(
    needsWalletShortfallDisclosure("You've got $0 available, so you'd be $27 short.\nWALLET_SHORTFALL_NOTED: true", 27),
    false,
  );
});

function mockMultiTableClient(tables: Record<string, Array<Record<string, unknown>>>) {
  const tableBuilder = (rows: Array<Record<string, unknown>>) => {
    const filters: Record<string, unknown> = {};
    const matches = () => rows.filter((row) => Object.entries(filters).every(([col, val]) => row[col] === val));
    const builder = {
      select() { return builder; },
      eq(col: string, val: unknown) { filters[col] = val; return builder; },
      order() { return builder; },
      limit() { return builder; },
      maybeSingle() { return Promise.resolve({ data: matches()[0] ?? null, error: null }); },
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        return Promise.resolve({ data: matches(), error: null }).then(resolve);
      },
    };
    return builder;
  };
  return {
    from(table: string) {
      if (!(table in tables)) throw new Error(`mockMultiTableClient: no rows configured for table "${table}"`);
      return tableBuilder(tables[table]);
    },
  };
}

Deno.test("select_gift's review reports a real wallet shortfall before any hold is attempted (no existing gift, no pending holds)", async () => {
  const client = mockMultiTableClient({
    recipients: [{
      id: "rec_aunty", user_id: "user_1", name: "Aunty", birthday: "2026-11-29", anniversary: null,
      interests: [], street: "1 Main St", city: "Austin", state: "TX", zip_code: "78701", country: "US",
    }],
    scheduled_gifts: [],
    profiles: [{ id: "user_1", gift_wallet_balance: 10 }],
    wallet_transactions: [],
  });
  const fallbackProduct = {
    id: "prod_mug", title: "Grateful Mug", description: null, price: 25, currency: "USD",
    featured_image_url: null, product_type: null, gift_vibe: null, provider: "goody" as const,
  };

  const result = await handleSelectGift(client as never, "user_1", {
    recipientId: "rec_aunty",
    productId: "prod_mug",
    occasionDate: "2026-11-29",
  }, fallbackProduct);

  assertEquals(result.ok, true);
  if (!result.ok) return;
  const review = result.review as Record<string, unknown>;
  assertEquals(review.walletAvailable, 10);
  // $25 price + $7 service fee - $10 available = $22 shortfall.
  assertEquals(review.walletShortfall, 22);
});

Deno.test("select_gift's review reports zero shortfall when the wallet already covers the gift", async () => {
  const client = mockMultiTableClient({
    recipients: [{
      id: "rec_aunty", user_id: "user_1", name: "Aunty", birthday: "2026-11-29", anniversary: null,
      interests: [], street: "1 Main St", city: "Austin", state: "TX", zip_code: "78701", country: "US",
    }],
    scheduled_gifts: [],
    profiles: [{ id: "user_1", gift_wallet_balance: 100 }],
    wallet_transactions: [],
  });
  const fallbackProduct = {
    id: "prod_mug", title: "Grateful Mug", description: null, price: 25, currency: "USD",
    featured_image_url: null, product_type: null, gift_vibe: null, provider: "goody" as const,
  };

  const result = await handleSelectGift(client as never, "user_1", {
    recipientId: "rec_aunty",
    productId: "prod_mug",
    occasionDate: "2026-11-29",
  }, fallbackProduct);

  assertEquals(result.ok, true);
  if (!result.ok) return;
  const review = result.review as Record<string, unknown>;
  assertEquals(review.walletAvailable, 100);
  assertEquals(review.walletShortfall, 0);
});

const withGoodyQuote = async (
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) => {
  const original = globalThis.fetch;
  const priorKey = Deno.env.get("GOODY_SANDBOX_COMMERCE_API_KEY");
  const priorEnv = Deno.env.get("GOODY_API_ENV");
  Deno.env.set("GOODY_SANDBOX_COMMERCE_API_KEY", "test-key");
  Deno.env.delete("GOODY_API_ENV");
  globalThis.fetch = handler as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
    if (priorKey === undefined) Deno.env.delete("GOODY_SANDBOX_COMMERCE_API_KEY"); else Deno.env.set("GOODY_SANDBOX_COMMERCE_API_KEY", priorKey);
    if (priorEnv !== undefined) Deno.env.set("GOODY_API_ENV", priorEnv);
  }
};

const selectGiftReviewFor = async (recipientAddress: Record<string, unknown>) => {
  const client = mockMultiTableClient({
    recipients: [{
      id: "rec_aunty", user_id: "user_1", name: "Aunty Smith", birthday: "2026-11-29", anniversary: null,
      interests: [], country: "US", ...recipientAddress,
    }],
    scheduled_gifts: [],
    profiles: [{ id: "user_1", gift_wallet_balance: 0 }],
    wallet_transactions: [],
  });
  const fallbackProduct = {
    id: "prod_mug", title: "Grateful Mug", description: null, price: 25, currency: "USD",
    featured_image_url: null, product_type: null, gift_vibe: null, provider: "goody" as const,
  };
  const result = await handleSelectGift(client as never, "user_1", {
    recipientId: "rec_aunty", productId: "prod_mug", occasionDate: "2026-11-29",
  }, fallbackProduct);
  assertEquals(result.ok, true);
  if (!result.ok) throw new Error("unreachable");
  return result.review as Record<string, unknown>;
};

const US_ADDRESS = { street: "1 Main St", city: "Austin", state: "TX", zip_code: "78701" };

Deno.test("select_gift's shortfall includes real Goody shipping + tax when a quote succeeds", async () => {
  await withGoodyQuote(
    (input) => {
      // Only Goody's price endpoint should be hit for the quote; products lookups fall to the fallback.
      if (String(input).includes("/v1/order_batches/price")) {
        return Promise.resolve(new Response(JSON.stringify({
          cart_price: { price_product: 2500, price_shipping: 800, price_processing_fee: 100 },
          total_price: { est_tax_calculated: 272 },
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    },
    async () => {
      const review = await selectGiftReviewFor(US_ADDRESS);
      // $25 + $7 fee + $8 shipping + $2.72 tax - $0 wallet = $42.72 (matches wallet-reserve-funds).
      assertEquals(review.walletShortfall, 42.72);
      assertEquals(review.giftWithFee, 32);
      assertEquals(review.shippingAndTax, 10.72);
    },
  );
});

Deno.test("select_gift's shortfall falls back to the flat math with no address (no Goody call) or when the quote fails", async () => {
  let priceCalls = 0;
  await withGoodyQuote(
    (input) => {
      if (String(input).includes("/v1/order_batches/price")) {
        priceCalls++;
        return Promise.resolve(new Response("boom", { status: 500 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    },
    async () => {
      const noAddress = await selectGiftReviewFor({ street: null, city: null, state: null, zip_code: null });
      assertEquals(noAddress.walletShortfall, 32);
      assertEquals(noAddress.shippingAndTax, 0);
      assertEquals(priceCalls, 0);
      const failedQuote = await selectGiftReviewFor(US_ADDRESS);
      assertEquals(failedQuote.walletShortfall, 32);
      assertEquals(priceCalls, 1);
    },
  );
});

Deno.test("findMentionedRecipient picks the one named person, and nothing when zero or several are named", () => {
  const people = [{ id: "h", name: "Happy!" }, { id: "k", name: "Kora Smith" }, { id: "k2", name: "Kora Jones" }, { id: "a", name: "Aunty" }];
  assertEquals(findMentionedRecipient("Can we pick a gift for aunty instead?", people)?.id, "a");
  assertEquals(findMentionedRecipient("gift for Kora Smith please", people)?.id, "k");
  assertEquals(findMentionedRecipient("gift for Kora", people), null); // ambiguous first name
  assertEquals(findMentionedRecipient("I'd like the Holiday Cookie & Brownie Duo", people), null);
  assertEquals(findMentionedRecipient("what about Happy", people)?.id, "h");
});

Deno.test("a plain 'Price: $N' list with no ids is flagged as needing a real search, and a made-up selection claim is detected", () => {
  const plain = "1. Medium Glass Canister\nPrice: $14\nStylish.\n\n2. Holiday Cookie Duo\nPrice: $15\nSweet.";
  assertEquals(checkRecommendationIntegrity(plain, new Map()).needsRealSearch, true);
  assertEquals(claimsGiftSelected("Great choice! I've selected the Holiday Cookie & Brownie Duo for Kora."), true);
  assertEquals(claimsGiftSelected("I'll schedule the Cookie Duo for Kora. Confirm?"), false);
});

Deno.test("stripProductListFromReply drops the list paragraphs but keeps the intro and the closing question", () => {
  const reply = "Here are some options for Kora.\n\n1. Canister\nPrice: $14\nNice.\n\n2. Cookies\nPrice: $15\nSweet.\n\nDo any catch your eye?";
  assertEquals(stripProductListFromReply(reply), "Here are some options for Kora.\n\nDo any catch your eye?");
  assertEquals(stripProductListFromReply("Just a short reply."), "Just a short reply.");
});

Deno.test("a short conversation is left completely alone (no summarization threshold crossed)", () => {
  const messages = Array.from({ length: 24 }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as const,
    content: `message ${i}`,
  }));
  assertEquals(needsConversationSummary(messages.length), false);
  const { older, recent } = splitForSummary(messages);
  assertEquals(older.length, 0);
  assertEquals(recent, messages);
});

Deno.test("a long conversation keeps the most recent window raw and marks the rest for summarizing, without dropping anything the split doesn't see (reproduces the live bug: a 40-message thread made Thea answer a plain gift selection with a stale, unrelated reply)", () => {
  const messages = Array.from({ length: 40 }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as const,
    content: `message ${i}`,
  }));
  assertEquals(needsConversationSummary(messages.length), true);
  const { older, recent } = splitForSummary(messages);
  assertEquals(older.length + recent.length, messages.length);
  assertEquals(recent.length, 14);
  assertEquals(recent[0].content, "message 26");
  assertEquals(recent[recent.length - 1].content, "message 39");
  assertEquals(older[older.length - 1].content, "message 25");
});

Deno.test("the summarization threshold sits exactly at the boundary (25 triggers, 24 does not)", () => {
  assertEquals(needsConversationSummary(24), false);
  assertEquals(needsConversationSummary(25), true);
});

const AUNTY_ON_FILE = { id: "rec_aunty", name: "Aunty", hasAddress: true, addressConfirmed: true };
const AUNTY_MISSING = { id: "rec_aunty", name: "Aunty", hasAddress: false, addressConfirmed: false };
const MISSING_ADDRESS_REPLY = "I can't place the order until I confirm the address. Aunty's address is still missing. Would you like to add her address so we can proceed?";

Deno.test("hasAddress true does not claim the address is missing and does not force the form", () => {
  assert(systemPromptIncludesAddressFormRules());
  assert(/never say an address is missing/i.test(ADDRESS_FORM_RULES));
  assert(!/don't open another form/i.test(ADDRESS_FORM_RULES));
  assert(/do not tell them to add it on a review card/i.test(ADDRESS_FORM_RULES));
  assert(addressIsOnFile({ hasAddress: true, addressConfirmed: false }));
  assert(addressIsOnFile({ hasAddress: false, addressConfirmed: true }));
  assertEquals(addressIsOnFile({ hasAddress: false, addressConfirmed: false }), false);
  assert(replyClaimsMissingAddress(MISSING_ADDRESS_REPLY));

  const decision = decideAddressForm({
    latestUserMessage: "Please place Aunty's gift",
    recentMessages: [],
    modelReply: MISSING_ADDRESS_REPLY,
    alreadyPresented: [],
    addressFacts: AUNTY_ON_FILE,
    addressRequired: false,
  });
  assertEquals(decision.force, false);
  assertEquals(decision.suppressMissingClaim, true);
  // Stale addressRequired (e.g. Goody mailing_address.country) must not reopen the form.
  const falseRequired = decideAddressForm({
    latestUserMessage: "place it today actually",
    recentMessages: [],
    modelReply: "I've opened the address form for Aunty.",
    alreadyPresented: [{ module: "edit_recipient", focus: "address" }],
    addressFacts: AUNTY_ON_FILE,
    addressRequired: true,
  });
  assertEquals(falseRequired.force, false);
  assertEquals(falseRequired.suppressMissingClaim, true);
  assertEquals(
    stripAddressFormUnlessRequested(
      [{ module: "edit_recipient", recipientId: "rec_aunty", focus: "address" as const }],
      "rec_aunty",
      "place it today actually",
      [],
    ),
    [],
  );
  const confirmedOnly = decideAddressForm({
    latestUserMessage: "Please place Aunty's gift",
    recentMessages: [],
    modelReply: MISSING_ADDRESS_REPLY,
    alreadyPresented: [],
    addressFacts: { hasAddress: false, addressConfirmed: true },
    addressRequired: false,
  });
  assertEquals(confirmedOnly.force, false);
  assertEquals(confirmedOnly.suppressMissingClaim, true);
  const cleared = clearMissingAddressClaim(MISSING_ADDRESS_REPLY, "Aunty");
  assert(!replyClaimsMissingAddress(cleared));
  assert(!replyAsksToAddAddress(cleared));
  assert(cleared.includes("Aunty's address is already on file"));
  assertEquals(editRecipientAddressUi({ ok: true, hasAddress: true, recipientId: "rec_aunty", recipientName: "Aunty" }), null);
});

Deno.test("a missing address or addressRequired presents the address form", () => {
  const missing = decideAddressForm({
    latestUserMessage: "Please place Aunty's gift",
    recentMessages: [],
    modelReply: MISSING_ADDRESS_REPLY,
    alreadyPresented: [],
    addressFacts: AUNTY_MISSING,
    addressRequired: false,
  });
  assertEquals(missing.force, true);
  assertEquals(missing.suppressMissingClaim, false);

  const required = decideAddressForm({
    latestUserMessage: "yes",
    recentMessages: [],
    modelReply: "Aunty needs a delivery address before this can be ordered.",
    alreadyPresented: [],
    addressFacts: AUNTY_MISSING,
    addressRequired: true,
  });
  assertEquals(required.force, true);
  assertEquals(
    editRecipientAddressUi({
      ok: false,
      addressRequired: true,
      recipientId: "rec_aunty",
      recipientName: "Aunty",
    }),
    { module: "edit_recipient", recipientId: "rec_aunty", recipientName: "Aunty", focus: "address" },
  );
  assertEquals(editRecipientAddressUi({ ok: false, error: "nope" }), null);

  assert(looksLikeAddressFormIntent("please add her address"));
  assert(shouldDirectAddressForm("yes", [
    { role: "assistant", content: "Would you like to add her address so we can proceed?" },
  ]));
  assertEquals(looksLikeAddressFormAgreement("yes, swap to the wine glasses"), false);
  const agreed = decideAddressForm({
    latestUserMessage: "yes",
    recentMessages: [{ role: "assistant", content: "Aunty's address is still missing. Want to add her address?" }],
    modelReply: "Great.",
    alreadyPresented: [],
    addressFacts: AUNTY_MISSING,
    addressRequired: false,
  });
  assertEquals(agreed.force, true);

  assertEquals(pickRecipientForAddress([AUNTY_MISSING, { id: "rec_2", name: "Jordan", hasAddress: true, addressConfirmed: false }], ["place it for Aunty"], null)?.id, "rec_aunty");
  assertEquals(
    decideAddressForm({
      latestUserMessage: "who is missing an address",
      recentMessages: [],
      modelReply: "Brianna is missing an address.",
      alreadyPresented: [],
      addressFacts: AUNTY_MISSING,
      addressRequired: false,
    }).force,
    false,
  );
});

Deno.test("restoreHistoryMessage returns stored product cards and the review card for a saved assistant turn", () => {
  const product = toDisplayProduct({ id: "p1", title: "Mug", price: 22, featured_image_url: "https://img/m.png", description: "x".repeat(500) });
  assertEquals(product.description?.length, 240);
  const restored = restoreHistoryMessage({
    role: "assistant",
    content: "Here you go",
    metadata: { display: { products: [product], review: { recipientId: "r1", productId: "p1" } } },
  });
  assertEquals(restored.products?.[0].featured_image_url, "https://img/m.png");
  assertEquals((restored.review as { productId: string }).productId, "p1");
});

Deno.test("restoreHistoryMessage backfills images for turns saved before cards were stored", () => {
  const legacy = {
    role: "assistant",
    content: "Try these",
    metadata: { recommendedProducts: [{ id: "p1", title: "Mug", price: 22 }, { id: "gone", title: "Old", price: 9 }] },
  };
  const withCatalog = restoreHistoryMessage(legacy, new Map([["p1", { image: "https://img/m.png", brand: "Acme" }]]));
  assertEquals(withCatalog.products?.length, 1, "products missing from the catalog are dropped, not faked");
  assertEquals(withCatalog.products?.[0].featured_image_url, "https://img/m.png");
  assertEquals(withCatalog.products?.[0].price, 22);
  // No catalog available -> plain text turn, no cards.
  assertEquals(restoreHistoryMessage(legacy).products, undefined);
});

Deno.test("restoreHistoryMessage never attaches cards to user messages", () => {
  const m = restoreHistoryMessage({ role: "user", content: "hi", metadata: { display: { products: [toDisplayProduct({ id: "p", title: "t", price: 1 })] } } });
  assertEquals(m.products, undefined);
  assertEquals(m.content, "hi");
});

// --- Gift search: pets, repeats, and ranking with no signal -------------------------------------
const CATALOG = [
  { id: "wipes", name: "Facial Cleansing Wipes", price: 500 },
  { id: "treats", name: "Meat Hunks Dog Treats, 10 oz", price: 700 },
  { id: "topper", name: "Dog Food Meal Topper", price: 1000 },
  { id: "canister", name: "Medium Glass Canister", price: 1400 },
  { id: "charcuterie", name: "Charcuterie Trio", price: 1500 },
  { id: "pickleballs", name: "Set of 3 Pickleballs", price: 1500 },
  { id: "cookies", name: "Holiday Cookie & Brownie Duo", price: 1500 },
  { id: "coffee", name: "Coffee Beans by Methodical Coffee", price: 1600 },
  { id: "chewer", name: "Golf Ball Super Chewer + Fetch Dog Toy", price: 2500 },
];

const withCatalog = async (run: () => Promise<void>) => {
  const original = globalThis.fetch;
  Deno.env.set("GOODY_API_ENV", "sandbox");
  Deno.env.set("GOODY_SANDBOX_COMMERCE_API_KEY", "test");
  globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ data: CATALOG }), { status: 200 }))) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
};

Deno.test("pet products are never offered as a gift for a person", async () => {
  await withCatalog(async () => {
    const { products } = await searchGoodyGifts({ max_price: 25 });
    const titles = products.map((p) => p.title);
    assert(!titles.some((t) => /dog/i.test(t)), `dog items leaked: ${titles.join(", ")}`);
    assert(titles.includes("Charcuterie Trio"));
  });
});

Deno.test("pet products come back when the recipient or request is about pets", async () => {
  await withCatalog(async () => {
    assert(wantsPetGifts(["dog toys"]) && wantsPetGifts(null, "gift for my cat") && !wantsPetGifts(["coffee"], "festive"));
    const { products } = await searchGoodyGifts({ interests: ["dog toys"], allowPets: true });
    assert(products.some((p) => /dog toy/i.test(p.title)));
    assert(isPetProductText("Dog Food Meal Topper") && !isPetProductText("Charcuterie Trio"));
  });
});

Deno.test("with no interest signal the budget-fitting best items lead, not the cheapest dregs", async () => {
  await withCatalog(async () => {
    const { products } = await searchGoodyGifts({ max_price: 25 });
    assert(products[0].price >= 15, `expected a higher-priced lead, got ${products[0].title} $${products[0].price}`);
  });
});

Deno.test("'more options' excludes products already shown", async () => {
  await withCatalog(async () => {
    const first = await searchGoodyGifts({ max_price: 25 });
    const shown = first.products.slice(0, 3).map((p) => p.id);
    const more = await searchGoodyGifts({ max_price: 25, excludeIds: shown });
    assert(more.products.every((p) => !shown.includes(p.id)), "a repeat slipped through");
    assert(more.products.length > 0);
  });
});

Deno.test("looksLikeMoreOptionsIntent recognizes asks for new items but not other messages", () => {
  for (const yes of ["Can I get some more options?", "show me more", "something else", "any other ideas", "give me different gifts", "More"]) {
    assert(looksLikeMoreOptionsIntent(yes), yes);
  }
  for (const no of ["I'd like the Holiday Cookie & Brownie Duo", "yes confirm", "anything under 25?", "tell me more about the pickleballs"]) {
    assert(!looksLikeMoreOptionsIntent(no), no);
  }
});

const P = (id: string, title: string) => ({ id, title });
const found = [P("1", "Frizzle High Heat Cooking Oil"), P("2", "Coffee Beans by Methodical Coffee"), P("3", "Charcuterie Trio"), P("4", "Set of 3 Pickleballs")];

Deno.test("pickCardProducts keeps exact matches and never overrides a review", () => {
  assertEquals(pickCardProducts("x", [found[0]], found, false), [found[0]]);
  assertEquals(pickCardProducts("Here are some ideas", [], found, true), []);
});

Deno.test("pickCardProducts shows what the search returned when the reply's titles didn't match exactly", () => {
  const reply = "Two options under $25:\n- Frizzle Cooking Oil ($14)\n- Methodical Coffee Beans ($16)";
  assertEquals(pickCardProducts(reply, [], found, false).map((p) => p.id), ["1", "2"]);
});

Deno.test("pickCardProducts falls back to the top results when the reply names none, and to nothing without a search", () => {
  assertEquals(pickCardProducts("Here are some ideas", [], found, false, 3).map((p) => p.id), ["1", "2", "3"]);
  assertEquals(pickCardProducts("Here are some ideas", [], [], false), []);
});

const offer = { recommendedProducts: [{ id: "p1", title: "Holiday Cookie & Brownie Duo", price: 15 }], activeRecipient: { id: "r1", name: "Kora" } };

Deno.test("affirmedSingleOffer: a short yes to one offered gift selects it", () => {
  assertEquals(affirmedSingleOffer("Yes", offer)?.id, "p1");
  assertEquals(affirmedSingleOffer("yeah sounds good", offer)?.id, "p1");
});

Deno.test("affirmedSingleOffer: stays out of the way when it is not a clear yes to one gift", () => {
  assertEquals(affirmedSingleOffer("yes but anything cheaper?", offer), null);
  assertEquals(affirmedSingleOffer("Yes, but I would like the cheaper one for her mom instead", offer), null);
  assertEquals(affirmedSingleOffer("Yes", { ...offer, pendingReview: { recipientId: "r1", productId: "p1", occasionDate: "2026-11-20" } }), null);
  assertEquals(affirmedSingleOffer("Yes", { ...offer, recommendedProducts: [...offer.recommendedProducts, { id: "p2", title: "Other", price: 9 }] }), null);
  assertEquals(affirmedSingleOffer("Yes", { recommendedProducts: offer.recommendedProducts }), null);
  assertEquals(affirmedSingleOffer("Yes", null), null);
});

Deno.test("pickPendingReviewMarker keeps a review pending through side questions, newest first", () => {
  assertEquals(pickPendingReviewMarker([{ activeRecipient: {} }, { reviewMarker: "r:p:2026-11-20" }, { reviewMarker: "old:p:2026-01-01" }]), "r:p:2026-11-20");
  assertEquals(pickPendingReviewMarker([{ reviewMarker: "new:p:2026-11-20" }, { reviewMarker: "old:p:2026-01-01" }]), "new:p:2026-11-20");
  assertEquals(pickPendingReviewMarker([{}, {}, {}, {}, { reviewMarker: "too:far:back" }]), undefined);
  assertEquals(pickPendingReviewMarker([null, undefined]), undefined);
});
