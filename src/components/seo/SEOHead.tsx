import { Helmet } from "react-helmet-async";
import { OG_IMAGE_URL, canonicalUrl, isMarketingHostname, structuredDataFor } from "@/seo/site";

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  children?: React.ReactNode;
}

const DEFAULTS = {
  title: "Unwrapt",
  description:
    "Unwrapt helps you remember birthdays and send a gift. Thea suggests a gift, you approve the purchase, and it ships in the United States.",
};

const SEOHead = ({
  title,
  description = DEFAULTS.description,
  path,
  canonical,
  ogImage = OG_IMAGE_URL,
  ogType = "website",
  noindex = false,
  children,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | Unwrapt` : DEFAULTS.title;
  const href = canonical ?? (path ? canonicalUrl(path) : undefined);
  const marketingDocument = typeof window === "undefined" || isMarketingHostname(window.location.hostname);
  const robots = noindex || !marketingDocument ? "noindex, nofollow" : "index, follow";
  const jsonLd = !noindex && marketingDocument && path ? structuredDataFor(path) : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      {href && <link rel="canonical" href={href} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Unwrapt" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content="Thea, Unwrapt's gifting assistant" />
      {href && <meta property="og:url" content={href} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
      {children}
    </Helmet>
  );
};

export default SEOHead;
