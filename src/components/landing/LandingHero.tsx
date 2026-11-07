import { ArrowRight } from "lucide-react";
import PaperDust from "@/components/landing/PaperDust";
import { APP_ORIGIN, VIP_WEB_PRICE_LABEL } from "@/seo/site";

type LandingHeroProps = {
  onCtaClick?: () => void;
};

const LandingHero = ({ onCtaClick }: LandingHeroProps) => {
  return (
    <section
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 pb-20 pt-28"
      style={{
        background:
          "radial-gradient(ellipse 90% 70% at 50% 35%, #FFF9F0 0%, #F8F1E6 45%, #F0E6D6 100%)",
      }}
    >
      <PaperDust density={18} />
      <div className="relative z-10 mx-auto w-full max-w-[760px]">
        <div className="flex flex-col items-center text-center">
          <p className="mb-6 font-serif text-3xl tracking-tight text-[#3D3428] sm:text-4xl md:text-5xl">
            Unwrapt
          </p>
          <h1 className="mb-6 font-serif text-5xl leading-[1.02] tracking-tight text-[#3D3428] sm:text-6xl md:text-7xl">
            Never miss
            <br />
            <span className="text-[#8B7355]">a moment</span>
          </h1>
          <p className="mb-4 max-w-xl text-base leading-relaxed text-[#3D3428] md:text-lg">
            Unwrapt is for people who want birthdays and other occasions handled before the last minute. You introduce the people who matter. Thea, the gifting assistant, remembers the dates, suggests a gift, and checks with you before it is purchased.
          </p>
          <p className="mb-10 max-w-xl text-sm leading-relaxed text-[#6B5D4D] md:text-base">
            VIP is {VIP_WEB_PRICE_LABEL} a month on the web. Gifts are priced separately and ship to a street address in the United States.
          </p>
          <a
            href={APP_ORIGIN}
            onClick={onCtaClick}
            className="mb-8 rounded-full bg-[#8B7355] px-12 py-4 text-lg font-medium text-white shadow-[0_8px_32px_rgba(139,115,85,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3D3428]"
          >
            Get started
            <ArrowRight className="ml-2 inline h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href="#journey"
            className="text-xs uppercase tracking-[0.28em] text-[#8B7355] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B7355]"
          >
            How it works
          </a>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
