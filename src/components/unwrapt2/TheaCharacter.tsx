import React from 'react';
import theaCharacter from '@/assets/thea-concierge.png';

interface TheaCharacterProps {
  size?: 'compact' | 'medium' | 'large';
  speaking?: boolean;
  className?: string;
}

/** Thea's full-character presence for the agent-led onboarding story. */
export const TheaCharacter: React.FC<TheaCharacterProps> = ({
  size = 'medium',
  speaking = true,
  className = '',
}) => (
  <div className={`u-thea-character u-thea-character--${size} ${speaking ? 'u-thea-character--speaking' : ''} ${className}`}>
    <div className="u-thea-character__glow" aria-hidden="true" />
    <img
      src={theaCharacter}
      alt="Thea, your gifting concierge"
      className="u-thea-character__image"
      draggable={false}
    />
    {speaking && (
      <div className="u-thea-character__voice" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    )}
  </div>
);

export default TheaCharacter;
