import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { VIP_MONTHLY_AMOUNT_LABEL } from "../lib/stripe";
import { decideRoute } from "./routing";
import {
  PUBLIC_PAGES,
  VIP_WEB_PRICE_LABEL,
  renderRobots,
  renderSitemap,
  structuredDataFor,
} from "./site";

const PRIVATE = [
  "/app",
  "/settings",
  "/gift-history",
  "/wishlist",
  "/analytics",
  "/notifications",
  "/onboarding",
  "/payment/success",
];

test("web VIP label matches the product price constant", () => {
  assert.equal(VIP_WEB_PRICE_LABEL, "$4.99");
  assert.equal(VIP_WEB_PRICE_LABEL, VIP_MONTHLY_AMOUNT_LABEL);
});

test("sitemap lists only the public pages on the www host", () => {
  const xml = renderSitemap();
  for (const page of PUBLIC_PAGES) {
    const loc = page.path === "/" ? "https://www.unwrapt.io/" : `https://www.unwrapt.io${page.path}`;
    assert.equal(xml.includes(`<loc>${loc}</loc>`), true, loc);
  }
  assert.equal(xml.includes("2026-02-20"), false);
  for (const path of PRIVATE) {
    assert.equal(xml.includes(`https://www.unwrapt.io${path}`), false, path);
  }
  assert.equal(xml.includes("https://unwrapt.io/"), false);
  assert.equal(xml.includes("/landing"), false);
});

test("robots allows assets and blocks private routes", () => {
  const robots = renderRobots();
  assert.match(robots, /Sitemap: https:\/\/www\.unwrapt\.io\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/settings/);
  assert.match(robots, /Disallow: \/gift-history/);
  assert.match(robots, /Disallow: \/muse\//);
  assert.equal(robots.includes("Disallow: /assets"), false);
  assert.equal(robots.includes("Disallow: /lovable-uploads"), false);
  assert.equal(/Allow:\s+\/\s/.test(robots), true);
});

test("structured data is US-only and does not invent ratings", () => {
  const home = JSON.stringify(structuredDataFor("/"));
  assert.match(home, /United States/);
  assert.match(home, /KinGira LLC/);
  assert.match(home, /"price":"4\.99"/);
  assert.equal(home.includes("Worldwide"), false);
  assert.equal(home.includes("AggregateRating"), false);
  assert.equal(home.includes("Review"), false);
  assert.equal(home.includes("FAQPage"), false);
  const faq = JSON.stringify(structuredDataFor("/faq"));
  assert.equal(faq.includes("FAQPage"), false);
});

test("vercel config does not send every URL to the empty shell", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    rewrites?: { source: string; destination: string }[];
  };
  const catchAll = (config.rewrites ?? []).find(
    (rule) => rule.source === "/(.*)" && rule.destination === "/index.html",
  );
  assert.equal(catchAll, undefined);
  const spa = (config.rewrites ?? []).find((rule) => rule.destination === "/spa.html");
  assert.ok(spa);
});

test("apex redirects to www and unknown paths 404", () => {
  assert.deepEqual(decideRoute("unwrapt.io", "/pricing", "?q=1"), {
    type: "redirect",
    status: 308,
    to: "https://www.unwrapt.io/pricing?q=1",
  });
  assert.deepEqual(decideRoute("www.unwrapt.io", "/pricing/"), {
    type: "redirect",
    status: 308,
    to: "/pricing",
  });
  assert.deepEqual(decideRoute("www.unwrapt.io", "/landing"), {
    type: "redirect",
    status: 301,
    to: "/",
  });
  assert.equal(decideRoute("www.unwrapt.io", "/zzz-nope").type, "not_found");
  assert.equal(decideRoute("preview.vercel.app", "/made-up").type, "not_found");
});

test("app host and real deep links stay on the spa shell", () => {
  assert.equal(decideRoute("app.unwrapt.io", "/").type, "spa");
  assert.equal(decideRoute("app.unwrapt.io", "/pricing").type, "spa");
  assert.equal(decideRoute("app.unwrapt.io", "/settings").type, "spa");
  assert.equal(decideRoute("www.unwrapt.io", "/gift-choice/abc").type, "spa");
  assert.equal(decideRoute("www.unwrapt.io", "/confirm-address/gift_1").type, "spa");
  assert.equal(decideRoute("www.unwrapt.io", "/gifts/confirm-address/gift_1").type, "spa");
  assert.equal(decideRoute("www.unwrapt.io", "/auth/callback").type, "spa");
  assert.equal(decideRoute("www.unwrapt.io", "/auth/calendar/callback").type, "spa");
  assert.equal(decideRoute("www.unwrapt.io", "/how-it-works").type, "public");
  assert.equal(decideRoute("www.unwrapt.io", "/og-thea.png").type, "passthrough");
  assert.equal(decideRoute("www.unwrapt.io", "/assets/index.js").type, "passthrough");
});
