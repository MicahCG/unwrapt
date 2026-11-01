import { useEffect, useState } from 'react';

export type VisualViewportState = {
  /** Layout-aligned height of the visible viewport (shrinks with the software keyboard). */
  height: number;
  /** iOS Safari may offset the visual viewport when focusing an input; pin UI with this. */
  offsetTop: number;
  /** Approximate bottom inset covered by the keyboard (layout height − visible height − offset). */
  keyboardInset: number;
  keyboardOpen: boolean;
};

const readViewport = (): VisualViewportState => {
  if (typeof window === 'undefined') {
    return { height: 0, offsetTop: 0, keyboardInset: 0, keyboardOpen: false };
  }
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);
  return {
    height,
    offsetTop,
    keyboardInset,
    // Ignore tiny browser chrome changes; a real keyboard is usually > 120px.
    keyboardOpen: keyboardInset > 120,
  };
};

/**
 * Tracks the visual viewport so chat UIs can sit above the software keyboard
 * without the awkward iOS zoom/scroll shift.
 */
export function useVisualViewport(enabled = true): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() =>
    enabled ? readViewport() : { height: 0, offsetTop: 0, keyboardInset: 0, keyboardOpen: false },
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // iOS fires several resize events in a burst while the keyboard and its predictive-text
    // bar animate together, and the layout and visual viewports can transiently disagree
    // mid-burst - committing every intermediate frame to state briefly applied a bogus,
    // squished height to the pinned shell. Settle on the first and last reading of a burst
    // (leading so the keyboard still raises instantly, trailing so we land on the real value).
    let settleTimer: number | undefined;
    const SETTLE_MS = 60;
    const sync = (immediate = false) => {
      window.clearTimeout(settleTimer);
      if (immediate) {
        setState(readViewport());
        return;
      }
      settleTimer = window.setTimeout(() => setState(readViewport()), SETTLE_MS);
    };
    sync(true);

    const vv = window.visualViewport;
    const onResize = () => sync();
    vv?.addEventListener('resize', onResize);
    vv?.addEventListener('scroll', onResize);
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(settleTimer);
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled]);

  return state;
}
