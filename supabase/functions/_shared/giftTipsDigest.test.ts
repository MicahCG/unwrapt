// Run with: deno test --no-check -A supabase/functions/_shared/giftTipsDigest.test.ts
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { daysLabel, digestInnerHtml, digestSubject, formatOccasionDate, type DigestItem } from "./giftTipsDigest.ts";

const mom: DigestItem = { recipientName: "Mom", occasion: "birthday", occasionDate: "2026-12-28", daysAway: 40 };
const itza: DigestItem = { recipientName: "Itza", occasion: "birthday", occasionDate: "2026-12-30", daysAway: 42 };
const cal: DigestItem = {
  recipientName: "Caleigh", occasion: "birthday", occasionDate: "2026-12-30", daysAway: 42,
  pick: { title: "Gourmet Coffee Set", image: "https://img/x.png", price: 32 },
};

Deno.test("formatOccasionDate and daysLabel are timezone-safe and readable", () => {
  assertEquals(formatOccasionDate("2026-12-28"), "Dec 28");
  assertEquals(daysLabel(0), "today");
  assertEquals(daysLabel(1), "tomorrow");
  assertEquals(daysLabel(40), "in 40 days");
});

Deno.test("subject names the person, occasion and date for a single item", () => {
  assertEquals(digestSubject([mom]), "🎂 Mom's birthday is in 40 days (Dec 28)");
});

Deno.test("subject lists names (not a vague 'notification') for several items", () => {
  assertEquals(digestSubject([mom, itza, cal]), "🎂 3 gifts to plan: Mom, Itza and Caleigh");
  const many = [mom, itza, cal, { ...mom, recipientName: "Dad" }, { ...mom, recipientName: "Sam" }];
  assertEquals(digestSubject(many), "🎂 5 gifts to plan: Mom, Itza, Caleigh and 2 more");
});

Deno.test("body shows each recipient, date, and an idea only when there is a real pick", () => {
  const html = digestInnerHtml("Hi Cydel,", [mom, cal], "https://app.unwrapt.io");
  assert(html.includes("Mom") && html.includes("Dec 28") && html.includes("in 40 days"));
  assert(html.includes("Gourmet Coffee Set") && html.includes("$32.00"));
  assert(html.includes("Tell Thea what Mom likes"), "no pick -> honest prompt, no invented gift");
  assert(!html.includes("Tell Thea what Caleigh likes"));
});

Deno.test("recipient names are HTML-escaped", () => {
  const html = digestInnerHtml("Hi,", [{ ...mom, recipientName: "<b>x</b>" }], "https://a");
  assert(!html.includes("<b>x</b>") && html.includes("&lt;b&gt;"));
});
