import React from 'react';
import { U } from './theme';
import { TheaFigure, type TheaPose } from './TheaFigure';

interface TheaAvatarProps {
  size?: number;
  pulse?: boolean;
  pose?: TheaPose;
  className?: string;
}

/** Thea's head and shoulders in a disc, used wherever she speaks in a list or chat. */
export const TheaAvatar: React.FC<TheaAvatarProps> = ({ size = 34, pulse = false, pose = 'basic', className }) => (
  <div
    aria-hidden="true"
    className={`${pulse ? 'animate-u-pulse-disc' : ''} ${className || ''}`}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: U.accentSoft,
      boxShadow: `inset 0 0 0 1px ${U.border}`,
      overflow: 'hidden',
      flexShrink: 0,
    }}
  >
    <TheaFigure framing="portrait" pose={pose} style={{ width: '100%', height: '100%' }} />
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
    aria-hidden="true"
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

export default TheaAvatar;
