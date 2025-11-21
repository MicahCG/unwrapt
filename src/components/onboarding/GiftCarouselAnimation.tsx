import { useState, useEffect } from "react";
import { useShopifyCollection } from "@/hooks/useShopifyCollection";
import { Loader2 } from "lucide-react";

interface GiftCarouselAnimationProps {
  onComplete: () => void;
}

export const GiftCarouselAnimation = ({ onComplete }: GiftCarouselAnimationProps) => {
  const { data: products = [], isLoading } = useShopifyCollection("", 12);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in after mount
    setTimeout(() => setIsVisible(true), 100);

    // Complete after 5 seconds
    const timeout = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => clearTimeout(timeout);
  }, [onComplete]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D2B887]" />
      </div>
    );
  }

  // Split products into 3 columns (4 products each)
  const column1 = products.slice(0, 4);
  const column2 = products.slice(4, 8);
  const column3 = products.slice(8, 12);

  // Duplicate for seamless loop
  const extendedColumn1 = [...column1, ...column1];
  const extendedColumn2 = [...column2, ...column2];
  const extendedColumn3 = [...column3, ...column3];

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-center overflow-hidden">
      {/* Progress indicator */}
      <div className="text-center mb-8">
        <p className="text-[#1A1A1A]/60 font-medium">Step 2 of 3</p>
      </div>

      {/* Title */}
      <h1
        className={`
          font-display text-4xl md:text-5xl text-[#1A1A1A] text-center mb-12 px-4
          transition-all duration-1000 ease-out
          ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        Time to become the most
        <br />
        <span className="text-[#D2B887]">thoughtful person you know</span>
      </h1>

      {/* Three scrolling columns */}
      <div className="w-full max-w-6xl px-4">
        <div className="grid grid-cols-3 gap-6">
          {/* Column 1 - Scroll Up */}
          <div className="overflow-hidden h-[500px] relative">
            <div className="animate-[slide-up_20s_linear_infinite]">
              {extendedColumn1.map((product, index) => (
                <div
                  key={`col1-${index}`}
                  className="mb-6 bg-white rounded-xl border-2 border-[#E4DCD2] p-4 shadow-sm"
                >
                  <img
                    src={product.featuredImage || ""}
                    alt={product.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {product.title}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/60">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2 - Scroll Down */}
          <div className="overflow-hidden h-[500px] relative">
            <div className="animate-[slide-down_20s_linear_infinite]">
              {extendedColumn2.map((product, index) => (
                <div
                  key={`col2-${index}`}
                  className="mb-6 bg-white rounded-xl border-2 border-[#E4DCD2] p-4 shadow-sm"
                >
                  <img
                    src={product.featuredImage || ""}
                    alt={product.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {product.title}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/60">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3 - Scroll Up */}
          <div className="overflow-hidden h-[500px] relative">
            <div className="animate-[slide-up_20s_linear_infinite]">
              {extendedColumn3.map((product, index) => (
                <div
                  key={`col3-${index}`}
                  className="mb-6 bg-white rounded-xl border-2 border-[#E4DCD2] p-4 shadow-sm"
                >
                  <img
                    src={product.featuredImage || ""}
                    alt={product.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {product.title}
                  </p>
                  <p className="text-xs text-[#1A1A1A]/60">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gradient overlays for fade effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#FAF8F3] to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAF8F3] to-transparent" />
        </div>
      </div>
    </div>
  );
};
