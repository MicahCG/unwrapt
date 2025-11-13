import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";

const BG = "#F7F0E6";
const INNER = "#F1E3D0";
const GOLD = "#D4AF7A";
const BROWN = "#5B4633";

export default function GiftUnwrapIntro() {
  const [show, setShow] = useState(true);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);

  const screens = [
    "Life is busy",
    "Between work, family, and everything in between, it's easy to forget the moments that matter most."
  ];

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    if (prefersReducedMotion) {
      // Show for shorter time if reduced motion
      const timer = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timer);
    }

    // Typewriter effect
    if (currentScreen >= screens.length) {
      const timer = setTimeout(() => setShow(false), 1000);
      return () => clearTimeout(timer);
    }

    const currentText = screens[currentScreen];
    let currentIndex = 0;
    setDisplayedText('');
    setTypingComplete(false);

    const typewriterInterval = setInterval(() => {
      if (currentIndex < currentText.length) {
        setDisplayedText(currentText.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typewriterInterval);
        
        // Move to next screen or mark as complete
        if (currentScreen === screens.length - 1) {
          setTypingComplete(true);
        } else {
          setTimeout(() => {
            setCurrentScreen(prev => prev + 1);
          }, 800);
        }
      }
    }, 40);

    return () => clearInterval(typewriterInterval);
  }, [currentScreen]);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;

  if (prefersReducedMotion) {
    // Simple fade for reduced motion users
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ backgroundColor: BG }}
          >
            <div className="text-center space-y-4 px-6 max-w-2xl">
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-8 h-8" style={{ color: BROWN }} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: BROWN }}>
                Life is busy
              </h1>
              <p className="text-base md:text-lg" style={{ color: BROWN }}>
                Between work, family, and everything in between, it&apos;s easy to forget the moments that matter most.
              </p>
            </div>
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ 
            backgroundColor: BG,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="max-w-2xl px-8 mx-auto">
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/60">
              {/* Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-8"
              >
                <Clock className="w-10 h-10" style={{ color: BROWN }} />
              </motion.div>

              {/* Typewriter text */}
              <div className="text-center space-y-6">
                {currentScreen === 0 ? (
                  <h1 className="text-4xl md:text-5xl font-bold" style={{ color: BROWN }}>
                    {displayedText}
                    {displayedText.length < screens[0].length && (
                      <span className="animate-pulse">|</span>
                    )}
                  </h1>
                ) : (
                  <>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: BROWN }}>
                      Life is busy
                    </h1>
                    <p className="text-lg md:text-xl leading-relaxed text-gray-600">
                      {displayedText}
                      {displayedText.length < screens[1].length && (
                        <span className="animate-pulse">|</span>
                      )}
                    </p>
                  </>
                )}

                {/* Progress dots */}
                <div className="flex justify-center gap-2 pt-4">
                  <div className={`w-2 h-2 rounded-full transition-colors ${currentScreen >= 0 ? 'bg-[#D4AF7A]' : 'bg-gray-300'}`} />
                  <div className={`w-2 h-2 rounded-full transition-colors ${currentScreen >= 1 ? 'bg-[#D4AF7A]' : 'bg-gray-300'}`} />
                  <div className={`w-2 h-2 rounded-full transition-colors ${typingComplete ? 'bg-[#D4AF7A]' : 'bg-gray-300'}`} />
                </div>

                {/* Continue button */}
                {typingComplete && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    onClick={() => setShow(false)}
                    className="mt-6 px-8 py-3 bg-[#5B4633] text-white rounded-full font-medium hover:bg-[#4a3828] transition-colors duration-200"
                  >
                    Continue
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
