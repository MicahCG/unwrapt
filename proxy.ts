import { next, rewrite } from "@vercel/functions";
import { decideRoute } from "./src/seo/routing";

/**
 * Runs before the static files. The marketing homepage is dist/index.html, so
 * app.unwrapt.io must be rewritten to the empty spa.html shell or the app
 * would receive the public landing page. Unknown marketing URLs return 404.
 */
export default async function proxy(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const decision = decideRoute(host, url.pathname, url.search);

  if (decision.type === "redirect") {
    const location = decision.to.startsWith("http") ? decision.to : new URL(decision.to, url).toString();
    return Response.redirect(location, decision.status);
  }

  if (decision.type === "spa") {
    return rewrite(new URL("/spa.html", url), {
      headers: { "x-robots-tag": "noindex, nofollow" },
    });
  }

  if (decision.type === "not_found") {
    const notFound = new URL("/404.html", url);
    const page = await fetch(notFound);
    const body = page.ok ? await page.arrayBuffer() : "Not found";
    return new Response(body, {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "x-robots-tag": "noindex, nofollow",
        "cache-control": "no-store",
      },
    });
  }

  return next();
}
