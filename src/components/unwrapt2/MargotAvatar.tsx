import React from 'react';
import { U } from './theme';

interface MargotAvatarProps {
  size?: number;
  /** Adds the soft pulsing "thinking" halo. */
  pulse?: boolean;
  className?: string;
}

/**
 * Margot — the gifting concierge. A terracotta disc with an italic serif "M",
 * lifted straight from the agent-first prototype.
 */
export const MargotAvatar: React.FC<MargotAvatarProps> = ({ size = 34, pulse = false, className }) => (
  <div
    className={`${pulse ? 'animate-u-pulse-disc' : ''} ${className || ''}`}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: U.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontStyle: 'italic',
        fontSize: Math.round(size * 0.53),
        color: U.cream,
        lineHeight: 1,
      }}
    >
      M
    </span>
  </div>
);

interface PersonAvatarProps {
  initials: string;
  tone: string;
  size?: number;
  dim?: boolean;
}

export const PersonAvatar: React.FC<PersonAvatarProps> = ({ initials, tone, size = 44, dim }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: tone,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: U.cream,
      fontFamily: "'Newsreader', Georgia, serif",
      fontStyle: 'italic',
      fontSize: Math.round(size * 0.39),
      letterSpacing: '0.5px',
      opacity: dim ? 0.5 : 1,
    }}
  >
    {initials}
  </div>
);

export default MargotAvatar;
