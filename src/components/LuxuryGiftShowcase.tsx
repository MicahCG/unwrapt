import React from "react";
import { motion } from "framer-motion";
import artisanCrafts from "@/assets/artisan-crafts.png";
import glazedPottery from "@/assets/glazed-pottery.png";
import castIronTeapot from "@/assets/cast-iron-teapot.png";

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
    subcopy:
      "Items chosen for beauty, story, and meaning. Not mass appeal.",
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
  return (
    <section className="py-32 px-6" style={{ backgroundColor: "#F8F1E6" }}>
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.35em] mb-4" style={{ color: "#B59A77" }}>
            Our Collection
          </p>
          <h2 className="font-serif text-4xl md:text-5xl mb-4" style={{ color: "#3D3428" }}>
            A Curated Collection of
            <br />
            Extraordinary Gifts
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: "#6B5D4D" }}>
            Handpicked. Artisan-made. Impossible to mass-produce.
          </p>
        </div>

        {/* Staggered Grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.id}
              className={`relative overflow-hidden rounded-2xl group cursor-pointer ${tile.span} ${tile.height}`}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              {/* Image */}
              <div className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105">
                <img
                  src={tile.image}
                  alt={tile.headline}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

              {/* Gold Border on Hover */}
              <div
                className="absolute inset-0 border-2 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ borderColor: "#D4AF7A" }}
              />

              {/* Gold Accent Line */}
              <div
                className="absolute bottom-28 left-8 w-12 h-0.5"
                style={{ backgroundColor: "#D4AF7A" }}
              />

              {/* Text Content */}
              <div className="absolute bottom-0 left-0 right-0 p-7 md:p-8 text-white transition-transform duration-300 group-hover:-translate-y-2">
                <h3 className="font-serif text-xl md:text-2xl mb-2 leading-snug">
                  {tile.headline}
                </h3>
                <p className="text-sm text-white/85 leading-relaxed max-w-lg">
                  {tile.subcopy}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LuxuryGiftShowcase;
