// What the buttons under Thea's chat should offer, from where the conversation is. Pure (no React), so the
// rules are tested on their own. Each suggestion sends ready-made words, so nobody has to type them.

export type Suggestion = { id: string; label: string; send: string };

export type SuggestionMessage = {
  role: 'user' | 'assistant';
  content: string;
  products?: unknown[] | null;
  review?: unknown | null;
  activeRecipient?: { id: string; name: string } | null;
};

export type SuggestionPerson = { id: string; name: string };

const SWITCH_PERSON = /\b(someone else|somebody else|another person|different person|other person|switch (?:to|people)|focus on|move on to|next person)\b/i;

export const wantsDifferentPerson = (text: string): boolean => SWITCH_PERSON.test(text);

// Saved names are sometimes calendar event titles ("Eric's Birthday"); strip that so we never say "Eric's's gift".
const firstName = (name: string): string => {
  const first = (name || '').trim().split(/\s+/)[0] || name || '';
  return first.replace(/['\u2019]s$/i, '');
};

const possessive = (name: string): string => (/s$/i.test(name) ? `${name}'` : `${name}'s`);

const personChip = (p: SuggestionPerson): Suggestion => ({
  id: `person:${p.id}`,
  label: `${possessive(firstName(p.name))} gift`,
  send: `Let's find a gift for ${firstName(p.name)}.`,
});

/**
 * - Fresh chat: nothing (the greeting chips handle that).
 * - Choosing someone (user asked to switch, or a gift was just scheduled): the other people to plan for.
 * - Working on a gift: options, price limits, "pick for me", someone else; a Review card carries its own buttons.
 */
export function chatSuggestions(input: {
  messages: SuggestionMessage[];
  /** The latest review was confirmed in the last few messages. */
  justScheduled: boolean;
  /** People who could use a gift, most urgent first. */
  people: SuggestionPerson[];
}): Suggestion[] {
  const { messages, justScheduled, people } = input;
  if (messages.length === 0) return [];
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastAssistant || !lastUser) return [];

  const active = lastAssistant.activeRecipient ?? null;
  const others = people.filter((p) => p.id !== active?.id).slice(0, 4);

  // Choosing someone: they said so, or the gift they were on is done.
  const switching = wantsDifferentPerson(lastUser.content) && !lastAssistant.review && !lastAssistant.products?.length;
  if (switching || justScheduled) {
    const chips = others.slice(0, 3).map(personChip);
    if (justScheduled) chips.push({ id: 'whats-next', label: "What's next?", send: 'What else needs my attention?' });
    return chips;
  }

  // The Review card has its own Confirm / Change / Pick another buttons.
  if (lastAssistant.review) return [];
  if (!active) return [];

  const who = firstName(active.name);
  const hasCards = Boolean(lastAssistant.products?.length);
  const chips: Suggestion[] = hasCards
    ? [
        { id: 'more', label: 'Show more', send: `Can I see more options for ${who}?` },
        { id: 'under25', label: 'Under $25', send: `Anything under $25 for ${who}?` },
        { id: 'different', label: 'Something different', send: `Show me something totally different for ${who}.` },
      ]
    : [
        { id: 'options', label: 'Show me options', send: `Can you show me some options for ${who}?` },
        { id: 'under25', label: 'Under $25', send: `Show me gifts under $25 for ${who}.` },
        { id: 'under50', label: 'Under $50', send: `Show me gifts under $50 for ${who}.` },
      ];
  chips.push({ id: 'pick', label: 'Pick one for me', send: `Pick the best gift for ${who} and let's schedule it.` });
  if (others.length) chips.push({ id: 'someone-else', label: 'Someone else', send: "Let's focus on someone else." });
  return chips;
}
