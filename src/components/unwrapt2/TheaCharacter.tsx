import React from 'react';
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

function poseFor(gesture: TheaGesture, activity: TheaActivity): TheaPose {
  if (activity === 'calendar' || activity === 'clipboard') return 'thinking';
  return gesture === 'Greeting' ? 'welcome' : 'basic';
}

/** The same expressive character accompanies every onboarding step. */
export const TheaCharacter: React.FC<TheaCharacterProps> = ({
  size = 'medium', speaking = true, animated = true, className = '', pose, reaction, gesture = 'Greeting', activity = 'idle', bubble,
}) => {
  const resolvedPose = pose ?? poseFor(gesture, activity);
  // Her thinking pose already shows thought dots, so the ellipsis bubble would double up.
  const showBubble = speaking && (bubble || resolvedPose !== 'thinking');
  return (
    <div className={`u-thea-character u-thea-character--${size} ${speaking ? 'u-thea-character--speaking' : ''} ${className}`} role="img" aria-label="Thea, your gifting concierge">
      <div className="u-thea-character__glow" aria-hidden="true" />
      <TheaFigure pose={reaction ?? resolvedPose} animated={animated} className="u-thea-character__figure" />
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
