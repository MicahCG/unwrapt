import type { TheaPose } from '@/components/unwrapt2/TheaFigure';

export type TheaChatState = {
  /** A request is in flight. */
  sending: boolean;
  /** The last request, or loading history, failed. */
  failed?: boolean;
  /** A write the user asked for was confirmed saved (e.g. a gift scheduled). */
  succeeded?: boolean;
  /** The user has typed something they haven't sent yet. */
  typing?: boolean;
  /** Thea's latest reply, to tell a clarifying question from a statement. */
  lastReply?: string | null;
};

const asksQuestion = (reply: string) => /\?\s*$/.test(reply.trim());

/**
 * Thea's pose for a chat, from true operation state only: she never celebrates an unsaved
 * update and only looks troubled when something really failed. Reactions to the user's
 * answers play on top of this (see useTheaReaction).
 */
export function theaChatPose({ sending, failed, succeeded, typing, lastReply }: TheaChatState): TheaPose {
  if (sending) return 'thinking';
  if (failed) return 'oops';
  if (succeeded) return 'gift';
  if (typing) return 'listening';
  if (lastReply && asksQuestion(lastReply)) return 'curious';
  return 'basic';
}
