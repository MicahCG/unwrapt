// components/GiftingScenesScroll.tsx
// Scroll story section that replaces the three column "Never Forget / Thoughtful / Perfect for Clients" block

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type SceneId = "remember" | "thoughtful" | "relationships";

type Scene = {
  id: SceneId;
  keyword: string;
  heading: string;
  body: string;
};

const scenes: Scene[] = [
  {
    id: "remember",
    keyword: "Remember",
    heading: "Never Forget Another Occasion",
    body: "Birthdays, anniversaries, holidays and milestones are all tracked for you so every important moment gets a gesture, not a scramble.",
  },
  {
    id: "thoughtful",
    keyword: "Thoughtful",
    heading: "Gifts, Automatically Chosen",
    body: "Our AI curates gifts that match each person's interests, preferences and relationship to you so every send feels personal and on brand.",
  },
  {
    id: "relationships",
    keyword: "Relationships",
    heading: "Perfect for Clients, Teams and Loved Ones",
    body: "Nurture client accounts, reward teams and show up for family with consistent, well timed gifting handled quietly in the background.",
  },
];

const GiftingScenesScroll: React.FC = () => {
  const [activeId, setActiveId] = useState<SceneId>("remember");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]) {
          const id = visibleEntries[0].target.getAttribute("data-scene-id") as SceneId | null;
          if (id && id !== activeId) {
            setActiveId(id);
          }
        }
      },
      {
        root: null,
        threshold: [0.25, 0.5, 0.75],
      },
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeScene = scenes.find((scene) => scene.id === activeId) ?? scenes[0];

  return (
    <section className="bg-[#F7F1E6] py-24 lg:py-32">
      <div
        ref={containerRef}
        className="mx-auto flex max-w-6xl flex-col gap-16 px-6 md:px-8 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        {/* Left: Sticky copy area */}
        <div className="lg:sticky lg:top-24 lg:h-[70vh] flex items-center">
          <div className="space-y-8">
            <p className="text-sm uppercase tracking-[0.25em] text-[#B59A77]">Why busy professionals use Unwrapt</p>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-4"
              >
                <span className="text-3xl md:text-4xl font-serif text-[#E0D2BD]">{activeScene.keyword}</span>

                <h2 className="text-2xl md:text-3xl font-serif text-[#4B3B2A]">{activeScene.heading}</h2>

                <p className="text-base md:text-lg leading-relaxed text-[#6C5840]">{activeScene.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Scrollable image layout */}
        <div className="space-y-24 lg:space-y-32">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              ref={(el) => (itemRefs.current[index] = el)}
              data-scene-id={scene.id}
              className="h-[80vh] md:h-[90vh] flex items-center"
            >
              <motion.div
                className="relative grid w-full grid-cols-2 gap-6 md:grid-cols-3"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                viewport={{ once: true, amount: 0.3 }}
              >
                {/* Top left card */}
                <div className="col-span-1 row-span-1">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#F0E4D2] shadow-sm">
                    <div className="flex h-full items-end justify-start p-4">
                      <p className="text-xs font-medium tracking-wide text-[#6C5840]">
                        {scene.id === "remember" && "Key dates, remembered"}
                        {scene.id === "thoughtful" && "Curated for their taste"}
                        {scene.id === "relationships" && "Clients that feel seen"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Center large card */}
                <div className="col-span-1 row-span-2 md:col-span-2">
                  <div className="aspect-[5/4] overflow-hidden rounded-3xl bg-[#E8D6BE] shadow-md">
                    <div className="flex h-full items-end justify-between p-5 md:p-6">
                      <div className="max-w-xs space-y-1">
                        <p className="text-xs uppercase tracking-[0.15em] text-[#B59A77]">
                          {scene.id === "remember" && "Calendar and contacts in sync"}
                          {scene.id === "thoughtful" && "AI powered curation"}
                          {scene.id === "relationships" && "Client and team gifting"}
                        </p>
                        <p className="text-sm md:text-base text-[#4B3B2A]">
                          {scene.id === "remember" &&
                            "Drop in birthdays and anniversaries once. We keep them warm year after year."}
                          {scene.id === "thoughtful" &&
                            "Each recipient gets gifts that fit their life, not a generic hamper."}
                          {scene.id === "relationships" &&
                            "Turn touchpoints into a rhythm so relationships feel steady and intentional."}
                        </p>
                      </div>
                      <div className="hidden md:block text-xs text-[#6C5840]">
                        <span>
                          Scene {index + 1} of {scenes.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom right card */}
                <div className="col-span-1 row-span-1 md:self-end">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-[#F3EBDC] shadow-sm">
                    <div className="flex h-full items-center justify-center">
                      <span className="text-sm font-serif text-[#B59A77]">
                        {scene.id === "remember" && "No last minute rush"}
                        {scene.id === "thoughtful" && "Always feels considered"}
                        {scene.id === "relationships" && "Stronger long term ties"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GiftingScenesScroll;
