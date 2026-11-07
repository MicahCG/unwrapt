import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { PublicChrome, RelatedLinks, UpdatedLine } from "@/components/marketing/PublicChrome";
import { APP_ORIGIN, PUBLIC_CONTENT_UPDATED, PUBLIC_CONTENT_UPDATED_LABEL, VIP_WEB_PRICE_LABEL } from "@/seo/site";

const PricingPage = () => (
  <PublicChrome>
    <SEOHead
      title="How much Unwrapt costs"
      description="Unwrapt VIP is $4.99 per month on the web. That membership is separate from each gift, and the gift price is shown before you approve the purchase."
      path="/pricing"
    />
    <article className="mx-auto max-w-3xl px-6 py-16">
      <UpdatedLine date={PUBLIC_CONTENT_UPDATED} label={PUBLIC_CONTENT_UPDATED_LABEL} />
      <h1 className="mt-4 font-serif text-4xl leading-tight text-[#3D3428] md:text-5xl">
        How much does a personal gifting service cost?
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[#3D3428]">
        Unwrapt VIP is {VIP_WEB_PRICE_LABEL} per month on the web. That is the membership for Thea, the gift inbox, and occasion reminders you set up. It does not include the gift. You see each gift&apos;s price before you approve the purchase, and the Terms say that price is the cost of the item without a markup.
      </p>

      <section className="mt-10 rounded-3xl border border-[#D2B887] bg-[#FFFBF5] p-8" aria-labelledby="vip-price">
        <p className="text-xs uppercase tracking-[0.25em] text-[#8B7355]">Web membership</p>
        <h2 id="vip-price" className="mt-3 font-serif text-4xl text-[#3D3428]">
          {VIP_WEB_PRICE_LABEL}
          <span className="ml-2 font-sans text-base text-[#6B5D4D]">per month</span>
        </h2>
        <p className="mt-4 leading-relaxed text-[#6B5D4D]">
          Billed monthly until you cancel. You can cancel from Settings. Cancellation takes effect at the end of the current billing period, as the Terms describe. If you subscribe in the iOS app, Apple bills that subscription and the price you confirm is Apple&apos;s, which can differ from {VIP_WEB_PRICE_LABEL}.
        </p>
        <ul className="mt-6 space-y-3 text-[#3D3428]">
          <li>Sign-in and setup, then the gift inbox after you subscribe.</li>
          <li>Thea suggests gifts for dates you save.</li>
          <li>Approval before purchase, unless you set an auto-approve limit.</li>
          <li>Shipping to a street address in the United States.</li>
        </ul>
        <a
          href={APP_ORIGIN}
          className="mt-8 inline-flex rounded-full bg-[#8B7355] px-6 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D3428]"
        >
          Continue at app.unwrapt.io
        </a>
      </section>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">The gift is a separate charge</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        There is no single gift price to quote here, because the item changes. Before a purchase, the app shows what that gift costs. You can set a budget in Settings. Default new accounts wait for approval. You can later allow Thea to approve only gifts under $100 or under $250.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        A gift wallet can hold funds used for gifts you schedule. Wallet rules, including auto-reload if you turn it on, are in the{" "}
        <Link to="/terms" className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
          Terms
        </Link>
        . This page does not restate a refund promise. Read the Terms for how refunds are handled.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">There is not a free ongoing plan</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        You can create an account and introduce people during setup. The dashboard and gift inbox stay closed until VIP is active. If you have seen a &quot;free plan, 3 recipients&quot; offer, or a membership price of $24.99, that copy is out of date. The price in the app today is {VIP_WEB_PRICE_LABEL} per month on the web.
      </p>

      <RelatedLinks
        links={[
          { href: "/how-it-works", label: "How the service works" },
          { href: "/faq", label: "Common questions" },
          { href: "/guides/never-forget-birthdays", label: "A birthday-planning guide" },
          { href: "/terms", label: "Billing terms" },
        ]}
      />
    </article>
  </PublicChrome>
);

export default PricingPage;
