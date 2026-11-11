//   deno test supabase/functions/_shared/isoCountry.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  ISO_COUNTRY_ALIASES,
  goodyMailingCountry,
  normalizeCountryKey,
  toIso3166Alpha2,
} from "./isoCountry.ts";

Deno.test("maps the country value Goody rejected to US", () => {
  assertEquals(toIso3166Alpha2("United States"), "US");
  assertEquals(goodyMailingCountry("United States"), "US");
});

Deno.test("maps common United States names and already-correct codes", () => {
  for (const value of [
    "United States",
    "united states",
    "UNITED STATES",
    "  United States  ",
    "United States.",
    "The United States",
    "USA",
    "usa",
    "U.S.A.",
    "u.s.a.",
    "U.S.",
    "u.s.",
    "US",
    "us",
    "Us",
    "United States of America",
    "US of A",
  ]) {
    assertEquals(toIso3166Alpha2(value), "US", value);
  }
});

Deno.test("maps the country names the address forms store", () => {
  assertEquals(toIso3166Alpha2("Canada"), "CA");
  assertEquals(toIso3166Alpha2("United Kingdom"), "GB");
  assertEquals(toIso3166Alpha2("Australia"), "AU");
  assertEquals(toIso3166Alpha2("Cote d'Ivoire"), "CI");
  assertEquals(toIso3166Alpha2("São Tomé and Príncipe"), "ST");
  assertEquals(toIso3166Alpha2("Sao Tome and Principe"), "ST");
});

Deno.test("maps UK to GB and keeps other two-letter codes", () => {
  assertEquals(toIso3166Alpha2("UK"), "GB");
  assertEquals(toIso3166Alpha2("uk"), "GB");
  assertEquals(toIso3166Alpha2("U.K."), "GB");
  assertEquals(toIso3166Alpha2("GB"), "GB");
  assertEquals(toIso3166Alpha2("gb"), "GB");
  assertEquals(toIso3166Alpha2("de"), "DE");
  assertEquals(toIso3166Alpha2("Jp"), "JP");
});

Deno.test("returns null for blank or unrecognized countries", () => {
  assertEquals(toIso3166Alpha2(null), null);
  assertEquals(toIso3166Alpha2(undefined), null);
  assertEquals(toIso3166Alpha2(""), null);
  assertEquals(toIso3166Alpha2("   "), null);
  assertEquals(toIso3166Alpha2("Narnia"), null);
  assertEquals(toIso3166Alpha2("America"), null);
  assertEquals(toIso3166Alpha2("United"), null);
});

Deno.test("blank mailing country stays US and unknown countries do not", () => {
  assertEquals(goodyMailingCountry(null), "US");
  assertEquals(goodyMailingCountry(undefined), "US");
  assertEquals(goodyMailingCountry(""), "US");
  assertEquals(goodyMailingCountry("   "), "US");
  assertEquals(goodyMailingCountry("United States"), "US");
  assertEquals(goodyMailingCountry("Narnia"), null);
  assertEquals(goodyMailingCountry("Canada"), "CA");
});

Deno.test("every alias normalizes to its alpha-2 code exactly once", () => {
  const seen = new Map<string, string>();
  for (const [code, names] of ISO_COUNTRY_ALIASES) {
    assertEquals(/^[A-Z]{2}$/.test(code), true, code);
    assertEquals(toIso3166Alpha2(code), code);
    assertEquals(toIso3166Alpha2(code.toLowerCase()), code);
    for (const name of names) {
      const key = normalizeCountryKey(name);
      const previous = seen.get(key);
      if (previous) {
        throw new Error(`Alias "${name}" duplicates ${previous}`);
      }
      seen.set(key, `${code}:${name}`);
      assertEquals(toIso3166Alpha2(name), code, name);
    }
  }
});
