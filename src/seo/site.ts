import { VIP_MONTHLY_AMOUNT_LABEL } from "../lib/stripe";

/**
 * Preferred public host. unwrapt.io already redirects to www in production;
 * canonicals, sitemap, and internal absolute URLs follow that host.
 * app.unwrapt.io stays the signed-in product and is not a canonical host.
 */
export const CANONICAL_ORIGIN = "https://www.unwrapt.io";
export const APP_ORIGIN = "https://app.unwrapt.io";
export const CANONICAL_HOST = "www.unwrapt.io";
export const APEX_HOST = "unwrapt.io";
export const APP_HOST = "app.unwrapt.io";

/** Hosts that should render the public site at `/`. Localhost stays the product app. */
export function isMarketingHostname(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.split(":")[0].toLowerCase();
  return host === CANONICAL_HOST || host === APEX_HOST || host.endsWith(".vercel.app");
}

export const OG_IMAGE_PATH = "/og-thea.png";
export const OG_IMAGE_URL = `${CANONICAL_ORIGIN}${OG_IMAGE_PATH}`;
export const LOGO_URL = `${CANONICAL_ORIGIN}/lovable-uploads/unwrapt-lux.png`;

/**
 * Web membership price as labeled in the product (src/lib/stripe.ts).
 * Older notification emails still say $24.99; do not repeat that figure.
 * iOS uses the App Store price, which can differ, so public copy says so.
 */
export const VIP_WEB_PRICE_LABEL = VIP_MONTHLY_AMOUNT_LABEL;
export const VIP_WEB_PRICE_VALUE = "4.99";

/** Content date for pages written in this change. Legal pages keep their effective date. */
export const PUBLIC_CONTENT_UPDATED = "2026-11-07";
export const PUBLIC_CONTENT_UPDATED_LABEL = "November 7, 2026";
export const LEGAL_EFFECTIVE_DATE = "2026-10-16";

export type PublicPage = {
  path: "/" | "/how-it-works" | "/pricing" | "/faq" | "/guides/never-forget-birthdays" | "/privacy" | "/terms";
  /** Title segment. SEOHead appends " | Unwrapt" except when `absoluteTitle` is set. */
  title: string;
  description: string;
  lastmod: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: string;
  ogType?: "website" | "article";
};

export const PUBLIC_PAGES: PublicPage[] = [
  {
    path: "/",
    title: "Thea remembers birthdays and helps send gifts",
    description:
      "Unwrapt helps you remember birthdays and send a gift before the last minute. Thea suggests a gift, you approve the purchase, and it ships in the United States.",
    lastmod: PUBLIC_CONTENT_UPDATED,
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    path: "/how-it-works",
    title: "How Unwrapt and Thea send gifts",
    description:
      "Yes. Unwrapt remembers occasions you save and helps send a gift. Thea suggests one, you approve it by default, and it ships to a United States street address.",
    lastmod: PUBLIC_CONTENT_UPDATED,
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/pricing",
    title: "How much Unwrapt costs",
    description:
      "Unwrapt VIP is $4.99 per month on the web. That membership is separate from each gift, and the gift price is shown before you approve the purchase.",
    lastmod: PUBLIC_CONTENT_UPDATED,
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/faq",
    title: "Questions about Unwrapt",
    description:
      "Answers about delivery, approval before a gift is purchased, the $4.99 web membership, cancellation, and what Thea does with dates you choose to save.",
    lastmod: PUBLIC_CONTENT_UPDATED,
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    path: "/guides/never-forget-birthdays",
    title: "How to stop forgetting birthdays",
    description:
      "A practical way to stop missing birthdays: one list, a real date, a budget, and enough lead time for a shipped gift. Unwrapt is one way to keep that list.",
    lastmod: PUBLIC_CONTENT_UPDATED,
    changefreq: "monthly",
    priority: "0.7",
    ogType: "article",
  },
  {
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "How KinGira LLC collects, uses, and shares information when you use Unwrapt and Thea, including optional calendar access and gift delivery details.",
    lastmod: LEGAL_EFFECTIVE_DATE,
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/terms",
    title: "Terms of Service",
    description:
      "Terms for using Unwrapt, including VIP billing, gift purchases, approval settings, and fulfillment by third-party partners.",
    lastmod: LEGAL_EFFECTIVE_DATE,
    changefreq: "yearly",
    priority: "0.3",
  },
];

export const INDEXABLE_PATHS = PUBLIC_PAGES.map((page) => page.path);

export const PRIMARY_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/guides/never-forget-birthdays", label: "Birthday guide" },
] as const;

export function canonicalUrl(path: string): string {
  if (path === "/") return `${CANONICAL_ORIGIN}/`;
  return `${CANONICAL_ORIGIN}${path}`;
}

export function pageByPath(path: string): PublicPage | undefined {
  return PUBLIC_PAGES.find((page) => page.path === path);
}

export function renderSitemap(pages: PublicPage[] = PUBLIC_PAGES): string {
  const urls = pages
    .map(
      (page) => `  <url>
    <loc>${canonicalUrl(page.path)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function renderRobots(): string {
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /settings
Disallow: /gift-history
Disallow: /history
Disallow: /wishlist
Disallow: /analytics
Disallow: /notifications
Disallow: /onboarding
Disallow: /payment
Disallow: /confirm-address
Disallow: /gifts/
Disallow: /auth/
Disallow: /gift-choice/
Disallow: /testing
Disallow: /spa.html
Disallow: /muse/

Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`;
}

const organizationId = `${CANONICAL_ORIGIN}/#organization`;
const websiteId = `${CANONICAL_ORIGIN}/#website`;

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": organizationId,
    name: "Unwrapt",
    legalName: "KinGira LLC",
    url: `${CANONICAL_ORIGIN}/`,
    logo: LOGO_URL,
    address: {
      "@type": "PostalAddress",
      addressRegion: "TX",
      addressCountry: "US",
    },
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    name: "Unwrapt",
    url: `${CANONICAL_ORIGIN}/`,
    publisher: { "@id": organizationId },
  };
}

export function serviceNode() {
  return {
    "@type": "Service",
    "@id": `${CANONICAL_ORIGIN}/#service`,
    name: "Unwrapt",
    serviceType: "Personal gifting concierge",
    description:
      "Unwrapt helps you remember birthdays and other occasions and send a gift. Thea suggests a gift from the catalog. You approve the purchase by default. Gifts ship to a street address in the United States.",
    url: `${CANONICAL_ORIGIN}/`,
    provider: { "@id": organizationId },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    offers: {
      "@type": "Offer",
      name: "Unwrapt VIP",
      url: `${CANONICAL_ORIGIN}/pricing`,
      price: VIP_WEB_PRICE_VALUE,
      priceCurrency: "USD",
      description:
        "Monthly membership on the web. Each gift is priced separately and shown before you approve the purchase. The iOS app shows Apple's price before you subscribe.",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: VIP_WEB_PRICE_VALUE,
        priceCurrency: "USD",
        unitCode: "MON",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitCode: "MON",
        },
      },
    },
  };
}

export function structuredDataFor(path: string) {
  const page = pageByPath(path);
  const graph: Record<string, unknown>[] = [organizationNode()];

  if (path === "/") {
    graph.push(websiteNode(), serviceNode());
  } else if (page) {
    graph.push({
      "@type": page.ogType === "article" ? "Article" : "WebPage",
      "@id": `${canonicalUrl(path)}#webpage`,
      name: `${page.title} | Unwrapt`,
      description: page.description,
      url: canonicalUrl(path),
      dateModified: page.lastmod,
      isPartOf: { "@id": websiteId },
      publisher: { "@id": organizationId },
      ...(path === "/pricing" ? { about: { "@id": `${CANONICAL_ORIGIN}/#service` }, mainEntity: serviceNode() } : {}),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
