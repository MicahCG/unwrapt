import type { ChatUiModule } from '@/components/dashboard/TheaChatCards';

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
