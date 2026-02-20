import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  children?: React.ReactNode;
}

const DEFAULTS = {
  title: "Unwrapt - Automatic Gift Scheduling & Thoughtful Gift Ideas",
  description:
    "Never forget special occasions. Unwrapt automatically schedules and delivers personalized, premium gifts for birthdays, anniversaries, and holidays.",
  ogImage: "https://unwrapt.io/lovable-uploads/6170f25c-7f24-484e-92c6-9fb845379f79.png",
  siteUrl: "https://unwrapt.io",
};

const SEOHead = ({
  title,
  description = DEFAULTS.description,
  canonical,
  ogImage = DEFAULTS.ogImage,
  ogType = "website",
  noindex = false,
  children,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | Unwrapt` : DEFAULTS.title;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {children}
    </Helmet>
  );
};

export default SEOHead;
