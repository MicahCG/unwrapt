import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const proxySource = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");

test("middleware source does not import the package that crashes the runtime", () => {
  assert.equal(/from\s+["']@vercel\/functions/.test(proxySource), false);
  assert.equal(/from\s+["']node:/.test(proxySource), false);
  assert.match(proxySource, /x-middleware-next/);
  assert.match(proxySource, /x-middleware-rewrite/);
});

test("bundled middleware runs for marketing, app, and unknown hosts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "unwrapt-proxy-"));
  const outfile = join(dir, "proxy.mjs");
  await esbuild.build({
    entryPoints: [new URL("../../proxy.ts", import.meta.url).pathname],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
  });

  const bundled = readFileSync(outfile, "utf8");
  assert.equal(bundled.includes("node:fs"), false);
  assert.equal(bundled.includes("@vercel/oidc"), false);

  const mod = (await import(pathToFileURL(outfile).href)) as {
    default: (request: Request) => Response;
  };

  const call = (url: string, host: string) =>
    mod.default(new Request(url, { headers: { host, "x-forwarded-host": host } }));

  const home = await call("https://www.unwrapt.io/", "www.unwrapt.io");
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("x-middleware-next"), "1");

  const pricing = await call("https://www.unwrapt.io/pricing", "www.unwrapt.io");
  assert.equal(pricing.status, 200);
  assert.equal(pricing.headers.get("x-middleware-next"), "1");

  const missing = await call("https://www.unwrapt.io/zzz-nope", "www.unwrapt.io");
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("x-middleware-rewrite") || "", /\/404\.html$/);
  assert.equal(await missing.text(), "");

  const appHome = await call("https://app.unwrapt.io/", "app.unwrapt.io");
  assert.equal(appHome.status, 200);
  assert.match(appHome.headers.get("x-middleware-rewrite") || "", /\/spa\.html$/);

  const settings = await call("https://app.unwrapt.io/settings", "app.unwrapt.io");
  assert.match(settings.headers.get("x-middleware-rewrite") || "", /\/spa\.html$/);

  const gift = await call("https://www.unwrapt.io/gift-choice/token", "www.unwrapt.io");
  assert.match(gift.headers.get("x-middleware-rewrite") || "", /\/spa\.html$/);

  const apex = await call("https://unwrapt.io/faq", "unwrapt.io");
  assert.equal(apex.status, 308);
  assert.equal(apex.headers.get("location"), "https://www.unwrapt.io/faq");
});
