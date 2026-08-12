export type GiftRecord = {
  id?: string;
  status?: string | null;
  payment_status?: string | null;
  wallet_reserved?: boolean | null;
  fulfilled_at?: string | null;
  shopify_order_id?: string | null;
  occasion_date?: string | null;
  gift_variant_id?: string | null;
  gift_description?: string | null;
  gift_type?: string | null;
  gift_image_url?: string | null;
  estimated_cost?: number | null;
  delivery_date?: string | null;
  tracking_number?: string | null;
};

export type RecipientRecord = {
  id: string;
  name: string;
  relationship?: string | null;
  email?: string | null;
  phone?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  interests?: string[] | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  scheduled_gifts?: GiftRecord[] | null;
};

export type GiftStatusKey =
  | 'needs_details'
  | 'scheduled'
  | 'about_to_order'
  | 'ready_to_order'
  | 'ordered'
  | 'shipped'
  | 'delivered'
  | 'attention';

export type GiftStatus = {
  key: GiftStatusKey;
  label: string;
  detail: string;
  dot: string;
  className: string;
};

export type ReadinessItem = {
  key: 'occasion' | 'gift' | 'delivery' | 'payment';
  label: string;
  complete: boolean;
  help: string;
};

const statuses: Record<GiftStatusKey, GiftStatus> = {
  needs_details: {
    key: 'needs_details', label: 'Needs details', detail: 'Add the missing information so Margot can prepare this gift.',
    dot: '#B65B3C', className: 'bg-[#F7E4DA] text-[#87432E]',
  },
  scheduled: {
    key: 'scheduled', label: 'Scheduled', detail: 'The occasion is saved. Margot will keep this gift on the radar.',
    dot: '#907A52', className: 'bg-[#EEE6D6] text-[#66583F]',
  },
  about_to_order: {
    key: 'about_to_order', label: 'Almost ready', detail: 'One or two details still need your attention before ordering.',
    dot: '#B77832', className: 'bg-[#F7E8CC] text-[#87561F]',
  },
  ready_to_order: {
    key: 'ready_to_order', label: 'Ready to order', detail: 'Everything required is present. The order can be reviewed and placed.',
    dot: '#6E7B5B', className: 'bg-[#E3E8DA] text-[#4F5C3F]',
  },
  ordered: {
    key: 'ordered', label: 'Ordered', detail: 'The order is with the fulfillment partner.',
    dot: '#61738B', className: 'bg-[#E1E8EF] text-[#46576C]',
  },
  shipped: {
    key: 'shipped', label: 'Shipped', detail: 'The gift is on its way to the recipient.',
    dot: '#61738B', className: 'bg-[#E1E8EF] text-[#46576C]',
  },
  delivered: {
    key: 'delivered', label: 'Delivered', detail: 'The gift has arrived.',
    dot: '#6E7B5B', className: 'bg-[#E3E8DA] text-[#4F5C3F]',
  },
  attention: {
    key: 'attention', label: 'Needs attention', detail: 'Margot found an issue that needs a quick review.',
    dot: '#A24B3B', className: 'bg-[#F5DDDA] text-[#823B30]',
  },
};

export const hasRecipientAddress = (recipient: RecipientRecord) =>
  Boolean(recipient.street && recipient.city && recipient.state && recipient.zip_code);

export const getGiftReadiness = (gift: GiftRecord, recipient: RecipientRecord): ReadinessItem[] => [
  {
    key: 'occasion', label: 'Occasion date', complete: Boolean(gift.occasion_date || recipient.birthday || recipient.anniversary),
    help: 'Add the date Margot should plan around.',
  },
  {
    key: 'gift', label: 'Gift selection', complete: Boolean(gift.gift_variant_id || gift.gift_description || gift.gift_type),
    help: 'Choose a catalog item or let Margot curate one.',
  },
  {
    key: 'delivery', label: 'Delivery details', complete: hasRecipientAddress(recipient),
    help: 'Add an address, or use recipient choice when Goody is activated.',
  },
  {
    key: 'payment', label: 'Payment approval', complete: gift.payment_status === 'paid' || Boolean(gift.wallet_reserved),
    help: 'Approve payment before the order is submitted.',
  },
];

export const getGiftStatus = (gift: GiftRecord, recipient: RecipientRecord): GiftStatus => {
  const raw = (gift.status || '').toLowerCase();
  if (raw.includes('cancel') || raw.includes('fail') || raw.includes('exception')) return statuses.attention;
  if (raw === 'delivered') return statuses.delivered;
  if (raw === 'shipped' || Boolean(gift.tracking_number)) return statuses.shipped;
  if (raw === 'ordered' || Boolean(gift.shopify_order_id) || Boolean(gift.fulfilled_at)) return statuses.ordered;

  const readiness = getGiftReadiness(gift, recipient);
  const completeCount = readiness.filter((item) => item.complete).length;
  if (completeCount === readiness.length) return statuses.ready_to_order;
  if (completeCount >= 2) return statuses.about_to_order;
  if (gift.occasion_date || recipient.birthday || recipient.anniversary) return statuses.scheduled;
  return statuses.needs_details;
};

export const getRecipientStatus = (recipient: RecipientRecord): GiftStatus => {
  const gifts = recipient.scheduled_gifts || [];
  if (gifts.length === 0) {
    return recipient.interests?.length ? statuses.needs_details : statuses.needs_details;
  }

  const priority: GiftStatusKey[] = [
    'attention', 'about_to_order', 'ready_to_order', 'ordered', 'shipped', 'scheduled', 'needs_details', 'delivered',
  ];
  const giftStatuses = gifts.map((gift) => getGiftStatus(gift, recipient));
  return priority.map((key) => giftStatuses.find((status) => status.key === key)).find(Boolean) || statuses.scheduled;
};
