// "Place order now" for a gift that is ready (address on file, funds held). Calls the same backend step Thea's
// chat uses: process-gift-fulfillment with manualTrigger, which charges the held funds and sends the order to
// Goody. The pure part (turning its reply into words) is separate so it can be tested.
import { supabase } from '@/integrations/supabase/client';
import { notifyWalletChanged } from '@/lib/wallet';

export type PlaceOrderReply = {
  success?: boolean;
  error?: string;
  code?: string;
  shortfall?: number;
  confirmationCopy?: string;
  alreadyFulfilled?: boolean;
} | null | undefined;

export type PlaceOrderOutcome =
  | { ok: true; alreadyOrdered: boolean; message: string }
  | { ok: false; message: string };

const firstName = (name: string) => (name || '').trim().split(/\s+/)[0] || 'them';

/** Plain-language result of an order attempt. Never says the order went through unless the backend did. */
export const describeOrderResult = (
  reply: PlaceOrderReply,
  transportError: { message?: string } | null | undefined,
  recipientName: string,
): PlaceOrderOutcome => {
  const who = firstName(recipientName);
  if (!transportError && reply?.success !== false && reply) {
    return reply.alreadyFulfilled
      ? { ok: true, alreadyOrdered: true, message: `${who}'s gift was already ordered.` }
      : { ok: true, alreadyOrdered: false, message: `Ordered. ${who}'s gift is on its way to Goody's fulfillment.` };
  }
  if (typeof reply?.confirmationCopy === 'string' && reply.confirmationCopy) {
    return { ok: false, message: reply.confirmationCopy };
  }
  const raw = String(reply?.error || transportError?.message || 'The order could not be placed.');
  if (/no longer available|product requires a variant/i.test(raw)) {
    return { ok: false, message: `That gift isn't available to order right now. Nothing was charged. Pick a different gift for ${who}.` };
  }
  if (/address/i.test(raw) && !/country/i.test(raw)) {
    return { ok: false, message: `${who} needs a complete delivery address before this can be ordered.` };
  }
  return { ok: false, message: `The order could not be placed (${raw.replace(/^Order creation failed:\s*/i, '')}). Nothing was charged. You can try again.` };
};

export const placeGiftOrderNow = async (scheduledGiftId: string, recipientName: string): Promise<PlaceOrderOutcome> => {
  const { data, error } = await supabase.functions.invoke('process-gift-fulfillment', {
    body: { scheduledGiftId, manualTrigger: true },
  });
  // supabase-js puts non-2xx bodies in error.context; the readable reply is in that body.
  let reply = data as PlaceOrderReply;
  const context = (error as { context?: Response } | null)?.context;
  if (!reply && context && typeof context.json === 'function') {
    reply = await context.json().catch(() => null);
  }
  const outcome = describeOrderResult(reply, error, recipientName);
  if (outcome.ok) notifyWalletChanged();
  return outcome;
};
