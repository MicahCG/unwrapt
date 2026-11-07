import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createServer } from "vite";
import { PUBLIC_PAGES } from "../src/seo/site";

type Rendered = { html: string; title: string; meta: string; link: string; script: string };

function stripEditorAttrs(value: string) {
  return value
    .replace(/\sdata-lov-[a-z0-9-]+="[^"]*"/gi, "")
    .replace(/\sdata-component-[a-z0-9-]+="[^"]*"/gi, "")
    .replace(/\sdata-rh="true"/gi, "");
}

function applyDocument(template: string, rendered: Rendered, marker: string) {
  const clean: Rendered = {
    html: stripEditorAttrs(rendered.html),
    title: stripEditorAttrs(rendered.title),
    meta: stripEditorAttrs(rendered.meta),
    link: stripEditorAttrs(rendered.link),
    script: stripEditorAttrs(rendered.script),
  };
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, clean.title.trim());
  html = html.replace(/<meta\s+name="description"[^>]*>\s*/i, "");
  html = html.replace(/<meta\s+name="robots"[^>]*>\s*/i, "");
  html = html.replace(
    "</head>",
    `${clean.meta}\n${clean.link}\n${clean.script}\n</head>`,
  );
  const root = `<div id="root" data-prerender="${marker}">${clean.html}</div>`;
  if (!html.includes('<div id="root"></div>')) {
    throw new Error("Built index.html is missing an empty #root");
  }
  html = html.replace('<div id="root"></div>', root);
  return html;
}

const dist = join(process.cwd(), "dist");
const indexPath = join(dist, "index.html");
const spaPath = join(dist, "spa.html");
const indexHtml = readFileSync(indexPath, "utf8");
const template = indexHtml.includes('<div id="root"></div>') ? indexHtml : readFileSync(spaPath, "utf8");
if (!template.includes('<div id="root"></div>')) {
  throw new Error("Could not find the Vite shell. Run vite build before prerender.");
}
writeFileSync(spaPath, template);

const vite = await createServer({
  mode: "production",
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const mod = (await vite.ssrLoadModule("/src/prerender/renderPublicPage.tsx")) as {
    renderPublicPage: (path: string) => Rendered;
  };

  for (const page of PUBLIC_PAGES) {
    const rendered = mod.renderPublicPage(page.path);
    const file = page.path === "/" ? join(dist, "index.html") : join(dist, page.path.slice(1), "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, applyDocument(template, rendered, page.path));
    console.log(`Prerendered ${page.path}`);
  }

  const notFound = mod.renderPublicPage("/404");
  writeFileSync(join(dist, "404.html"), applyDocument(template, notFound, "/404"));
  console.log("Prerendered /404");
} finally {
  await vite.close();
}
