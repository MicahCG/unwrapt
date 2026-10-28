import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const softEase = [0.22, 1, 0.36, 1] as const;

type FinalCtaProps = {
  primaryCta: string;
  onGetStarted: () => void;
};

const FinalCta: React.FC<FinalCtaProps> = ({ primaryCta, onGetStarted }) => {
  const ref = React.useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduceMotion = useReducedMotion();
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (inView) setDrawn(true);
  }, [inView]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-6 py-32"
      style={{ backgroundColor: "#F8F1E6" }}
    >
      <div className="relative mx-auto max-w-3xl text-center">
        {/* Ribbon draw-on — once when section enters */}
        <svg
          className="mx-auto mb-10 h-10 w-40"
          viewBox="0 0 160 40"
          fill="none"
          aria-hidden="true"
        >
          <motion.path
            d="M8 28 C40 8, 60 8, 80 22 C100 36, 120 36, 152 14"
            stroke="#D4AF7A"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0.4 }}
            animate={
              drawn
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: reduceMotion ? 1 : 0, opacity: 0.4 }
            }
            transition={{ duration: 1.1, ease: softEase }}
          />
          <motion.circle
            cx="152"
            cy="14"
            r="4"
            fill="#C9A363"
            initial={{ scale: 0 }}
            animate={drawn ? { scale: 1 } : { scale: 0 }}
            transition={{ delay: 0.85, duration: 0.35, ease: softEase }}
          />
        </svg>

        <p className="mb-6 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
          Ready?
        </p>
        <h2 className="mb-6 font-serif text-4xl md:text-5xl" style={{ color: "#3D3428" }}>
          Set the ribbon.
          <br />
          <span style={{ color: "#8B7355" }}>We&apos;ll keep it tied.</span>
        </h2>
        <p className="mx-auto mb-10 max-w-md text-base" style={{ color: "#6B5D4D" }}>
          Add your people, connect your calendar, and let Unwrapt handle the rest.
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
      </div>
    </section>
  );
};

export default FinalCta;
