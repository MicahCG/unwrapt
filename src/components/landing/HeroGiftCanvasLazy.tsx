import React, { lazy, Suspense } from "react";
import giftPoster from "@/assets/unwrapt-gift-box.png";
import type { HeroGiftCanvasProps } from "@/components/landing/HeroGiftCanvas";

const HeroGiftCanvas = lazy(() => import("@/components/landing/HeroGiftCanvas"));

/** Defers R3F until after first paint; shows gift poster as LCP-friendly shell. */
const HeroGiftCanvasLazy: React.FC<HeroGiftCanvasProps> = (props) => {
  if (props.forcePoster) {
    return (
      <div className={`relative overflow-hidden ${props.className ?? ""}`}>
        <img
          src={giftPoster}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain object-center"
        />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className={`relative overflow-hidden ${props.className ?? ""}`}>
          <img
            src={giftPoster}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain object-center"
          />
        </div>
      }
    >
      <HeroGiftCanvas {...props} />
    </Suspense>
  );
};

export default HeroGiftCanvasLazy;
