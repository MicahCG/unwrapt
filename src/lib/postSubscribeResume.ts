import type { GiftCatalogItem } from '@/lib/giftCatalog';
import type { ChatProduct } from '@/components/dashboard/TheaChatCards';

/** Survives Stripe redirect so VIP success can resume Thea's gift reveal. */
export const LS_PENDING_GIFT_RESUME = 'unwrapt_pending_gift_resume';

export type PendingGiftResume = {
  recipientName: string;
  recipientId: string | null;
  occasionLabel: string | null;
  interests: string[];
  products: ChatProduct[];
  savedAt: number;
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function catalogToChatProducts(items: GiftCatalogItem[]): ChatProduct[] {
  return items
    .filter((item) => item?.id && item.name)
    .map((item) => ({
      id: item.id,
      title: item.name,
      price: typeof item.price === 'number' ? item.price : 0,
      currency: item.currency || 'USD',
      featured_image_url: item.imageUrl,
      description: item.description,
      product_type: item.brand,
    }));
}

export function buildGiftResumeMessage(resume: PendingGiftResume): string {
  const first = resume.recipientName.trim().split(/\s+/)[0] || resume.recipientName || 'them';
  const occasion = resume.occasionLabel?.trim();
  if (occasion) {
    return `Welcome to VIP — you're in. Here are the options I had lined up for ${first}'s ${occasion}. Pick one when you're ready, or tell me what to refine.`;
  }
  return `Welcome to VIP — you're in. Here are the options I had lined up for ${first}. Pick one when you're ready, or tell me what to refine.`;
}

export function savePendingGiftResume(input: {
  recipientName: string;
  recipientId?: string | null;
  occasionLabel?: string | null;
  interests?: string[];
  products: GiftCatalogItem[] | ChatProduct[];
}): void {
  try {
    const products: ChatProduct[] = input.products.map((p) => {
      if ('title' in p && typeof (p as ChatProduct).title === 'string') {
        return p as ChatProduct;
      }
      return catalogToChatProducts([p as GiftCatalogItem])[0];
    }).filter(Boolean);

    if (!products.length || !input.recipientName.trim()) return;

    const payload: PendingGiftResume = {
      recipientName: input.recipientName.trim(),
      recipientId: input.recipientId || null,
      occasionLabel: input.occasionLabel || null,
      interests: (input.interests || []).filter(Boolean).slice(0, 8),
      products,
      savedAt: Date.now(),
    };
    localStorage.setItem(LS_PENDING_GIFT_RESUME, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPendingGiftResume(): PendingGiftResume | null {
  try {
    const raw = localStorage.getItem(LS_PENDING_GIFT_RESUME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGiftResume;
    if (!parsed?.products?.length || !parsed.recipientName) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(LS_PENDING_GIFT_RESUME);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Read and clear — call once when seeding Thea after subscribe. */
export function consumePendingGiftResume(): PendingGiftResume | null {
  const pending = peekPendingGiftResume();
  if (!pending) return null;
  try {
    localStorage.removeItem(LS_PENDING_GIFT_RESUME);
  } catch {
    /* ignore */
  }
  return pending;
}
