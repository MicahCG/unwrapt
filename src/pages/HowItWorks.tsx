import { Link } from "react-router-dom";
import SEOHead from "@/components/seo/SEOHead";
import { PublicChrome, RelatedLinks, UpdatedLine } from "@/components/marketing/PublicChrome";
import { APP_ORIGIN, PUBLIC_CONTENT_UPDATED, PUBLIC_CONTENT_UPDATED_LABEL, VIP_WEB_PRICE_LABEL } from "@/seo/site";

const steps = [
  {
    title: "Save the person and the date",
    body: "Add someone by name and tell Unwrapt the birthday or other date you want remembered. You can type it in. Connecting a calendar is optional, and you choose which people to keep.",
  },
  {
    title: "Thea suggests a gift",
    body: "Thea is Unwrapt's assistant. She uses what you saved, including interests if you added them, and suggests a gift from the catalog. Orders go through Goody, the fulfillment partner. A suggestion can be unavailable, and it is not a promise that the gift will suit every person.",
  },
  {
    title: "You approve before the purchase",
    body: "New accounts ask first. Thea shows the gift and the price, and nothing is purchased until you say yes. In Settings you can change that and let her approve gifts under $100 or under $250. The price you see is the item cost. The Terms say Unwrapt does not mark gift prices up.",
  },
  {
    title: "It ships to a United States address",
    body: "You provide a street address, city, state, and ZIP code. Unwrapt does not send a gift without that address, and it does not offer address-free delivery. Shipping is in the United States. Delivery timing depends on the fulfillment partner and the carrier, so plan ahead of the date.",
  },
];

const HowItWorks = () => (
  <PublicChrome>
    <SEOHead
      title="How Unwrapt and Thea send gifts"
      description="Yes. Unwrapt remembers occasions you save and helps send a gift. Thea suggests one, you approve it by default, and it ships to a United States street address."
      path="/how-it-works"
    />
    <article className="mx-auto max-w-3xl px-6 py-16">
      <UpdatedLine date={PUBLIC_CONTENT_UPDATED} label={PUBLIC_CONTENT_UPDATED_LABEL} />
      <h1 className="mt-4 font-serif text-4xl leading-tight text-[#3D3428] md:text-5xl">
        Is there a service that remembers birthdays and helps send gifts?
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-[#3D3428]">
        Yes. Unwrapt is that service for people who want a birthday, anniversary, or other date handled before it becomes a last-minute errand. You tell it who matters. Thea remembers the date, suggests a gift, and, by default, waits for your approval before the purchase. The gift then ships to a street address in the United States.
      </p>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        The membership that opens the gift inbox is Unwrapt VIP at {VIP_WEB_PRICE_LABEL} per month on the web. The gift itself is a separate charge. Details are on the{" "}
        <Link to="/pricing" className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
          pricing page
        </Link>
        .
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">Who it is for</h2>
      <p className="mt-4 leading-relaxed text-[#6B5D4D]">
        Unwrapt is for someone keeping track of family, friends, and a few other people they do not want to forget. It is a concierge for those personal occasions, operated by KinGira LLC in Texas. It is not a same-day delivery service, and it is not a catalog you browse without an account.
      </p>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">What happens, step by step</h2>
      <ol className="mt-6 space-y-8">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-[#E8DCC8] bg-[#FFFBF5] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8B7355]">Step {index + 1}</p>
            <h3 className="mt-2 font-serif text-2xl text-[#3D3428]">{step.title}</h3>
            <p className="mt-3 leading-relaxed text-[#6B5D4D]">{step.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-serif text-3xl text-[#3D3428]">What Unwrapt does not promise</h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-[#6B5D4D]">
        <li>It does not ship without a street address.</li>
        <li>It does not promise instant or overnight delivery.</li>
        <li>It does not promise a gift will arrive on the morning of the occasion. Leave lead time for packing and the carrier.</li>
        <li>It does not publish international shipping.</li>
        <li>Thea can be wrong or the item can be unavailable. You can skip a suggestion.</li>
      </ul>

      <p className="mt-10">
        <a
          href={APP_ORIGIN}
          className="inline-flex rounded-full bg-[#8B7355] px-6 py-3 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D3428]"
        >
          Continue at app.unwrapt.io
        </a>
      </p>
      <RelatedLinks
        links={[
          { href: "/pricing", label: "How much Unwrapt costs" },
          { href: "/faq", label: "Common questions" },
          { href: "/guides/never-forget-birthdays", label: "How to stop forgetting birthdays" },
          { href: "/terms", label: "Terms of Service" },
        ]}
      />
    </article>
  </PublicChrome>
);

export default HowItWorks;
