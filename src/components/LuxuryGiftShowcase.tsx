import React, { useState } from "react";
import { motion } from "framer-motion";
import artisanCrafts from "@/assets/artisan-crafts.png";
import glazedPottery from "@/assets/glazed-pottery.png";
import castIronTeapot from "@/assets/cast-iron-teapot.png";

const LuxuryGiftShowcase = () => {
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);

  const tiles = [
    {
      id: 1,
      image: artisanCrafts,
      headline: "Artisan-Made, One Piece at a Time",
      subcopy:
        "Every gift in Unwrapt's collection is sourced from small workshops and makers — never factories. Hand-finished, hand-polished, and created with intention.",
    },
    {
      id: 2,
      image: glazedPottery,
      headline: "Curated With Taste, Not Algorithms",
      subcopy:
        "Our team selects pieces you won't find on Amazon. Items chosen for beauty, story, and meaning, not for mass appeal.",
    },
    {
      id: 3,
      image: castIronTeapot,
      headline: "Gifts That Feel Personal, Rare, and Memorable",
      subcopy:
        "From limited-run pottery to handcrafted incense burners, each item is chosen to make the recipient feel truly seen.",
    },
  ];

  return (
    <section className="py-32 px-6 bg-[hsl(var(--champagne))]">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl text-[hsl(var(--espresso))] mb-4">
            A Curated Collection of Extraordinary Gifts
          </h2>
          <p className="text-lg text-[hsl(var(--charcoal-body))]">
            Handpicked. Artisan-made. Impossible to mass-produce.
          </p>
        </div>

        {/* Tiles Grid */}
        <div className="grid md:grid-cols-1 gap-8">
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.id}
              className="relative overflow-hidden rounded-2xl group cursor-pointer"
              style={{ height: "400px" }}
              onHoverStart={() => setHoveredTile(index)}
              onHoverEnd={() => setHoveredTile(null)}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* Image with Parallax */}
              <motion.div
                className="absolute inset-0 w-full h-full"
                animate={{
                  scale: hoveredTile === index ? 1.08 : 1,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <img
                  src={tile.image}
                  alt={tile.headline}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {/* Gold Border on Hover */}
              <motion.div
                className="absolute inset-0 border-2 rounded-2xl pointer-events-none"
                style={{ borderColor: "hsl(var(--soft-gold))" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: hoveredTile === index ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              {/* Gold Accent Line */}
              <div
                className="absolute bottom-32 left-8 w-16 h-0.5"
                style={{ backgroundColor: "hsl(var(--soft-gold))" }}
              />

              {/* Text Content */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-8 text-white"
                animate={{
                  y: hoveredTile === index ? -10 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <h3 className="font-serif text-2xl md:text-3xl mb-3">
                  {tile.headline}
                </h3>
                <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-2xl">
                  {tile.subcopy}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LuxuryGiftShowcase;
