// Run with: deno test --no-check -A supabase/functions/_shared/addressMatch.test.ts
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { buildSuggestion, isPoBox, normalizeStreet, parseMatchedAddress, splitUnit } from "./addressMatch.ts";

const input = (street: string, city = "Washington", state = "DC", zip = "20500") => ({ street, city, state, zip });
const MATCH = "1600 PENNSYLVANIA AVE NW, WASHINGTON, DC, 20500";

Deno.test("splitUnit separates apartment/suite/# from the building", () => {
  assertEquals(splitUnit("12 Oak St Apt 4B"), { base: "12 Oak St", unit: "Apt 4B" });
  assertEquals(splitUnit("12 Oak St, #7"), { base: "12 Oak St", unit: "#7" });
  assertEquals(splitUnit("500 Main Street Suite 200"), { base: "500 Main Street", unit: "Suite 200" });
  assertEquals(splitUnit("12 Oak St"), { base: "12 Oak St", unit: "" });
});

Deno.test("normalizeStreet folds cosmetic differences", () => {
  assertEquals(normalizeStreet("1600 Pennsylvania Avenue Northwest"), normalizeStreet("1600 PENNSYLVANIA AVE NW"));
  assert(normalizeStreet("12 Oak Street") !== normalizeStreet("21 Oak Street"));
});

Deno.test("no suggestion when the typed address is the same one, however it's styled", () => {
  assertEquals(buildSuggestion(input("1600 Pennsylvania Avenue NW"), MATCH), null);
  assertEquals(buildSuggestion(input("1600 pennsylvania ave nw", "washington", "dc"), MATCH), null);
});

Deno.test("a typo'd street or wrong zip produces a clean, title-cased suggestion", () => {
  const s = buildSuggestion(input("1600 Pensylvania Ave NW"), MATCH);
  assertEquals(s, { street: "1600 Pennsylvania Ave NW", city: "Washington", state: "DC", zip: "20500" });
  assertEquals(buildSuggestion(input("1600 Pennsylvania Ave NW", "Washington", "DC", "20501"), MATCH)?.zip, "20500");
});

Deno.test("the unit is kept on the suggestion", () => {
  const s = buildSuggestion(input("1600 Pensylvania Ave NW Apt 2"), MATCH);
  assertEquals(s?.street, "1600 Pennsylvania Ave NW Apt 2");
});

Deno.test("PO boxes are recognized and unparseable matches are ignored", () => {
  assert(isPoBox("PO Box 123") && isPoBox("P.O. Box 9") && !isPoBox("12 Box Elder Rd"));
  assertEquals(parseMatchedAddress("garbage"), null);
});
