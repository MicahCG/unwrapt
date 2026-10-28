import type { TheaReaction } from '@/components/unwrapt2/TheaFigure';

export type ReplyTone = 'positive' | 'negative' | 'neutral' | 'funny';

// Rude or mean messages aimed at Thea (or just hostile). Kept to words that are almost never
// part of a genuine answer about someone, so "she hates cooking" stays a normal answer.
const RUDE = /\b(stupid|idiot|idiotic|dumb|moron|useless|worthless|pathetic|shut up|stfu|you suck|this sucks|hate you|screw you|trash|garbage|loser|bitch|fuck\w*|f+\*+k|shit\w*|wtf|go away)\b/i;
// Words that are only an insult when aimed at Thea ("ur ugly"), not when describing someone
// ("she hates ugly sweaters"). Thea's reply also flags insults this misses.
const AT_THEA = /\b(you|u|ur|you'?re|youre|thea|this app)\b[^.!?]{0,20}\b(ugly|dumb|stupid|lame|boring|annoying|useless|bad|terrible|awful|the worst|gross|weird|creepy|slow|suck|sucks|basic|mid)\b/i;
// Non-answers: no reaction, Thea just carries on.
const NON_ANSWER = /^(idk|i don'?t know|dunno|not sure|no|nope|nah|skip|pass|n\/a|none|nothing|whatever|ok|okay|k|hmm+|\?+)[\s.!?]*$/i;

// Messages that announce their own joke. Subtler humor is spotted by Thea's reply instead.
const LAUGHING = /\b(lol+|lmf?ao+|haha[ha]*|hehe[he]*|rofl)\b|😂|🤣|😆|😹/i;

/** How the user's latest message should land with Thea. Any real answer counts as progress. */
export function classifyUserReply(text: string): ReplyTone {
  const trimmed = text.trim();
  if (!trimmed) return 'neutral';
  if (RUDE.test(trimmed) || AT_THEA.test(trimmed)) return 'negative';
  if (NON_ANSWER.test(trimmed)) return 'neutral';
  if (LAUGHING.test(trimmed)) return 'funny';
  return 'positive';
}

const POSITIVE: TheaReaction[] = ['thumbsup', 'sparkle', 'clap', 'toss', 'magnify'];

/** A random positive reaction, never the same one twice in a row. */
export function pickPositiveReaction(previous?: TheaReaction | null): TheaReaction {
  const options = POSITIVE.filter((r) => r !== previous);
  return options[Math.floor(Math.random() * options.length)];
}
