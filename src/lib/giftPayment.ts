import { supabase } from '@/integrations/supabase/client';
import type { GiftRecord, RecipientRecord } from '@/lib/giftStatus';

export function hasCompleteShippingAddress(recipient: Pick<RecipientRecord, 'street' | 'city' | 'state' | 'zip_code'>) {
  return Boolean(recipient.street && recipient.city && recipient.state && recipient.zip_code);
}

/** The gift (if any) left behind when a user abandoned Stripe checkout for this recipient. */
export function findResumableGift(recipient: RecipientRecord): GiftRecord | null {
  const resumable = (recipient.scheduled_gifts || [])
    .filter((gift) => gift.payment_status === 'unpaid' && !gift.shopify_order_id && gift.status !== 'cancelled')
    .sort((a, b) => String(a.occasion_date || '').localeCompare(String(b.occasion_date || '')));
  return resumable[0] || null;
}

/** Re-opens Stripe checkout for an already-created, unpaid scheduled gift instead of creating a new one. */
export async function resumeGiftPayment(
  gift: GiftRecord & { occasion?: string | null; price_range?: string | null },
  recipient: Pick<RecipientRecord, 'name' | 'street' | 'city' | 'state' | 'zip_code' | 'country'>
): Promise<string> {
  if (!gift.id) throw new Error('Gift is missing an id');

  const priceMatch = gift.price_range?.match(/\$?(\d+\.?\d*)/);
  const productPrice = gift.estimated_cost ?? (priceMatch ? parseFloat(priceMatch[1]) : 0);

  const { data, error } = await supabase.functions.invoke('create-gift-payment', {
    body: {
      scheduledGiftId: gift.id,
      productPrice,
      productImage: gift.gift_image_url,
      giftDetails: {
        recipientName: recipient.name || 'your recipient',
        occasion: gift.occasion,
        giftType: gift.gift_type,
      },
      shippingAddress: {
        first_name: recipient.name?.split(' ')[0] || 'Gift',
        last_name: recipient.name?.split(' ').slice(1).join(' ') || 'Recipient',
        address1: recipient.street,
        city: recipient.city,
        province: recipient.state,
        country: recipient.country || 'United States',
        zip: recipient.zip_code,
      },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No payment URL returned');
  return data.url as string;
}
