import { ArrowRight } from "lucide-react";
import { TheaCharacter } from "@/components/unwrapt2/TheaCharacter";
import { APP_ORIGIN } from "@/seo/site";

type FinalCtaProps = {
  onCtaClick?: () => void;
};

const FinalCta = ({ onCtaClick }: FinalCtaProps) => {
  return (
    <section className="px-6 py-24 md:py-32" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row md:gap-16 md:text-left">
        <div className="relative w-full max-w-[280px]">
          <TheaCharacter size="large" className="u-thea-character--landing" pose="welcome" bubble="I've got the date" />
        </div>
        <div className="max-w-xl text-center md:text-left">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-[#8B7355]">Ready?</p>
        <h2 className="mb-6 font-serif text-4xl leading-[1.08] text-[#3D3428] md:text-5xl">
          Never miss
          <br />
          <span className="text-[#8B7355]">another moment.</span>
        </h2>
        <p className="mb-10 text-base text-[#6B5D4D] md:text-lg">
          Add the people you want remembered. Thea suggests the gift, and you decide before it is purchased.
        </p>
        <a
          href={APP_ORIGIN}
          onClick={onCtaClick}
          className="inline-flex rounded-full bg-[#8B7355] px-12 py-4 text-lg font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3D3428]"
        >
          Get started
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
        </a>
        </div>
      </div>
    </section>
  );
};

export default FinalCta;
