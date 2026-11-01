import React from "react";
import { ArrowRight } from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { TheaCharacter } from "@/components/unwrapt2/TheaCharacter";

const softEase = [0.22, 1, 0.36, 1] as const;

type FinalCtaProps = {
  primaryCta: string;
  onGetStarted: () => void;
};

const FinalCta: React.FC<FinalCtaProps> = ({ primaryCta, onGetStarted }) => {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduceMotion = useReducedMotion();

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-6 py-24 md:py-32"
      style={{ backgroundColor: "#F8F1E6" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row md:gap-16">
        <motion.div
          className="relative flex w-full max-w-[340px] shrink-0 items-end justify-center md:w-[40%]"
          initial={reduceMotion ? false : { opacity: 0, x: -32 }}
          animate={inView ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.8, ease: softEase }}
        >
          <div
            className="absolute bottom-0 left-1/2 aspect-square w-[88%] -translate-x-1/2 rounded-full"
            style={{ background: "radial-gradient(circle at 50% 40%, #FFF9F0 0%, #F3E7D3 62%, rgba(240,230,214,0) 72%)" }}
            aria-hidden="true"
          />
          <div className="relative w-full pt-16">
            <TheaCharacter
              size="large"
              className="u-thea-character--landing"
              animated={!reduceMotion}
              pose={inView ? "welcome" : "basic"}
              reaction={inView ? "sparkle" : null}
              bubble="I've got it from here"
              speaking={inView}
            />
          </div>
        </motion.div>

        <motion.div
          className="w-full max-w-xl text-center md:text-left"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8, delay: 0.12, ease: softEase }}
        >
          <p className="mb-6 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
            Ready?
          </p>
          <h2 className="mb-6 font-serif text-4xl leading-[1.08] md:text-5xl" style={{ color: "#3D3428" }}>
            Never miss
            <br />
            <span style={{ color: "#8B7355" }}>another moment.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-md text-base md:mx-0 md:text-lg" style={{ color: "#6B5D4D" }}>
            Add your people, connect your calendar, and let Thea handle the rest.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className="group rounded-full px-12 py-4 text-lg font-medium text-white transition-transform duration-500 hover:-translate-y-0.5 active:scale-[0.97]"
            style={{
              backgroundColor: "#8B7355",
              boxShadow: "0 8px 32px rgba(139, 115, 85, 0.25)",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {primaryCta}{" "}
            <ArrowRight className="ml-2 inline h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCta;
