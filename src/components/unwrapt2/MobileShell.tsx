import React from 'react';
import { U } from './theme';

interface MobileShellProps {
  children: React.ReactNode;
  /** Sticky bottom action area (buttons). Gets a soft gradient fade above it. */
  footer?: React.ReactNode;
  /** Apply the welcome-style warm radial wash behind the content. */
  glow?: boolean;
  /** Vertical padding preset for the scroll area. */
  contentClassName?: string;
  /** Animate the whole screen in. */
  animate?: boolean;
}

/**
 * The phone-width column every agent-first screen lives in. On desktop it
 * centers a ~440px mobile canvas against the warm background; on phones it
 * fills the viewport. Content scrolls; the footer stays pinned with a fade.
 */
export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  footer,
  glow,
  contentClassName,
  animate = true,
}) => (
  <div
    style={{ background: U.bg }}
    className="min-h-screen w-full flex justify-center"
  >
    <div
      className={`relative flex h-[100dvh] min-h-screen w-full max-w-[440px] flex-col overflow-hidden ${
        animate ? 'animate-u-fadeUp' : ''
      }`}
      style={{
        color: U.ink,
        background: glow ? `${U.bgGradient}, ${U.bg}` : U.bg,
      }}
    >
      <div className={`flex-1 overflow-y-auto ${contentClassName ?? 'px-6 pt-14 pb-4'}`}>
        {children}
      </div>
      {footer && (
        <div
          className="px-6 pb-9 pt-3"
          style={{
            background: `linear-gradient(0deg, ${U.bg} 72%, rgba(237,230,216,0))`,
          }}
        >
          {footer}
        </div>
      )}
    </div>
  </div>
);

/** Monospaced uppercase eyebrow / step label. */
export const Eyebrow: React.FC<{
  children: React.ReactNode;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, className, color = U.muted, style }) => (
  <div
    className={`font-mono uppercase ${className || ''}`}
    style={{ fontSize: 10, letterSpacing: '0.18em', color, ...style }}
  >
    {children}
  </div>
);

/** Primary dark pill button. */
export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className, style, ...rest }) => (
  <button
    {...rest}
    className={`u-btn-primary ${className || ''}`}
    style={style}
  >
    {children}
  </button>
);

/** Serif display heading. */
export const Display: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className,
  style,
}) => (
  <h2
    className={`font-display ${className || ''}`}
    style={{ fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.02em', margin: 0, ...style }}
  >
    {children}
  </h2>
);

export default MobileShell;
