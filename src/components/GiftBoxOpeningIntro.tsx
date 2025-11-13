import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BG = "#F7F0E6";
const INNER = "#F1E3D0";
const GOLD = "#D4AF7A";
const BROWN = "#5B4633";

export default function GiftBoxOpeningIntro() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2100);
    return () => clearTimeout(timer);
  }, []);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ backgroundColor: BG }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span
                className="font-serif tracking-[0.2em] text-sm md:text-base uppercase"
                style={{ color: BROWN }}
              >
                Unwrapt
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 1.6 }}
          style={{ backgroundColor: BG }}
        >
          {/* Nested rectangles */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Outer frame */}
            <motion.div
              className="absolute rounded-[32px]"
              style={{
                border: `16px solid ${GOLD}`,
                backgroundColor: INNER,
                width: "120vw",
                height: "120vh",
              }}
              initial={{ scale: 1.2, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />

            {/* Middle frame */}
            <motion.div
              className="absolute rounded-[24px]"
              style={{
                border: `12px solid ${GOLD}`,
                backgroundColor: BG,
                width: "80vw",
                height: "70vh",
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            />

            {/* Collapsing box - last "lid" */}
            <motion.div
              className="absolute rounded-[18px]"
              style={{
                border: `8px solid ${GOLD}`,
                backgroundColor: INNER,
                width: "40vw",
                height: "32vh",
              }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
            />

            {/* Final collapse to center */}
            <motion.div
              className="absolute rounded-[16px]"
              style={{
                border: `4px solid ${GOLD}`,
                backgroundColor: INNER,
                width: "40vw",
                height: "32vh",
              }}
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0.02, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.9 }}
            />

            {/* Unwrapt wordmark in center */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
              className="relative z-10"
            >
              <span
                className="font-serif tracking-[0.2em] text-sm md:text-base uppercase"
                style={{ color: BROWN }}
              >
                Unwrapt
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
