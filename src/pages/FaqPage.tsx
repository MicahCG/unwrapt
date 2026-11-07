import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { PublicChrome, RelatedLinks, UpdatedLine } from "@/components/marketing/PublicChrome";
import { FAQS } from "@/content/faqs";
import { APP_ORIGIN, PUBLIC_CONTENT_UPDATED, PUBLIC_CONTENT_UPDATED_LABEL } from "@/seo/site";

const FaqPage = () => (
  <PublicChrome>
    <SEOHead
      title="Questions about Unwrapt"
      description="Answers about delivery, approval before a gift is purchased, the $4.99 web membership, cancellation, and what Thea does with dates you choose to save."
      path="/faq"
    />
    <article className="mx-auto max-w-3xl px-6 py-16">
      <UpdatedLine date={PUBLIC_CONTENT_UPDATED} label={PUBLIC_CONTENT_UPDATED_LABEL} />
      <h1 className="mt-4 font-serif text-4xl leading-tight text-[#3D3428] md:text-5xl">
        Questions about remembering birthdays and sending gifts
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[#3D3428]">
        Unwrapt is a gifting service that remembers dates you save and helps send a gift in the United States. The short version: Thea suggests the gift, you approve the purchase by default, and VIP is $4.99 a month on the web. The answers below are the longer version, checked against how the product works today.
      </p>

      <div className="mt-10 space-y-8">
        {FAQS.map((faq) => (
          <section key={faq.question} className="rounded-2xl border border-[#E8DCC8] bg-[#FFFBF5] p-6">
            <h2 className="font-serif text-2xl leading-snug text-[#3D3428]">{faq.question}</h2>
            <p className="mt-3 leading-relaxed text-[#6B5D4D]">{faq.answer}</p>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm leading-relaxed text-[#6B5D4D]">
        Calendar details are in the{" "}
        <Link to="/privacy" className="underline decoration-[#D2B887] underline-offset-4">
          Privacy Policy
        </Link>
        . Billing and cancellation are in the{" "}
        <Link to="/terms" className="underline decoration-[#D2B887] underline-offset-4">
          Terms of Service
        </Link>
        .
      </p>

      <p className="mt-8">
        <a
          href={APP_ORIGIN}
          className="inline-flex rounded-full bg-[#8B7355] px-6 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D3428]"
        >
          Continue at app.unwrapt.io
        </a>
      </p>
      <RelatedLinks
        links={[
          { href: "/how-it-works", label: "How Unwrapt works" },
          { href: "/pricing", label: "Pricing" },
          { href: "/guides/never-forget-birthdays", label: "How to stop forgetting birthdays" },
        ]}
      />
    </article>
  </PublicChrome>
);

export default FaqPage;
