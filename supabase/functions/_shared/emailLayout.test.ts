// Run with: deno test --no-check -A supabase/functions/_shared/emailLayout.test.ts
import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { cleanPersonName, inlineCriticalStyles, theaNote, wrapEmail, LOGO_URL, THEA_URL } from "./emailLayout.ts";

Deno.test("cleanPersonName drops an event title suffix but never empties a name", () => {
  assertEquals(cleanPersonName("Eric's Birthday"), "Eric");
  assertEquals(cleanPersonName("Mom bday"), "Mom");
  assertEquals(cleanPersonName("Eric’s Anniversary"), "Eric");
  assertEquals(cleanPersonName("Kora"), "Kora");
  assertEquals(cleanPersonName("Birthday"), "Birthday");
  assertEquals(cleanPersonName(undefined), "");
});

Deno.test("wrapEmail is a full document with the head style block, logo and Thea", () => {
  const html = wrapEmail({ inner: `<div class="content"><p>Hi</p></div>`, theaNote: "Hello <b>there</b>", title: "T" });
  assert(html.startsWith("<!doctype html>"));
  assert(html.includes("<head>") && html.includes("<style>") && html.includes("</head>"));
  assert(html.includes(LOGO_URL) && html.includes(THEA_URL));
  assert(html.includes("Hello &lt;b&gt;there&lt;/b&gt;"), "note text is escaped");
  assert(!html.includes("Manage notification preferences") === false);
});

Deno.test("buttons and headings keep their look even when a client strips <style>", () => {
  const out = inlineCriticalStyles(`<a href="x" class="button primary">Go</a><a href="y" class="button secondary">No</a><h2>Hi</h2>`);
  assert(/class="button" style="[^"]*background:#2A2520/.test(out));
  assert(/class="button secondary" style="[^"]*background:transparent/.test(out));
  assert(/<h2 style="[^"]*Newsreader/.test(out));
});

Deno.test("Thea speaks on reminders and tips, and stays quiet on billing mail", () => {
  assert(theaNote("occasion_reminder", { recipientName: "Eric's Birthday", occasion: "birthday" })!.includes("Eric's birthday"));
  assertEquals(theaNote("low_wallet_balance"), null);
  assertEquals(theaNote("trial_ending"), null);
});
