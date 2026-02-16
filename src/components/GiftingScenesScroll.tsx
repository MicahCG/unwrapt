import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Sparkles, Users } from "lucide-react";

type SceneId = "remember" | "thoughtful" | "relationships";

type Scene = {
  id: SceneId;
  icon: React.ElementType;
  heading: string;
  body: string;
  cards: { label: string; detail: string }[];
};

const scenes: Scene[] = [
  {
    id: "remember",
    icon: Calendar,
    heading: "Never Forget Another Occasion",
    body: "Birthdays, anniversaries, holidays and milestones are all tracked for you so every important moment gets a gesture, not a scramble.",
    cards: [
      { label: "Key dates, remembered", detail: "Sync your calendar once. We track every occasion, every year." },
      { label: "Calendar and contacts in sync", detail: "Drop in birthdays and anniversaries once. We keep them warm year after year." },
      { label: "No last minute rush", detail: "Gifts are prepared weeks in advance, so you're always ahead." },
    ],
  },
  {
    id: "thoughtful",
    icon: Sparkles,
    heading: "Gifts, Automatically Chosen",
    body: "Our team curates gifts that match each person's interests, preferences and relationship to you so every send feels personal and on brand.",
    cards: [
      { label: "Curated for their taste", detail: "Each recipient gets gifts chosen for their personality and interests." },
      { label: "Handpicked curation", detail: "Every item is hand-selected by our team. Not an algorithm." },
      { label: "Always feels considered", detail: "Rare, artisan-made pieces that show you put in the thought." },
    ],
  },
  {
    id: "relationships",
    icon: Users,
    heading: "Perfect for Clients, Teams and Loved Ones",
    body: "Nurture client accounts, reward teams and show up for family with consistent, well timed gifting handled quietly in the background.",
    cards: [
      { label: "Clients that feel seen", detail: "Turn touchpoints into a rhythm of appreciation." },
      { label: "Client and team gifting", detail: "Relationships feel steady and intentional at every level." },
      { label: "Stronger long term ties", detail: "Consistent gestures build loyalty that lasts." },
    ],
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
      { root: null, threshold: [0.25, 0.5, 0.75] },
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeScene = scenes.find((scene) => scene.id === activeId) ?? scenes[0];

  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "#F7F1E6" }}>
      <div
        ref={containerRef}
        className="mx-auto flex max-w-6xl flex-col gap-16 px-6 md:px-8 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        {/* Left: Sticky copy area */}
        <div className="lg:sticky lg:top-24 lg:h-[70vh] flex items-center">
          <div className="space-y-8">
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "#B59A77" }}>
              Why busy professionals use Unwrapt
            </p>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-5"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F0E4D2", border: "1px solid #E8DCC8" }}>
                  <activeScene.icon className="w-5 h-5" style={{ color: "#8B7355" }} />
                </div>

                <h2 className="text-2xl md:text-3xl font-serif" style={{ color: "#3D3428" }}>
                  {activeScene.heading}
                </h2>

                <p className="text-base md:text-lg leading-relaxed" style={{ color: "#6B5D4D" }}>
                  {activeScene.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Scrollable cards */}
        <div className="space-y-24 lg:space-y-32">
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              ref={(el) => (itemRefs.current[index] = el)}
              data-scene-id={scene.id}
              className="min-h-[80vh] flex items-center"
            >
              <motion.div
                className="w-full space-y-4"
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                viewport={{ once: true, amount: 0.3 }}
              >
                {scene.cards.map((card, ci) => (
                  <motion.div
                    key={ci}
                    className="rounded-2xl p-6 md:p-8"
                    style={{
                      backgroundColor: ci === 1 ? "#EDE2D0" : "#F3EBDC",
                      border: "1px solid #E8DCC8",
                    }}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: ci * 0.1, ease: "easeOut" }}
                    viewport={{ once: true }}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#B59A77" }}>
                      {card.label}
                    </p>
                    <p className="text-sm md:text-base leading-relaxed" style={{ color: "#4B3B2A" }}>
                      {card.detail}
                    </p>
                  </motion.div>
                ))}

                <div className="pt-2 text-xs" style={{ color: "#B59A77" }}>
                  Scene {index + 1} of {scenes.length}
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
