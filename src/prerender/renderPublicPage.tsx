import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { StaticRouter } from "react-router-dom/server";
import Landing from "@/pages/Landing";
import HowItWorks from "@/pages/HowItWorks";
import PricingPage from "@/pages/PricingPage";
import FaqPage from "@/pages/FaqPage";
import NeverForgetBirthdays from "@/pages/guides/NeverForgetBirthdays";
import Privacy from "@/pages/Privacy";
import TermsOfService from "@/pages/TermsOfService";
import NotFound from "@/pages/NotFound";

const pages: Record<string, ReactElement> = {
  "/": <Landing />,
  "/how-it-works": <HowItWorks />,
  "/pricing": <PricingPage />,
  "/faq": <FaqPage />,
  "/guides/never-forget-birthdays": <NeverForgetBirthdays />,
  "/privacy": <Privacy />,
  "/terms": <TermsOfService />,
  "/404": <NotFound />,
};

export function renderPublicPage(path: string) {
  const page = pages[path];
  if (!page) throw new Error(`No prerender page for ${path}`);

  const helmetContext = {} as { helmet?: HelmetServerState };
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={path === "/404" ? "/missing" : path}>{page}</StaticRouter>
    </HelmetProvider>,
  );
  const helmet = helmetContext.helmet;
  if (!helmet) throw new Error(`Helmet did not render for ${path}`);

  return {
    html,
    title: helmet.title.toString(),
    meta: helmet.meta.toString(),
    link: helmet.link.toString(),
    script: helmet.script.toString(),
  };
}
