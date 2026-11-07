import { APP_HOST, APEX_HOST, CANONICAL_HOST, CANONICAL_ORIGIN, INDEXABLE_PATHS } from "./site";

export type RouteDecision =
  | { type: "redirect"; status: 301 | 308; to: string }
  | { type: "public"; path: string }
  | { type: "spa" }
  | { type: "passthrough" }
  | { type: "not_found" };

/** Document routes that must keep working as the client app, including deep links. */
const SPA_EXACT = new Set([
  "/app",
  "/settings",
  "/gift-history",
  "/history",
  "/wishlist",
  "/analytics",
  "/notifications",
  "/onboarding",
  "/payment/success",
  "/payment-success",
  "/landing",
]);

const SPA_PREFIXES = ["/gift-choice/", "/confirm-address/", "/gifts/confirm-address/", "/auth/"];

export function normalizePath(pathname: string): string {
  const withLeading = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeading.length > 1 && withLeading.endsWith("/")) return withLeading.slice(0, -1);
  return withLeading || "/";
}

export function isIndexablePublicPath(pathname: string): boolean {
  return (INDEXABLE_PATHS as readonly string[]).includes(normalizePath(pathname));
}

export function isSpaPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (SPA_EXACT.has(path)) return true;
  return SPA_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length);
}

function hasFileExtension(pathname: string): boolean {
  const last = pathname.split("/").pop() ?? "";
  return last.includes(".");
}

/**
 * Host and path decision shared by Vercel routing middleware and the local static tests.
 * Asset URLs (a dot in the last segment) are left to the file server.
 */
export function decideRoute(hostHeader: string, pathname: string, search = ""): RouteDecision {
  const host = hostHeader.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
  const path = pathname || "/";

  if (host === APEX_HOST) {
    return {
      type: "redirect",
      status: 308,
      to: `https://${CANONICAL_HOST}${path}${search}`,
    };
  }

  if (hasFileExtension(path) || path === "/muse" || path.startsWith("/muse/")) {
    return { type: "passthrough" };
  }

  if (host === APP_HOST) {
    return { type: "spa" };
  }

  if (path.length > 1 && path.endsWith("/")) {
    const bare = normalizePath(path);
    return { type: "redirect", status: 308, to: `${bare}${search}` };
  }

  const normalized = normalizePath(path);

  if (normalized === "/landing") {
    return { type: "redirect", status: 301, to: `/${search}` };
  }

  if (isIndexablePublicPath(normalized)) {
    return { type: "public", path: normalized };
  }

  if (isSpaPath(normalized)) {
    return { type: "spa" };
  }

  return { type: "not_found" };
}

export function publicHtmlFile(distDir: string, path: string): string {
  if (path === "/") return `${distDir}/index.html`;
  return `${distDir}${path}/index.html`;
}

export const NOT_FOUND_FILE = "404.html";
export const SPA_SHELL_FILE = "spa.html";

/** Absolute canonical used in tests and generated files. */
export function expectedCanonical(path: string): string {
  return path === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${path}`;
}
