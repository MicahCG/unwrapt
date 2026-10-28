import type { TheaReaction } from '@/components/unwrapt2/TheaFigure';

export type ReplyTone = 'positive' | 'negative' | 'neutral';

// Rude or mean messages aimed at Thea (or just hostile). Kept to words that are almost never
// part of a genuine answer about someone, so "she hates cooking" stays a normal answer.
const RUDE = /\b(stupid|idiot|idiotic|dumb|moron|useless|worthless|pathetic|annoying|shut up|stfu|you suck|this sucks|sucks|hate you|screw you|trash|garbage|loser|bitch|fuck\w*|f+\*+k|shit\w*|wtf|go away)\b/i;
// Non-answers: no reaction, Thea just carries on.
const NON_ANSWER = /^(idk|i don'?t know|dunno|not sure|no|nope|nah|skip|pass|n\/a|none|nothing|whatever|ok|okay|k|hmm+|\?+)[\s.!?]*$/i;

/** How the user's latest message should land with Thea. Any real answer counts as progress. */
export function classifyUserReply(text: string): ReplyTone {
  const trimmed = text.trim();
  if (!trimmed) return 'neutral';
  if (RUDE.test(trimmed)) return 'negative';
  if (NON_ANSWER.test(trimmed)) return 'neutral';
  return 'positive';
}

const POSITIVE: TheaReaction[] = ['thumbsup', 'sparkle', 'clap', 'cheer'];

/** A random positive reaction, never the same one twice in a row. */
export function pickPositiveReaction(previous?: TheaReaction | null): TheaReaction {
  const options = POSITIVE.filter((r) => r !== previous);
  return options[Math.floor(Math.random() * options.length)];
}
