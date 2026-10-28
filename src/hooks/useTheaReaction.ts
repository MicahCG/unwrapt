import { useCallback, useEffect, useRef, useState } from 'react';
import type { TheaReaction } from '@/components/unwrapt2/TheaFigure';
import { classifyUserReply, pickPositiveReaction } from '@/lib/theaReactions';

const REACTION_MS = 1800;
const LAUGH_MS = 2400;

/**
 * Thea's response to what the user just said. Call `reactTo(text)` right after the user
 * answers; a helpful answer gets a random positive reaction, a rude one gets her upset
 * pose, an obvious joke ("lol", "😂") gets a laugh, and a non-answer gets nothing. The
 * reaction clears itself after ~2s. `play(reaction)` shows one directly.
 */
export function useTheaReaction() {
  const [reaction, setReaction] = useState<TheaReaction | null>(null);
  const last = useRef<TheaReaction | null>(null);
  const timer = useRef<number>();

  /** Play a specific reaction, e.g. a laugh when Thea's reply says the user was being funny. */
  const play = useCallback((next: TheaReaction) => {
    last.current = next;
    window.clearTimeout(timer.current);
    // Clear first so the same reaction twice in a row still restarts its animation.
    setReaction(null);
    window.requestAnimationFrame(() => setReaction(next));
    timer.current = window.setTimeout(() => setReaction(null), next === 'laugh' ? LAUGH_MS : REACTION_MS);
  }, []);

  const reactTo = useCallback((text: string) => {
    const tone = classifyUserReply(text);
    if (tone === 'neutral') return;
    play(tone === 'negative' ? 'upset' : tone === 'funny' ? 'laugh' : pickPositiveReaction(last.current));
  }, [play]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { reaction, reactTo, play };
}
