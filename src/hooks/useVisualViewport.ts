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

    // iOS fires several resize events in a burst while the keyboard (and its predictive-text
    // bar) animate, including right when it first rises on focus, and the layout and visual
    // viewports can transiently disagree mid-burst. CSS's own 100dvh / interactive-widget=
    // resizes-content (index.html) already tracks the keyboard smoothly on its own during
    // that transition, so there's nothing to gain by applying an intermediate reading early -
    // including the very first one. Always wait for a burst to go quiet before committing a
    // reading, so the pinned shell only ever sees the settled, correct value.
    let settleTimer: number | undefined;
    const SETTLE_MS = 60;
    const sync = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => setState(readViewport()), SETTLE_MS);
    };
    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      window.clearTimeout(settleTimer);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [enabled]);

  return state;
}
