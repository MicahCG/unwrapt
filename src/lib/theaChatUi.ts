import type { ChatUiModule, RecipientStatusEntry } from '@/components/dashboard/TheaChatCards';
import {
  giftStage,
  hasRecipientAddress,
  isWalletGift,
  type GiftRecord,
  type RecipientRecord,
} from '@/lib/giftStatus';
import { calculateGiftCost } from '@/lib/wallet';
import { ensureAddressFormForPeople, type AddressPerson } from '@/lib/theaAddressForm';

/**
 * User is asking to connect/sync/import a calendar — not merely mentioning one.
 * "How many people are in my calendar?" must NOT match; that is answered from
 * saved recipients. Keep in sync with supabase/functions/thea-chat/index.ts.
 */
export const looksLikeCalendarConnectIntent = (message: string): boolean => {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  if (/\b(connect|reconnect|sync|link|import).{0,48}\b(calendar|google|birthdays?|anniversar(?:y|ies))\b/.test(t)) return true;
  if (/\b(birthdays?|anniversar(?:y|ies)).{0,48}\b(import|sync|connect|from|google)\b/.test(t)) return true;
  if (/\b(google\s+calendar)\b/.test(t) && /\b(connect|reconnect|sync|link|import|add)\b/.test(t)) return true;
  return false;
};

/** Short follow-ups after Thea refused calendar (e.g. "try again", "are you sure?"). */
export const looksLikeCalendarConnectFollowUp = (message: string): boolean => {
  const t = message.trim().toLowerCase();
  if (!t || t.length > 80) return false;
  return /^(try again|again|please|come on|really\??|h+m+|are you sure\??|no way\??|still\??|yes|yeah|yep)$/i.test(t)
    || /\b(are you sure|no way|try again|still can'?t|please (try|do|connect))\b/i.test(t);
};

export const replyRefusesCalendar = (reply: string): boolean =>
  /can'?t (connect( to)?|access|link|sync).{0,24}calendars?/i.test(reply)
  || /i('m| am) sure!?\s*i can'?t.{0,40}calendars?/i.test(reply)
  || /don'?t (have )?(access|a way).{0,24}calendars?/i.test(reply);

const CALENDAR_FALLBACK_REPLY =
  "Here’s the calendar connect module. Tap connect to link Google Calendar (or another birthday source), and you choose who to add.";

type ChatTurn = { role: string; content: string };

/**
 * Ensures a calendar_connect module appears when the user is clearly asking for
 * calendar connect (or following up after a refusal). Soft-replaces refusal copy
 * so a stale edge prompt / poisoned history can’t leave them stuck.
 */
export const ensureCalendarConnectUi = (
  userMessage: string,
  priorMessages: ChatTurn[],
  reply: string,
  ui: ChatUiModule[],
): { reply: string; ui: ChatUiModule[] } => {
  const recent = priorMessages.slice(-10);
  const threadMentionsCalendar = recent.some((m) => looksLikeCalendarConnectIntent(m.content) || replyRefusesCalendar(m.content));
  const wants =
    looksLikeCalendarConnectIntent(userMessage)
    || replyRefusesCalendar(reply)
    || (looksLikeCalendarConnectFollowUp(userMessage) && threadMentionsCalendar);

  if (!wants) return { reply, ui };

  const nextUi = ui.some((m) => m.module === 'calendar_connect')
    ? ui
    : [...ui, { module: 'calendar_connect' as const }];

  const nextReply = replyRefusesCalendar(reply) ? CALENDAR_FALLBACK_REPLY : reply;
  return { reply: nextReply, ui: nextUi };
};

/**
 * Status / who's-scheduled overviews — keep in sync with thea-chat.
 * Matches asks like "who has stuff scheduled and who doesn't".
 */
export const looksLikeRecipientStatusIntent = (message: string): boolean => {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  if (/\bwho(?:'s| is| are| has| have)\b.{0,48}\b(?:stuff )?scheduled\b/.test(t)) return true;
  if (/\bwho(?:'s| is| are)\b.{0,40}\b(?:not|without|missing)\b.{0,24}\b(?:gift|scheduled)\b/.test(t)) return true;
  if (/\b(?:scheduled|not scheduled).{0,24}\b(?:who|anyone|everybody|everyone)\b/.test(t)) return true;
  if (/\bwho\b.{0,36}\b(?:doesn'?t|does not|don'?t|missing|without)\b.{0,36}\b(?:gift|scheduled|address|preferences?|interests?)\b/.test(t)) return true;
  if (/\b(?:status|overview|readiness|checklist)\b.{0,28}\b(?:people|recipients|everyone|everybody|folks)\b/.test(t)) return true;
  if (/\b(?:people|recipients|everyone|everybody)\b.{0,28}\b(?:status|ready|missing|scheduled)\b/.test(t)) return true;
  if (/\bwho(?:'s| is)\b.{0,24}\bready\b/.test(t)) return true;
  return false;
};

const CLOSED_GIFT = new Set(['cancelled', 'canceled', 'expired', 'archived']);

/** Build recipient_status entries from live dashboard recipient rows. */
export const buildRecipientStatusEntries = (
  recipients: RecipientRecord[],
  limit = 12,
): RecipientStatusEntry[] =>
  recipients.slice(0, limit).map((r) => {
    const openGift = (r.scheduled_gifts || []).find((g) => !CLOSED_GIFT.has((g.status || '').toLowerCase()));
    return {
      recipientId: r.id,
      recipientName: r.name,
      giftScheduled: Boolean(openGift),
      giftTitle: openGift?.gift_type || openGift?.gift_description || null,
      hasAddress: hasRecipientAddress(r),
      hasPreferences: (r.interests || []).length > 0,
    };
  });

/**
 * If the user asked for a who's-scheduled / status overview and the edge
 * omitted recipient_status cards, attach them from live recipient data.
 */
export const ensureRecipientStatusUi = (
  userMessage: string,
  reply: string,
  ui: ChatUiModule[],
  recipients: RecipientRecord[],
): { reply: string; ui: ChatUiModule[] } => {
  if (!looksLikeRecipientStatusIntent(userMessage)) return { reply, ui };
  if (ui.some((m) => m.module === 'recipient_status')) return { reply, ui };
  if (!recipients.length) return { reply, ui };

  return {
    reply,
    ui: [...ui, { module: 'recipient_status', recipients: buildRecipientStatusEntries(recipients) }],
  };
};

/**
 * Payment / funding asks — keep in sync with supabase/functions/thea-chat.
 * Matches "did we pay for Ulan?", "finish payment", "add funds for …".
 */
export const looksLikePaymentIntent = (message: string): boolean => {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  if (/\b(?:did|have|has)\s+(?:we|i|you)\s+pay(?:\s+for)?\b/.test(t)) return true;
  if (/\b(?:is|was)\s+(?:.+?\s+)?(?:paid|unpaid|funded)\b/.test(t)) return true;
  if (/\b(?:finish|complete|complete(?:d)?)\s+(?:the\s+)?payment\b/.test(t)) return true;
  if (/\b(?:add|top[\s-]?up)\s+(?:funds|money|wallet)\b/.test(t)) return true;
  if (/\b(?:waiting|needs?|need)\s+(?:on\s+)?(?:payment|funds|wallet)\b/.test(t)) return true;
  if (/\bpayment\b.{0,24}\b(?:incomplete|pending|missing|not\s+done|not\s+finished)\b/.test(t)) return true;
  if (/\b(?:pay|fund)\s+(?:for\s+)?(?:the\s+)?gift\b/.test(t)) return true;
  return false;
};

/** Pick the unpaid wallet gift this payment ask most likely refers to. */
export const findUnpaidWalletGiftForMessage = (
  message: string,
  recipients: RecipientRecord[],
): { recipientName: string; gift: GiftRecord } | null => {
  const t = message.trim().toLowerCase();
  const unpaid: Array<{ recipientName: string; gift: GiftRecord; nameHit: boolean }> = [];
  for (const recipient of recipients) {
    const name = (recipient.name || '').toLowerCase();
    const first = name.split(/\s+/)[0] || '';
    const nameHit = Boolean(name && (t.includes(name) || (first.length > 2 && t.includes(first))));
    for (const gift of recipient.scheduled_gifts || []) {
      if (!gift.id) continue;
      if (CLOSED_GIFT.has((gift.status || '').toLowerCase())) continue;
      if (!isWalletGift(gift) || giftStage(gift) !== 'scheduled') continue;
      unpaid.push({ recipientName: recipient.name, gift, nameHit });
    }
  }
  if (!unpaid.length) return null;
  unpaid.sort((a, b) => Number(b.nameHit) - Number(a.nameHit));
  const best = unpaid[0];
  return { recipientName: best.recipientName, gift: best.gift };
};

/**
 * If the user asked about payment / funding and the edge omitted wallet_topup,
 * attach the card from live recipient gift rows.
 */
export const ensureWalletTopUpUi = (
  userMessage: string,
  reply: string,
  ui: ChatUiModule[],
  recipients: RecipientRecord[],
  available: number,
  reservedApplied = 0,
): { reply: string; ui: ChatUiModule[] } => {
  if (!looksLikePaymentIntent(userMessage)) return { reply, ui };
  if (ui.some((m) => m.module === 'wallet_topup')) return { reply, ui };
  const match = findUnpaidWalletGiftForMessage(userMessage, recipients);
  if (!match?.gift.id) return { reply, ui };

  const giftTitle = match.gift.gift_type || match.gift.gift_description || 'their gift';
  const fromGift = Number((match.gift as { wallet_reservation_amount?: number | null }).wallet_reservation_amount) || 0;
  const reserved = Math.max(reservedApplied, fromGift);
  return {
    reply,
    ui: [...ui, {
      module: 'wallet_topup' as const,
      scheduledGiftId: match.gift.id,
      recipientName: match.recipientName,
      giftTitle,
      needed: calculateGiftCost(Number(match.gift.payment_amount ?? match.gift.estimated_cost) || 0),
      available,
      reservedApplied: reserved > 0.009 ? reserved : undefined,
    }],
  };
};

const addressPerson = (recipient: RecipientRecord): AddressPerson => ({
  id: recipient.id,
  name: recipient.name,
  hasAddress: hasRecipientAddress(recipient),
  addressConfirmed: (recipient.scheduled_gifts || []).some((gift) =>
    Boolean((gift as { address_confirmed_at?: string | null }).address_confirmed_at)),
});

/**
 * Safety net for a stale edge function or a model that only asks in text.
 * Lives on live recipient rows; the decision itself is in theaAddressForm.
 */
export const ensureAddressFormUi = (
  userMessage: string,
  priorMessages: ChatTurn[],
  reply: string,
  ui: ChatUiModule[],
  recipients: RecipientRecord[],
): { reply: string; ui: ChatUiModule[] } => {
  const result = ensureAddressFormForPeople(
    userMessage,
    priorMessages,
    reply,
    ui,
    recipients.map(addressPerson),
    looksLikeRecipientStatusIntent(userMessage),
  );
  return { reply: result.reply, ui: result.ui as ChatUiModule[] };
};
