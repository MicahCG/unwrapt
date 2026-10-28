import React, { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import artisanCrafts from "@/assets/artisan-crafts.png";
import glazedPottery from "@/assets/glazed-pottery.png";
import castIronTeapot from "@/assets/cast-iron-teapot.png";

const softEase = [0.22, 1, 0.36, 1] as const;

/**
 * Socialme-inspired occasion "portal": one rounded media stage
 * with parallax layers + trust line inside the portal.
 * Optional spring poke on a foreground ornament — not Matter.js.
 */
const OccasionPortal: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [poke, setPoke] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 28 });
  const bgY = useTransform(smooth, [0, 1], reduceMotion ? [0, 0] : ["8%", "-8%"]);
  const midY = useTransform(smooth, [0, 1], reduceMotion ? [0, 0] : ["4%", "-4%"]);
  const fgY = useTransform(smooth, [0, 1], reduceMotion ? [0, 0] : ["0%", "-10%"]);

  return (
    <section
      ref={ref}
      id="occasions"
      className="relative px-6 py-24 md:py-32"
      style={{ backgroundColor: "#F7F1E6" }}
    >
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
          Moments that matter
        </p>
        <h2 className="font-serif text-4xl md:text-5xl" style={{ color: "#3D3428" }}>
          Occasions, held with care
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base" style={{ color: "#6B5D4D" }}>
          Birthdays, anniversaries, client milestones — remembered quietly,
          gifted thoughtfully.
        </p>
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div
          className="relative overflow-hidden rounded-[28px] md:rounded-[36px]"
          style={{
            aspectRatio: "16 / 10",
            boxShadow: "0 28px 80px rgba(75, 59, 42, 0.14)",
          }}
        >
          {/* Parallax layers */}
          <motion.img
            src={artisanCrafts}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-[120%] w-full object-cover"
            style={{ y: bgY, top: "-10%" }}
          />
          <motion.img
            src={glazedPottery}
            alt=""
            aria-hidden="true"
            className="absolute -right-[8%] bottom-[-6%] h-[70%] w-[48%] object-cover opacity-90"
            style={{
              y: midY,
              maskImage: "linear-gradient(90deg, transparent, black 35%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 35%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(115deg, rgba(61,52,40,0.55) 0%, rgba(61,52,40,0.15) 45%, rgba(61,52,40,0.35) 100%)",
            }}
          />

          {/* Foreground ribbon ornament — spring poke */}
          <motion.button
            type="button"
            aria-label="Nudge the ornament"
            className="absolute right-[12%] top-[18%] z-10 hidden h-16 w-16 rounded-full border border-white/30 bg-[#D4AF7A]/90 shadow-lg backdrop-blur-sm md:block"
            style={{ y: fgY }}
            animate={
              reduceMotion
                ? undefined
                : { scale: 1 + poke * 0.08, rotate: poke * 12 }
            }
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            onClick={() => {
              setPoke(1);
              window.setTimeout(() => setPoke(0), 420);
            }}
          >
            <span className="sr-only">Ornament</span>
            <svg viewBox="0 0 64 64" className="h-full w-full p-3" aria-hidden="true">
              <path
                d="M32 10c-6 8-14 12-14 22a14 14 0 0028 0c0-10-8-14-14-22z"
                fill="#F8F1E6"
                opacity="0.95"
              />
            </svg>
          </motion.button>

          <motion.img
            src={castIronTeapot}
            alt="Artisan gift moment"
            className="absolute bottom-[-4%] left-[6%] z-[1] hidden w-[34%] max-w-[280px] object-contain drop-shadow-2xl md:block"
            style={{ y: fgY }}
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: softEase }}
            viewport={{ once: true, amount: 0.4 }}
          />

          {/* Copy inside portal */}
          <div className="absolute inset-0 z-[2] flex flex-col justify-end p-8 md:p-12">
            <p className="mb-2 font-serif text-3xl text-white md:text-4xl max-w-md leading-tight">
              Little moments, kept.
            </p>
            <p className="mb-8 max-w-sm text-sm text-white/80 md:text-base">
              From quiet birthdays to the clients you cannot forget — Unwrapt
              holds the calendar so you can hold the relationship.
            </p>

            {/* Trust strip inside portal */}
            <div
              className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-white/25 pt-5 text-xs tracking-wide text-white/85"
            >
              <span>You approve every send</span>
              <span className="hidden sm:inline opacity-40">·</span>
              <span>Premium gifts, never generic</span>
              <span className="hidden sm:inline opacity-40">·</span>
              <span>On time, every time</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OccasionPortal;
