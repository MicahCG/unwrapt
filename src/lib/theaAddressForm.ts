/**
 * Missing-address claims and the in-chat address form.
 * Keep in sync with supabase/functions/thea-chat/index.ts.
 * This file stays free of app clients so the decision can be unit tested on its own.
 */

export const replyClaimsMissingAddress = (text: string): boolean => {
  const t = text.trim();
  if (!t) return false;
  if (/\baddress\b.{0,32}\b(?:is|was|'s)\b.{0,20}\b(?:still\s+)?(?:missing|needed|required|incomplete|unconfirmed)\b/i.test(t)) return true;
  if (/\b(?:still\s+)?missing\b.{0,20}\b(?:an?\s+)?(?:delivery\s+|shipping\s+)?address\b/i.test(t) && !/\bwho\b/i.test(t)) return true;
  if (/\bno (?:delivery |shipping )?address\b/i.test(t)) return true;
  if (/\baddress\b.{0,24}\b(?:isn'?t|is not)\b.{0,24}\b(?:on file|confirmed|complete)\b/i.test(t)) return true;
  if (/\buntil (?:i|we) confirm the address\b/i.test(t)) return true;
  if (/\bcan'?t\b.{0,80}\baddress\b/i.test(t) && /\b(?:place|order|send|ship|proceed)\b/i.test(t)) return true;
  if (/\bneeds? (?:a |their |her |his )?address\b/i.test(t) && !/\bwho\b/i.test(t)) return true;
  return false;
};

export const replyAsksToAddAddress = (text: string): boolean =>
  /\b(?:would you like|want) to (?:add|enter|update|provide)\b.{0,40}\baddress\b/i.test(text)
  || /\badd (?:her|his|their|the|an) address\b/i.test(text);

export const looksLikeAddressFormIntent = (message: string): boolean => {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  if (/\b(?:add|update|edit|change|enter|fix|provide|save|put)\b.{0,48}\baddress\b/.test(t)) return true;
  if (/\baddress\b.{0,40}\b(?:add|update|edit|change|enter|fix|form)\b/.test(t)) return true;
  return false;
};

const ADDRESS_AGREEMENT = /^(yes|yeah|yep|yup|sure|ok|okay|please|do it|go ahead|let'?s do it|sounds good)\.?!?$/i;

export const looksLikeAddressFormAgreement = (message: string): boolean => {
  const t = message.trim();
  if (!t || t.length > 80) return false;
  return ADDRESS_AGREEMENT.test(t);
};

const priorTurnAskedToAddAddress = (recent: Array<{ role: string; content: string }>): boolean =>
  recent.slice(-8).some((m) => m.role === 'assistant' && (replyClaimsMissingAddress(m.content) || replyAsksToAddAddress(m.content)));

export const addressIsOnFile = (facts: { hasAddress?: boolean; addressConfirmed?: boolean } | null | undefined): boolean =>
  Boolean(facts && (facts.hasAddress === true || facts.addressConfirmed === true));

const clearMissingAddressClaim = (reply: string, recipientName?: string): string => {
  const kept = reply
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !replyClaimsMissingAddress(sentence) && !replyAsksToAddAddress(sentence))
    .join(' ')
    .trim();
  const who = (recipientName || '').trim().split(/\s+/)[0] || 'Their';
  const note = `${who}'s address is already on file.`;
  if (!kept || replyClaimsMissingAddress(kept) || replyAsksToAddAddress(kept)) return note;
  return `${kept} ${note}`;
};

export type AddressPerson = { id: string; name: string; hasAddress: boolean; addressConfirmed: boolean };

type UiModule = { module: string; recipientId?: string; recipientName?: string; focus?: string };

const pickRecipientForAddress = (people: AddressPerson[], texts: string[]): AddressPerson | null => {
  if (!people.length) return null;
  const blob = texts.join('\n').toLowerCase();
  const named = people.filter((person) => {
    const name = person.name.toLowerCase();
    const first = name.split(/\s+/)[0] || '';
    return (name.length > 1 && blob.includes(name)) || (first.length > 2 && blob.includes(first));
  });
  if (named.length === 1) return named[0];
  if (named.length > 1) {
    const full = named.filter((person) => blob.includes(person.name.toLowerCase()));
    if (full.length === 1) return full[0];
    return null;
  }
  if (people.length === 1) return people[0];
  return null;
};

/**
 * Safety net when the model only asks in text. An address already on file
 * is not turned into a form, and the missing-address sentence is removed.
 * A real gap opens edit_recipient focused on address.
 */
export const ensureAddressFormForPeople = (
  userMessage: string,
  priorMessages: Array<{ role: string; content: string }>,
  reply: string,
  ui: UiModule[],
  people: AddressPerson[],
  statusOverview: boolean,
): { reply: string; ui: UiModule[] } => {
  if (statusOverview) return { reply, ui };
  const picked = pickRecipientForAddress(people, [userMessage, reply]);
  if (!picked) return { reply, ui };

  const already = ui.some((mod) => mod.module === 'edit_recipient' && mod.recipientId === picked.id && (mod.focus === 'address' || mod.focus == null));
  const explicit = looksLikeAddressFormIntent(userMessage);
  const agreed = looksLikeAddressFormAgreement(userMessage) && priorTurnAskedToAddAddress(priorMessages);
  const onFile = addressIsOnFile(picked);

  if (onFile) {
    const nextReply = (replyClaimsMissingAddress(reply) || replyAsksToAddAddress(reply))
      ? clearMissingAddressClaim(reply, picked.name)
      : reply;
    if (already || !(explicit || agreed)) return { reply: nextReply, ui };
    return {
      reply: nextReply,
      ui: [...ui, { module: 'edit_recipient', recipientId: picked.id, recipientName: picked.name, focus: 'address' }],
    };
  }

  const missing = !picked.hasAddress && !picked.addressConfirmed;
  const wantsForm = explicit || agreed || replyClaimsMissingAddress(reply) || replyAsksToAddAddress(reply);
  if (!missing || !wantsForm || already) return { reply, ui };
  return {
    reply,
    ui: [...ui, { module: 'edit_recipient', recipientId: picked.id, recipientName: picked.name, focus: 'address' }],
  };
};
