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

    const sync = () => setState(readViewport());
    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [enabled]);

  return state;
}
