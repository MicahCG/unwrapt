import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { decideRoute, publicHtmlFile } from "./routing";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function fileInDist(distDir: string, pathname: string): string | null {
  const trimmed = pathname.split("?")[0];
  const relative = normalize(decodeURIComponent(trimmed)).replace(/^[/\\]+/, "");
  if (relative.startsWith("..")) return null;
  const root = distDir.endsWith("/") ? distDir : `${distDir}/`;
  const full = join(distDir, relative);
  if (full !== distDir && !full.startsWith(root)) return null;
  return full;
}

async function readOptional(file: string): Promise<Buffer | null> {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export function startStaticServer(distDir: string, port = 0): Promise<{ server: Server; port: number; origin: string }> {
  const server = createServer(async (request, response) => {
    const forwarded = request.headers["x-forwarded-host"];
    const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || request.headers.host || "localhost";
    const url = new URL(request.url ?? "/", "http://localhost");
    const decision = decideRoute(host, url.pathname, url.search);

    if (decision.type === "redirect") {
      response.writeHead(decision.status, { location: decision.to });
      response.end();
      return;
    }

    let file: string | null = null;
    let status = 200;
    if (decision.type === "public") file = publicHtmlFile(distDir, decision.path);
    else if (decision.type === "spa") file = join(distDir, "spa.html");
    else if (decision.type === "not_found") {
      file = join(distDir, "404.html");
      status = 404;
    } else {
      file = fileInDist(distDir, url.pathname);
    }

    const body = file ? await readOptional(file) : null;
    if (!body || !file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const headers: Record<string, string> = {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    };
    if (decision.type === "spa" || decision.type === "not_found") {
      headers["x-robots-tag"] = "noindex, nofollow";
    }
    response.writeHead(status, headers);
    response.end(body);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, port, origin: `http://127.0.0.1:${port}` });
    });
  });
}
