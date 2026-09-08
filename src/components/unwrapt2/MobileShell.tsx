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
 * centers a ~440-600px mobile canvas against the warm background, with soft
 * ambient decoration filling the margins and a full-width nav bar so it
 * reads as anchored to the screen rather than floating; on phones it fills
 * the viewport. Content scrolls; the footer stays pinned with a fade.
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
    className="relative flex min-h-screen w-full justify-center overflow-hidden"
  >
    {/* Ambient desktop-only decoration: sits behind the card, only visible
        in the margins once the viewport is wider than the canvas. */}
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
      <div
        className="absolute -left-40 top-[-10%] h-[560px] w-[560px] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: U.accent }}
      />
      <div
        className="absolute -right-48 bottom-[-15%] h-[620px] w-[620px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: U.sage }}
      />
    </div>

    <div
      className={`relative z-10 flex h-[100dvh] min-h-screen w-full max-w-[440px] flex-col overflow-hidden lg:max-w-[600px] ${
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
        <div className="relative px-6 pb-9 pt-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-screen -translate-x-1/2 lg:block"
            style={{ background: `linear-gradient(0deg, ${U.bg} 72%, rgba(237,230,216,0))` }}
          />
          <div
            className="absolute inset-y-0 left-0 right-0 lg:hidden"
            style={{ background: `linear-gradient(0deg, ${U.bg} 72%, rgba(237,230,216,0))` }}
          />
          <div className="relative">{footer}</div>
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
