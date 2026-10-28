import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import artisanCrafts from "@/assets/artisan-crafts.png";
import glazedPottery from "@/assets/glazed-pottery.png";
import castIronTeapot from "@/assets/cast-iron-teapot.png";

const softEase = [0.22, 1, 0.36, 1] as const;

const tiles = [
  {
    id: 1,
    image: artisanCrafts,
    headline: "Artisan-Made, One Piece at a Time",
    subcopy:
      "Every gift in Unwrapt's collection is sourced from small workshops and makers. Hand-finished, hand-polished, and created with intention.",
    span: "md:col-span-2",
    height: "h-[400px] md:h-[480px]",
  },
  {
    id: 2,
    image: glazedPottery,
    headline: "Curated With Taste, Not Algorithms",
    subcopy: "Items chosen for beauty, story, and meaning. Not mass appeal.",
    span: "md:col-span-1",
    height: "h-[400px] md:h-[480px]",
  },
  {
    id: 3,
    image: castIronTeapot,
    headline: "Gifts That Feel Personal, Rare, and Memorable",
    subcopy:
      "From limited-run pottery to handcrafted incense burners, each item is chosen to make the recipient feel truly seen.",
    span: "md:col-span-3",
    height: "h-[360px] md:h-[400px]",
  },
];

const LuxuryGiftShowcase = () => {
  const [featured, setFeatured] = useState(1);
  const reduceMotion = useReducedMotion();

  return (
    <section className="px-6 py-32" style={{ backgroundColor: "#F8F1E6" }} id="collection">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.35em]" style={{ color: "#B59A77" }}>
            Our Collection
          </p>
          <h2 className="mb-4 font-serif text-4xl md:text-5xl" style={{ color: "#3D3428" }}>
            Beyond the ordinary gift
          </h2>
          <p className="mx-auto max-w-md text-base" style={{ color: "#6B5D4D" }}>
            Handpicked. Artisan-made. Impossible to mass-produce.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3" style={{ perspective: 1200 }}>
          {tiles.map((tile, index) => {
            const isFeatured = featured === tile.id;
            return (
              <motion.div
                key={tile.id}
                className={`relative cursor-pointer overflow-hidden rounded-2xl group ${tile.span} ${tile.height}`}
                onMouseEnter={() => setFeatured(tile.id)}
                onFocus={() => setFeatured(tile.id)}
                tabIndex={0}
                initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: index * 0.08, ease: softEase }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        scale: isFeatured ? 1.02 : 0.985,
                        zIndex: isFeatured ? 2 : 1,
                        rotateX: isFeatured ? -2 : 0,
                        rotateY: isFeatured ? 3 : 0,
                      }
                }
                style={{
                  transformStyle: "preserve-3d",
                  boxShadow: isFeatured
                    ? "0 28px 64px rgba(75, 59, 42, 0.22)"
                    : "0 8px 28px rgba(75, 59, 42, 0.08)",
                }}
              >
                <div
                  className="absolute inset-0 h-full w-full transition-transform duration-700"
                  style={{
                    transform: isFeatured && !reduceMotion ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  <img
                    src={tile.image}
                    alt={tile.headline}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2 transition-opacity duration-300"
                  style={{
                    borderColor: "#D4AF7A",
                    opacity: isFeatured ? 1 : 0,
                  }}
                />

                <div
                  className="absolute bottom-28 left-8 h-0.5 w-12"
                  style={{ backgroundColor: "#D4AF7A" }}
                />

                <div
                  className="absolute bottom-0 left-0 right-0 p-7 text-white transition-transform duration-500 md:p-8"
                  style={{
                    transform:
                      isFeatured && !reduceMotion ? "translateY(-6px)" : "translateY(0)",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                >
                  <h3 className="mb-2 font-serif text-xl leading-snug md:text-2xl">
                    {tile.headline}
                  </h3>
                  <p className="max-w-lg text-sm leading-relaxed text-white/85">
                    {tile.subcopy}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LuxuryGiftShowcase;
