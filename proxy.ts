import { decideRoute } from "./src/seo/routing";

/**
 * Vercel invokes this on every matched request. Do not import `@vercel/functions`:
 * its package root loads OIDC code that reads the filesystem at runtime,
 * and that throws inside the middleware bundle (MIDDLEWARE_INVOCATION_FAILED on
 * every host). `next` and `rewrite` only set the two headers below.
 */
function continueRequest(): Response {
  return new Response(null, { headers: { "x-middleware-next": "1" } });
}

function rewriteTo(destination: URL, status = 200): Response {
  const headers = new Headers();
  headers.set("x-middleware-rewrite", destination.toString());
  if (status === 404) headers.set("x-robots-tag", "noindex, nofollow");
  return new Response(null, { status, headers });
}

function requestUrl(request: Request): URL {
  try {
    return new URL(request.url);
  } catch {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
    return new URL(request.url || "/", `https://${host}`);
  }
}

export default function proxy(request: Request): Response {
  const url = requestUrl(request);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const decision = decideRoute(host, url.pathname, url.search);

  if (decision.type === "redirect") {
    const location = decision.to.startsWith("http") ? decision.to : new URL(decision.to, url).toString();
    return Response.redirect(location, decision.status);
  }

  if (decision.type === "spa") {
    const headers = new Headers();
    headers.set("x-middleware-rewrite", new URL("/spa.html", url).toString());
    headers.set("x-robots-tag", "noindex, nofollow");
    return new Response(null, { headers });
  }

  if (decision.type === "not_found") {
    return rewriteTo(new URL("/404.html", url), 404);
  }

  return continueRequest();
}
