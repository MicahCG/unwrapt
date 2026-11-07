import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PUBLIC_PAGES } from "./site";
import { startStaticServer } from "./staticServer";

const dist = new URL("../../dist/", import.meta.url);

function readDist(path: string) {
  return readFileSync(new URL(path, dist), "utf8");
}

test("prerendered public HTML has unique metadata and answer text", () => {
  const home = readDist("index.html");
  assert.match(home, /data-prerender="\/"/);
  assert.match(home, /Thea, the gifting assistant, remembers the dates/);
  assert.match(home, /rel="canonical" href="https:\/\/www\.unwrapt\.io\/"/);
  assert.match(home, /<title[^>]*>Thea remembers birthdays and helps send gifts \| Unwrapt<\/title>/);
  assert.equal(home.includes("data-lov-"), false);
  assert.ok(home.length < 120_000, `homepage HTML is ${home.length} bytes`);
  assert.match(home, /United States/);
  assert.equal(home.includes("Worldwide"), false);
  assert.equal(home.includes("AggregateRating"), false);
  assert.equal(home.includes("FAQPage"), false);
  assert.equal(home.includes("areaServed\":\"Worldwide"), false);

  const seenTitles = new Set<string>();
  const seenCanonicals = new Set<string>();
  for (const page of PUBLIC_PAGES) {
    const file = page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`;
    const html = readDist(file);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(title, file);
    assert.ok(canonical, file);
    assert.equal(seenTitles.has(title), false, title);
    assert.equal(seenCanonicals.has(canonical), false, canonical);
    seenTitles.add(title);
    seenCanonicals.add(canonical);
    assert.match(html, new RegExp(`data-prerender="${page.path}"`));
    assert.match(html, /<h1[\s\S]*?<\/h1>/);
    assert.equal(html.includes('content="noindex'), false, file);
    assert.match(html, /<script type="module"/);
  }

  const guide = readDist("guides/never-forget-birthdays/index.html");
  assert.match(guide, /at least two weeks/);
  assert.match(guide, /<time datetime="2026-11-07">/i);

  const pricing = readDist("pricing/index.html");
  assert.match(pricing, /\$4\.99/);
  assert.match(pricing, /rel="canonical" href="https:\/\/www\.unwrapt\.io\/pricing"/);

  const spa = readDist("spa.html");
  assert.match(spa, /content="noindex, nofollow"/);
  assert.match(spa, /<div id="root"><\/div>/);
  assert.equal(spa.includes("data-prerender"), false);

  const missing = readDist("404.html");
  assert.match(missing, /Page not found/);
  assert.match(missing, /content="noindex, nofollow"/);

  const sitemap = readDist("sitemap.xml");
  assert.equal(sitemap.includes("/settings"), false);
  assert.equal(sitemap.includes("/app<"), false);
  assert.match(sitemap, /https:\/\/www\.unwrapt\.io\/guides\/never-forget-birthdays/);
  const robots = readDist("robots.txt");
  assert.match(robots, /Disallow: \/settings/);
  assert.equal(robots.includes("Disallow: /assets"), false);
});

test("static routing returns real 404s and keeps app deep links", async () => {
  const { server, origin } = await startStaticServer(fileURLToPath(new URL("../../dist/", import.meta.url)));
  try {
    const home = await fetch(origin + "/", { headers: { "x-forwarded-host": "www.unwrapt.io" } });
    assert.equal(home.status, 200);
    const homeHtml = await home.text();
    assert.match(homeHtml, /Thea, the gifting assistant/);

    const unknown = await fetch(origin + "/zzz-nope", { headers: { "x-forwarded-host": "www.unwrapt.io" } });
    assert.equal(unknown.status, 404);
    assert.match(await unknown.text(), /Page not found/);

    const settings = await fetch(origin + "/settings", { headers: { "x-forwarded-host": "www.unwrapt.io" } });
    assert.equal(settings.status, 200);
    const settingsHtml = await settings.text();
    assert.match(settingsHtml, /noindex, nofollow/);
    assert.equal(settingsHtml.includes("data-prerender"), false);

    const choice = await fetch(origin + "/gift-choice/sample-token", { headers: { "x-forwarded-host": "www.unwrapt.io" } });
    assert.equal(choice.status, 200);
    assert.match(await choice.text(), /<div id="root"><\/div>/);

    const callback = await fetch(origin + "/auth/calendar/callback", { headers: { "x-forwarded-host": "app.unwrapt.io" } });
    assert.equal(callback.status, 200);

    const appHome = await fetch(origin + "/", { headers: { "x-forwarded-host": "app.unwrapt.io" } });
    assert.equal(appHome.status, 200);
    const appHtml = await appHome.text();
    assert.equal(appHtml.includes("Thea, the gifting assistant"), false);

    const apex = await fetch(origin + "/faq", { headers: { "x-forwarded-host": "unwrapt.io" }, redirect: "manual" });
    assert.equal(apex.status, 308);
    assert.equal(apex.headers.get("location"), "https://www.unwrapt.io/faq");

    const robots = await fetch(origin + "/robots.txt", { headers: { "x-forwarded-host": "www.unwrapt.io" } });
    assert.equal(robots.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
