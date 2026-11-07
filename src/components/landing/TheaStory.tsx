import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { TheaCharacter } from "@/components/unwrapt2/TheaCharacter";
import type { TheaPose, TheaReaction } from "@/components/unwrapt2/TheaFigure";

const softEase = [0.22, 1, 0.36, 1] as const;

type Chapter = {
  number: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  pose: TheaPose;
  reaction?: TheaReaction;
  bubble: string;
  points?: string[];
};

const chapters: Chapter[] = [
  {
    number: "01",
    eyebrow: "Your people",
    title: "Tell me who",
    accent: "matters most",
    description:
      "Family, friends, and anyone you do not want to forget. Introduce them once, with the dates and interests you actually know.",
    pose: "welcome",
    bubble: "Hi, I'm Thea!",
  },
  {
    number: "02",
    eyebrow: "Every date",
    title: "I keep track of",
    accent: "every date",
    description:
      "Birthdays and other dates you add yourself, or import if you choose to connect a calendar. Thea keeps the ones you save.",
    pose: "thinking",
    bubble: "Mom's birthday is in 3 weeks",
  },
  {
    number: "03",
    eyebrow: "The right gift",
    title: "I find something",
    accent: "they'll actually love",
    description:
      "Thea suggests a gift from the catalog. Fulfillment is through Goody. A suggestion can be unavailable, and you can skip it.",
    pose: "curious",
    reaction: "magnify",
    bubble: "Here's one idea",
  },
  {
    number: "04",
    eyebrow: "You decide",
    title: "You approve,",
    accent: "then it can ship",
    description:
      "By default Thea waits for your approval, and you see the price first. You can later allow gifts under a limit you set. Shipping is to a United States street address, not a same-day promise.",
    pose: "basic",
    reaction: "thumbsup",
    bubble: "Want me to send this?",
    points: ["You approve by default", "Price shown first", "Ships in the United States"],
  },
];

const ChapterRow: React.FC<{ chapter: Chapter; index: number }> = ({ chapter, index }) => {
  const ref = useRef<HTMLLIElement>(null);
  // Thea settles into her pose once the row is on screen, so each gesture plays when it is seen.
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduceMotion = useReducedMotion();
  const theaOnRight = index % 2 === 1;

  return (
    <li
      ref={ref}
      className={`flex flex-col items-center gap-10 md:gap-16 ${theaOnRight ? "md:flex-row-reverse" : "md:flex-row"}`}
    >
      <motion.div
        className="relative flex w-full max-w-[380px] shrink-0 items-end justify-center md:w-[44%] md:max-w-none"
        initial={false}
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
            pose={inView ? chapter.pose : "basic"}
            reaction={inView ? chapter.reaction ?? null : null}
            bubble={chapter.bubble}
            speaking={inView}
          />
        </div>
      </motion.div>

      <motion.div
        className="w-full max-w-xl text-center md:text-left"
        initial={false}
        transition={{ duration: 0.8, delay: 0.12, ease: softEase }}
      >
        <p className="mb-4 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
          <span className="font-serif text-sm tracking-[0.2em]" style={{ color: "#8B7355" }}>
            {chapter.number}
          </span>
          <span className="mx-3 opacity-50">/</span>
          {chapter.eyebrow}
        </p>
        <h3
          className="mb-5 font-serif text-4xl leading-[1.08] tracking-tight md:text-5xl"
          style={{ color: "#3D3428" }}
        >
          {chapter.title}
          <br />
          <span style={{ color: "#8B7355" }}>{chapter.accent}</span>
        </h3>
        <p
          className="mx-auto max-w-md text-base leading-relaxed md:mx-0 md:text-lg"
          style={{ color: "#6B5D4D" }}
        >
          {chapter.description}
        </p>

        {chapter.points && (
          <ul className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start">
            {chapter.points.map((point) => (
              <li
                key={point}
                className="rounded-full border px-4 py-2 text-sm"
                style={{ borderColor: "#E8DCC8", backgroundColor: "#FFFBF5", color: "#6B5D4D" }}
              >
                {point}
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </li>
  );
};

/** How it works, told by Thea: one chapter per step, alternating her side of the page. */
const TheaStory: React.FC = () => (
  <section
    id="journey"
    className="px-6 py-24 md:py-32"
    style={{ backgroundColor: "#F8F1E6" }}
  >
    <div className="mx-auto mb-20 max-w-2xl text-center md:mb-28">
      <p className="mb-4 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
        How it works
      </p>
      <h2 className="font-serif text-4xl md:text-5xl" style={{ color: "#3D3428" }}>
        Meet Thea, <span style={{ color: "#8B7355" }}>your gifting concierge</span>
      </h2>
      <p className="mt-4 text-base" style={{ color: "#6B5D4D" }}>
        <Link to="/how-it-works" className="underline decoration-[#D2B887] underline-offset-4">
          Read the full explanation
        </Link>
      </p>
    </div>

    <ol className="mx-auto flex max-w-6xl flex-col gap-24 md:gap-32">
      {chapters.map((chapter, index) => (
        <ChapterRow key={chapter.number} chapter={chapter} index={index} />
      ))}
    </ol>
  </section>
);

export default TheaStory;
