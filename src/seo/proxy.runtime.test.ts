import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const proxySource = readFileSync(new URL("../../proxy.ts", import.meta.url), "utf8");

test("middleware source does not import the package that crashes the runtime", () => {
  assert.equal(/from\s+["']@vercel\/functions/.test(proxySource), false);
  assert.equal(/from\s+["']node:/.test(proxySource), false);
  assert.match(proxySource, /from "\.\/src\/seo\/routing\.js"/);
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

const middlewareFiles = [
  "proxy.ts",
  "src/seo/routing.ts",
  "src/seo/site.ts",
  "src/lib/stripe.ts",
];

/** Emit each file separately, keeping import specifiers, the way nodejs24.x loads proxy.js. */
async function emitUnbundled(root: string) {
  for (const file of middlewareFiles) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    const transformed = await esbuild.transform(source, { loader: "ts", format: "esm" });
    const out = join(root, file.replace(/\.ts$/, ".js"));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, transformed.code);
  }
  writeFileSync(join(root, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(
    join(root, "load.mjs"),
    `import proxy from "./proxy.js";
const call = (url, host) => proxy(new Request(url, { headers: { host, "x-forwarded-host": host } }));
const pricing = await call("https://www.unwrapt.io/pricing", "www.unwrapt.io");
if (pricing.headers.get("x-middleware-next") !== "1") process.exit(2);
const missing = await call("https://www.unwrapt.io/zzz-nope", "www.unwrapt.io");
if (missing.status !== 404) process.exit(3);
const app = await call("https://app.unwrapt.io/", "app.unwrapt.io");
if (!String(app.headers.get("x-middleware-rewrite")).endsWith("/spa.html")) process.exit(4);
const icon = await call("https://www.unwrapt.io/favicon.ico", "www.unwrapt.io");
if (icon.headers.get("x-middleware-next") !== "1") process.exit(5);
console.log("ok");
`,
  );
}

test("unbundled nodejs middleware loads with explicit .js specifiers", async () => {
  const root = mkdtempSync(join(tmpdir(), "unwrapt-unbundled-"));
  await emitUnbundled(root);
  const proxyJs = readFileSync(join(root, "proxy.js"), "utf8");
  assert.match(proxyJs, /from "\.\/src\/seo\/routing\.js"/);
  assert.match(readFileSync(join(root, "src/seo/routing.js"), "utf8"), /from "\.\/site\.js"/);
  assert.match(readFileSync(join(root, "src/seo/site.js"), "utf8"), /from "\.\.\/lib\/stripe\.js"/);

  const loaded = spawnSync(process.execPath, ["load.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(loaded.status, 0, loaded.stderr);
  assert.match(loaded.stdout, /ok/);

  const brokenRoot = mkdtempSync(join(tmpdir(), "unwrapt-extensionless-"));
  await emitUnbundled(brokenRoot);
  const brokenProxy = readFileSync(join(brokenRoot, "proxy.js"), "utf8").replace(
    'from "./src/seo/routing.js"',
    'from "./src/seo/routing"',
  );
  writeFileSync(join(brokenRoot, "proxy.js"), brokenProxy);
  const broken = spawnSync(process.execPath, ["load.mjs"], { cwd: brokenRoot, encoding: "utf8" });
  assert.notEqual(broken.status, 0);
  assert.match(broken.stderr, /ERR_MODULE_NOT_FOUND/);
  assert.match(broken.stderr, /src\/seo\/routing/);
});
