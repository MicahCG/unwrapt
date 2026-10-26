import { useCallback, useEffect, useRef, useState } from 'react';
import type { TheaReaction } from '@/components/unwrapt2/TheaFigure';
import { classifyUserReply, pickPositiveReaction } from '@/lib/theaReactions';

const REACTION_MS = 1800;

/**
 * Thea's response to what the user just said. Call `reactTo(text)` right after the user
 * answers; a helpful answer gets a random positive reaction, a rude one gets her upset
 * pose, and a non-answer gets nothing. The reaction clears itself after ~2s.
 */
export function useTheaReaction() {
  const [reaction, setReaction] = useState<TheaReaction | null>(null);
  const last = useRef<TheaReaction | null>(null);
  const timer = useRef<number>();

  const reactTo = useCallback((text: string) => {
    const tone = classifyUserReply(text);
    if (tone === 'neutral') return;
    const next = tone === 'negative' ? 'upset' : pickPositiveReaction(last.current);
    last.current = next;
    window.clearTimeout(timer.current);
    // Clear first so the same reaction twice in a row still restarts its animation.
    setReaction(null);
    window.requestAnimationFrame(() => setReaction(next));
    timer.current = window.setTimeout(() => setReaction(null), REACTION_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { reaction, reactTo };
}
