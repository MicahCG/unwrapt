import { ArrowRight } from "lucide-react";
import PaperDust from "@/components/landing/PaperDust";
import { TheaFigure } from "@/components/unwrapt2/TheaFigure";
import { APP_ORIGIN } from "@/seo/site";

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
      <div className="relative z-10 mx-auto w-full max-w-[720px]">
        <div className="flex flex-col items-center text-center">
          <p className="mb-6 font-serif text-3xl tracking-tight text-[#3D3428] sm:text-4xl md:text-5xl">
            Unwrapt
          </p>
          <h1 className="mb-6 font-serif text-5xl leading-[1.02] tracking-tight text-[#3D3428] sm:text-6xl md:text-7xl">
            Never miss
            <br />
            <span className="text-[#8B7355]">a moment</span>
          </h1>
          <p className="mb-10 flex max-w-md items-center gap-3 text-left text-base text-[#6B5D4D] md:text-lg">
            <span
              aria-hidden="true"
              className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#E8DCC8] bg-[#F3E7D3]"
            >
              <TheaFigure framing="portrait" pose="welcome" animated={false} style={{ width: "100%", height: "100%" }} />
            </span>
            Meet Thea, your gifting assistant.
          </p>
          <a
            href={APP_ORIGIN}
            onClick={onCtaClick}
            className="mb-14 rounded-full bg-[#8B7355] px-12 py-4 text-lg font-medium text-white shadow-[0_8px_32px_rgba(139,115,85,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3D3428]"
          >
            Get started
            <ArrowRight className="ml-2 inline h-5 w-5" aria-hidden="true" />
          </a>
          <a
            href="#journey"
            className="text-xs uppercase tracking-[0.28em] text-[#8B7355] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B7355]"
          >
            Scroll
          </a>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
