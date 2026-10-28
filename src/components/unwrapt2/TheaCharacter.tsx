import React, { useEffect, useState } from 'react';
import { TheaFigure, type TheaPose, type TheaReaction } from './TheaFigure';

export type TheaGesture = 'Greeting' | 'Present' | 'Listen';
export type TheaActivity = 'idle' | 'calendar' | 'clipboard' | 'chat';

interface TheaCharacterProps {
  size?: 'compact' | 'medium' | 'large';
  speaking?: boolean;
  animated?: boolean;
  className?: string;
  /** What Thea is doing. When omitted it is inferred from `gesture` and `activity`. */
  pose?: TheaPose;
  /** A short reaction to the user's last answer; overrides the pose while it plays. */
  reaction?: TheaReaction | null;
  gesture?: TheaGesture;
  activity?: TheaActivity;
  /** Replaces the ellipsis bubble with a short spoken line. */
  bubble?: string;
}

// Poses with a raised arm lower it before the next pose appears, instead of snapping.
const LOWERS_ARM = new Set(['welcome', 'thumbsup', 'toss', 'magnify']);
const LOWER_MS = 380;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The pose actually on screen, holding a raised-arm pose briefly while its arm comes down. */
function useSmoothPose<T extends string>(target: T, animated: boolean) {
  const [shown, setShown] = useState(target);
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    if (target === shown) {
      setExiting(false);
      return;
    }
    if (!animated || !LOWERS_ARM.has(shown) || prefersReducedMotion()) {
      setShown(target);
      return;
    }
    setExiting(true);
    const timer = window.setTimeout(() => {
      setExiting(false);
      setShown(target);
    }, LOWER_MS);
    return () => window.clearTimeout(timer);
  }, [target, shown, animated]);
  return { shown, exiting };
}

function poseFor(gesture: TheaGesture, activity: TheaActivity): TheaPose {
  if (activity === 'calendar' || activity === 'clipboard') return 'thinking';
  return gesture === 'Greeting' ? 'welcome' : 'basic';
}

/** The same expressive character accompanies every onboarding step. */
export const TheaCharacter: React.FC<TheaCharacterProps> = ({
  size = 'medium', speaking = true, animated = true, className = '', pose, reaction, gesture = 'Greeting', activity = 'idle', bubble,
}) => {
  const resolvedPose = pose ?? poseFor(gesture, activity);
  const { shown, exiting } = useSmoothPose(reaction ?? resolvedPose, animated);
  // Her thinking pose already shows thought dots, so the ellipsis bubble would double up.
  const showBubble = speaking && (bubble || resolvedPose !== 'thinking');
  return (
    <div className={`u-thea-character u-thea-character--${size} ${speaking ? 'u-thea-character--speaking' : ''} ${className}`} role="img" aria-label="Thea, your gifting concierge">
      <div className="u-thea-character__glow" aria-hidden="true" />
      <TheaFigure pose={shown} exiting={exiting} animated={animated} className="u-thea-character__figure" />
      {showBubble && (
        bubble ? (
          <div className="u-thea-character__voice u-thea-character__voice--text" role="status">
            {bubble}
          </div>
        ) : (
          <div className="u-thea-character__voice" aria-hidden="true"><span /><span /><span /></div>
        )
      )}
    </div>
  );
};
export default TheaCharacter;
