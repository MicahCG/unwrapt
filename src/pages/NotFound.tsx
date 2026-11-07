import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { PublicChrome } from "@/components/marketing/PublicChrome";

const NotFound = () => {
  return (
    <PublicChrome>
      <SEOHead
        noindex
        title="Page not found"
        description="That address is not a page on Unwrapt."
      />
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-serif text-5xl text-[#3D3428]">Page not found</h1>
        <p className="mt-4 text-lg text-[#6B5D4D]">
          That URL is not a public page. If you were opening a gift, sign-in, or settings link, start from the app.
        </p>
        <ul className="mt-8 space-y-3 text-[#3D3428]">
          <li>
            <Link to="/" className="underline decoration-[#D2B887] underline-offset-4">
              Home
            </Link>
          </li>
          <li>
            <Link to="/how-it-works" className="underline decoration-[#D2B887] underline-offset-4">
              How it works
            </Link>
          </li>
          <li>
            <Link to="/pricing" className="underline decoration-[#D2B887] underline-offset-4">
              Pricing
            </Link>
          </li>
          <li>
            <a href="https://app.unwrapt.io/" className="underline decoration-[#D2B887] underline-offset-4">
              app.unwrapt.io
            </a>
          </li>
        </ul>
      </div>
    </PublicChrome>
  );
};

export default NotFound;
