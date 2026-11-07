import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_ORIGIN, VIP_WEB_PRICE_LABEL } from "@/seo/site";

const included = [
  "Thea suggests gifts for dates you save",
  "You approve the purchase by default",
  "Gift price shown before you pay",
  "Ships to a street address in the United States",
];

type PricingSectionProps = {
  onCtaClick?: () => void;
};

const PricingSection = ({ onCtaClick }: PricingSectionProps) => {
  return (
    <section id="pricing" className="scroll-mt-20 px-6 py-28" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-10 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-[#8B7355]">Pricing</p>
          <h2 className="mb-4 font-serif text-4xl tracking-tight text-[#3D3428] md:text-5xl">
            {VIP_WEB_PRICE_LABEL} a month, plus the gift
          </h2>
          <p className="text-base text-[#6B5D4D]">
            Unwrapt VIP is the web membership. It is not a free plan, and it does not include the price of the gift.
          </p>
        </div>

        <div className="rounded-2xl border border-[#D2B887] bg-[#FFFBF5] p-8">
          <h3 className="font-serif text-2xl text-[#3D3428]">VIP</h3>
          <p className="mb-6 mt-1 text-sm text-[#6B5D4D]">Opens the gift inbox after you subscribe</p>
          <p className="mb-8">
            <span className="font-serif text-4xl text-[#3D3428]">{VIP_WEB_PRICE_LABEL}</span>
            <span className="ml-1 text-sm text-[#6B5D4D]">/ month on the web</span>
          </p>
          <ul className="mb-8 space-y-3">
            {included.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8B7355]" aria-hidden="true" />
                <span className="text-sm text-[#3D3428]">{feature}</span>
              </li>
            ))}
          </ul>
          <a
            href={APP_ORIGIN}
            onClick={onCtaClick}
            className="block w-full rounded-full bg-[#8B7355] py-3 text-center text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D3428]"
          >
            Continue at app.unwrapt.io
          </a>
          <p className="mt-4 text-center text-sm">
            <Link to="/pricing" className="text-[#3D3428] underline decoration-[#D2B887] underline-offset-4">
              Full pricing details
            </Link>
          </p>
        </div>
        <p className="mt-8 text-center text-sm text-[#6B5D4D]">
          The iOS app shows Apple&apos;s price before you subscribe. Cancel from Settings. See the Terms for billing.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
